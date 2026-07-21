import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient, { QueryParams } from "../productboard_client.js";
import { removeNestedFieldsIfPresent, removeFields, removeEmptyFields, sanitizeHTMLContent } from "../utils/post_processor.js";

const getNotesTool: Tool = {
    "name": "get_notes",
    "description": "Returns a list of notes. Uses GET /notes for simple filtering, or POST /notes/search (full-text and relationship filtering) whenever 'term', 'featureId', or 'companyId' is provided. Pagination is cursor-only via 'pageCursor' (there is no page-size/limit control in API v2, so 'pageLimit' has been removed). Tag filtering ('anyTag'/'allTags' in the old API) has been permanently removed in API v2 with no replacement and is no longer accepted here.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "last": {
                "type": "string",
                "description": "Return only notes created since a given span of months (m), days (d), or hours (h), e.g. 6m | 10d | 24h | 1h. There is no 'last' parameter in API v2, so this is resolved client-side into an absolute 'createdFrom' timestamp (Date.now() minus the parsed duration) before calling the API. Cannot be combined with 'createdFrom' or 'createdTo'."
            },
            "createdFrom": {
                "type": "string",
                "format": "date-time",
                "description": "Return only notes created on or after this ISO-8601 date-time (inclusive), e.g. 2024-01-01T00:00:00Z. Cannot be combined with 'last'."
            },
            "createdTo": {
                "type": "string",
                "format": "date-time",
                "description": "Return only notes created on or before this ISO-8601 date-time (inclusive). Cannot be combined with 'last'."
            },
            "updatedFrom": {
                "type": "string",
                "format": "date-time",
                "description": "Return only notes updated on or after this ISO-8601 date-time (inclusive)."
            },
            "updatedTo": {
                "type": "string",
                "format": "date-time",
                "description": "Return only notes updated on or before this ISO-8601 date-time (inclusive)."
            },
            "term": {
                "type": "string",
                "description": "Full-text search query. Setting this (alone or together with featureId/companyId) routes the request through POST /notes/search instead of GET /notes."
            },
            "featureId": {
                "type": "string",
                "description": "Return only notes linked to this feature (UUID). Implemented via the POST /notes/search 'filter.relationships.link[].id' filter, so setting this also routes the request through the search endpoint even without 'term'."
            },
            "companyId": {
                "type": "string",
                "description": "Return only notes related to this company (UUID). Implemented via the POST /notes/search 'filter.relationships.customer[].id' filter (the 'customer' relationship covers both companies and users), so setting this also routes the request through the search endpoint even without 'term'."
            },
            "ownerEmail": {
                "type": "string",
                "description": "Return only notes owned by a specific owner email. Maps to 'owner[email]' on GET /notes, or 'filter.fields.owner.email' on POST /notes/search. Requires the members:pii:read OAuth scope on the API token, otherwise owner emails are redacted."
            },
            "source": {
                "type": "string",
                "description": "Return only notes from a specific external source system (e.g. 'intercom', 'zendesk'). Maps to 'metadata[source][system]' on GET /notes, or 'filter.metadata.source.system' on POST /notes/search."
            },
            "pageCursor": {
                "type": "string",
                "description": "Cursor for the next page of results, taken from the previous response's links.next. API v2 pagination is cursor-only; there is no page-size/limit parameter."
            }
        }
    }
}

interface GetNotesRequest {
    last?: string;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
    term?: string;
    featureId?: string;
    companyId?: string;
    ownerEmail?: string;
    source?: string;
    pageCursor?: string;
}

function postProcessNoteData(result: { data?: any[] | null }): { data?: any[] | null } {
    /**
     * This will extract the data from the result and try to remove all fields specified in every data object.
     * The data object in the result is replaced with the modified data object and the result is returned.
     */
    // Top-level fields to remove. v1's removable fields (followers, user, externalDisplayUrl) no longer
    // exist on v2 notes at all (v2 permanently dropped followers/comments/totalResults from note responses),
    // so there is nothing equivalent left to strip wholesale here.
    const fieldsToRemove: string[] = [];

    // Nested fields to remove. To remove status under user (or ["user"]["status"]) it is ["user", "status"]
    // Note: a note's `relationships` is a paginated wrapper (`{ data: [...], links }`), not a bare array
    // (confirmed against the live v2 API) - the path below accounts for that extra "data" level.
    const nestedFieldsToRemove = [
        ["links", "self"], // API self-link on the note; the human-facing "html" link is more useful to agents
        ["relationships", "data", "target", "links"] // per-relationship-target API self-links add tokens with little value; id/type are enough
    ];

    if (Array.isArray(result?.data)) {
        // For every note object in the result
        for (let i = 0; i < result.data.length; i++) {
            const dataObject = result.data[i];
            if (dataObject) { // Check if dataObject is not null/undefined/empty
                // Remove nested fields if specified in every data object
                let processedObject = removeNestedFieldsIfPresent(
                    dataObject,
                    nestedFieldsToRemove
                );

                // Remove all top-level fields specified in every data object
                processedObject = removeFields(processedObject, fieldsToRemove);

                // Remove empty fields (null values, empty arrays, objects with all null subfields)
                processedObject = removeEmptyFields(processedObject);

                // Sanitize token-heavy HTML/content fields. opportunityNote content is structured/read-only
                // and is left untouched; textNote content is a plain HTML string; conversationNote content
                // is an array of message parts, each with its own HTML content string.
                if (processedObject.type !== 'opportunityNote' && processedObject.fields) {
                    const content = processedObject.fields.content;
                    if (typeof content === 'string') {
                        processedObject.fields.content = sanitizeHTMLContent(content);
                    } else if (Array.isArray(content)) {
                        processedObject.fields.content = content.map((part: any) =>
                            part && typeof part.content === 'string'
                                ? { ...part, content: sanitizeHTMLContent(part.content) }
                                : part
                        );
                    }
                }

                // Update the result with the processed object
                result.data[i] = processedObject;
            }
        }
    } else {
        // When no or non-array data is returned, we return the result as is
        return result;
    }

    return result;
}

