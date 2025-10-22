import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";
import { removeNestedFieldsIfPresent, removeFields, removeEmptyFields, sanitizeHTMLContent } from "../utils/post_processor.js";

const getNotesTool: Tool = {
    "name": "get_notes",
    "description": "Returns a list of all notes",
    "inputSchema": {
        "type": "object",
        "properties": {
            "last": {
                "type": "string",
                "description": "Return only notes created since given span of months (m), days (s), or hours (h). E.g. 6m | 10d | 24h | 1h. Cannot be combined with createdFrom, createdTo, dateFrom, or dateTo"
            },
            "createdFrom": {
                "type": "string",
                "format": "date",
                "description": "Return only notes created since given date. Cannot be combined with last"
            },
            "createdTo": {
                "type": "string",
                "format": "date",
                "description": "Return only notes created before or equal to the given date. Cannot be combined with last"
            },
            "updatedFrom": {
                "type": "string",
                "format": "date",
                "description": "Return only notes updated since given date"
            },
            "updatedTo": {
                "type": "string",
                "format": "date",
                "description": "Return only notes updated before or equal to the given date"
            },
            "term": {
                "type": "string",
                "description": "Return only notes by fulltext search"
            },
            "featureId": {
                "type": "string",
                "description": "Return only notes for specific feature ID or its descendants"
            },
            "companyId": {
                "type": "string",
                "description": "Return only notes for specific company ID"
            },
            "ownerEmail": {
                "type": "string",
                "description": "Return only notes owned by a specific owner email"
            },
            "source": {
                "type": "string",
                "description": "Return only notes from a specific source origin. This is the unique string identifying the external system from which the data came"
            },
            "anyTag": {
                "type": "string",
                "description": "Return only notes that have been assigned any of the tags in the array. Cannot be combined with allTags"
            },
            "allTags": {
                "type": "string",
                "description": "Return only notes that have been assigned all of the tags in the array. Cannot be combined with anyTag"
            },
            "pageLimit": {
                "type": "number",
                "description": "Page limit",
                "default": 300,
                "maximum": 2000
            },
            "pageCursor": {
                "type": "string",
                "description": "Page cursor to get next page of results"
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
    anyTag?: string;
    allTags?: string;
    pageLimit?: number;
    pageCursor?: string;
}


function postProcessNoteData(result: { data?: any[] | null }): { data?: any[] | null } {
    /**
     * This will extract the data from the result and try to remove all fields specified in every data object.
     * The data object in the result is replaced with the modified data object and the result is returned.
     */
    // Top-level fields to remove
    const fieldsToRemove = [
        "followers", // The followers arent too interesting
        "user", // This is not relevant as there is no tool to process a user id
        "externalDisplayUrl" // This is not relevant as we are only interested in the internal note url
    ];

    // Nested fields to remove. To remove status under user (or ["user"]["status"]) it is ["user", "status"]
    const nestedFieldsToRemove = [
        ["source", "record_id"], // This is not relevant as there is no tool to process a record id
        ["features", "type"], // This is not relevant as the feature type seems to always be "feature"
        ["createdBy", "id"] // This is not relevant as there is no tool to process a user id
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

                // Sanitize token-heavy HTML/content fields
                if (typeof processedObject.content === 'string') {
                    processedObject.content = sanitizeHTMLContent(processedObject.content);
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


const getNotes = async (request: GetNotesRequest): Promise<any> => {
    // Validate mutually exclusive parameters
    if (request.last && (request.createdFrom || request.createdTo)) {
        throw new Error("'last' parameter cannot be combined with 'createdFrom' or 'createdTo'");
    }
    if (request.anyTag && request.allTags) {
        throw new Error("'anyTag' cannot be combined with 'allTags'");
    }

    const params = new URLSearchParams()
    
    if (request.last) {
        params.append('last', request.last)
    }
    if (request.createdFrom) {
        params.append('createdFrom', request.createdFrom)
    }
    if (request.createdTo) {
        params.append('createdTo', request.createdTo)
    }
    if (request.updatedFrom) {
        params.append('updatedFrom', request.updatedFrom)
    }
    if (request.updatedTo) {
        params.append('updatedTo', request.updatedTo)
    }
    if (request.term) {
        params.append('term', request.term)
    }
    if (request.featureId) {
        params.append('featureId', request.featureId)
    }
    if (request.companyId) {
        params.append('companyId', request.companyId)
    }
    if (request.ownerEmail) {
        params.append('ownerEmail', request.ownerEmail)
    }
    if (request.source) {
        params.append('source', request.source)
    }
    if (request.anyTag) {
        params.append('anyTag', request.anyTag)
    }
    if (request.allTags) {
        params.append('allTags', request.allTags)
    }
    if (request.pageLimit) {
        params.append('pageLimit', request.pageLimit.toString())
    }
    if (request.pageCursor) {
        params.append('pageCursor', request.pageCursor)
    }

    const queryString = params.toString()
    const endpoint = `/notes${queryString ? `?${queryString}` : ''}`

    const result = await productboardClient.get(endpoint)

    try {
        return postProcessNoteData(result)
    } catch (error) {
        console.error('Error post-processing note data:', error)
        return result
    }
}

export { getNotesTool, GetNotesRequest, getNotes }