function parseLastDuration(last: string): Date {
    /**
     * API v2 has no 'last' relative-duration parameter, so we parse it ourselves into an
     * absolute point in time (Date.now() minus the parsed duration) to use as 'createdFrom'.
     */
    const match = /^(\d+)\s*(m|d|h)$/i.exec(last.trim());
    if (!match) {
        throw new Error(
            `Invalid 'last' value "${last}". Expected a number followed by 'm' (months), 'd' (days), or 'h' (hours), e.g. "6m", "10d", "24h".`
        );
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const since = new Date();

    if (unit === 'm') {
        since.setMonth(since.getMonth() - amount);
    } else if (unit === 'd') {
        since.setDate(since.getDate() - amount);
    } else {
        since.setHours(since.getHours() - amount);
    }

    return since;
}

const getNotes = async (request: GetNotesRequest): Promise<any> => {
    // Validate mutually exclusive parameters
    if (request.last && (request.createdFrom || request.createdTo)) {
        throw new Error("'last' parameter cannot be combined with 'createdFrom' or 'createdTo'");
    }

    // Resolve 'last' into an absolute 'createdFrom' timestamp, since v2 has no relative-duration filter
    const resolvedCreatedFrom = request.last
        ? parseLastDuration(request.last).toISOString()
        : request.createdFrom;

    const usesSearch = Boolean(request.term || request.featureId || request.companyId);

    let result: any;

    if (usesSearch) {
        // term/featureId/companyId require relationship- and/or full-text filtering, which only
        // POST /notes/search supports (per https://developer.productboard.com/reference/performnotessearch)
        const searchData: Record<string, any> = {};

        if (request.term) {
            searchData.search = { query: request.term };
        }

        const filter: Record<string, any> = {};

        if (resolvedCreatedFrom || request.createdTo) {
            filter.createdAt = {
                ...(resolvedCreatedFrom ? { from: resolvedCreatedFrom } : {}),
                ...(request.createdTo ? { to: request.createdTo } : {})
            };
        }
        if (request.updatedFrom || request.updatedTo) {
            filter.updatedAt = {
                ...(request.updatedFrom ? { from: request.updatedFrom } : {}),
                ...(request.updatedTo ? { to: request.updatedTo } : {})
            };
        }
        if (request.ownerEmail) {
            filter.fields = { owner: { email: request.ownerEmail } };
        }
        if (request.source) {
            filter.metadata = { source: { system: request.source } };
        }

        const relationships: Record<string, any> = {};
        if (request.featureId) {
            relationships.link = { id: request.featureId };
        }
        if (request.companyId) {
            relationships.customer = { id: request.companyId };
        }
        if (Object.keys(relationships).length > 0) {
            filter.relationships = relationships;
        }

        if (Object.keys(filter).length > 0) {
            searchData.filter = filter;
        }

        const endpoint = `/notes/search${request.pageCursor ? `?pageCursor=${encodeURIComponent(request.pageCursor)}` : ''}`;
        result = await productboardClient.post(endpoint, { data: searchData });
    } else {
        const params: QueryParams = {
            "owner[email]": request.ownerEmail,
            "metadata[source][system]": request.source,
            createdFrom: resolvedCreatedFrom,
            createdTo: request.createdTo,
            updatedFrom: request.updatedFrom,
            updatedTo: request.updatedTo,
            pageCursor: request.pageCursor
        };
        result = await productboardClient.get('/notes', params);
    }

    try {
        return postProcessNoteData(result)
    } catch (error) {
        console.error('Error post-processing note data:', error)
        return result
    }
}

export { getNotesTool, GetNotesRequest, getNotes }
