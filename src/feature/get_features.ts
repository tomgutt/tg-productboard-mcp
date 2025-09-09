import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getFeaturesTool: Tool = {
    "name": "get_features",
    "description": "Returns a list of all features. This API is paginated and the page limit is always 100",
    "inputSchema": {
        "type": "object",
        "required": ["page"],
        "properties": {
            "page": {
                "type": "number",
                "default": 1
            },
            "statusId": {
                "type": "string",
                "description": "Filter features by status ID"
            },
            "parentId": {
                "type": "string",
                "description": "Filter features that are children of a specific feature"
            },
            "ownerEmail": {
                "type": "string",
                "description": "Filter features that have an owner linked by email"
            },
            "noteId": {
                "type": "string",
                "description": "Filter features linked to a note by ID"
            }
        }
    }
}

interface GetFeaturesRequest {
    page?: number;
    statusId?: string;
    parentId?: string;
    ownerEmail?: string;
    noteId?: string;
}

const getFeatures = async (request: GetFeaturesRequest): Promise<any> => {
    const params = new URLSearchParams()

    // Pagination via page -> pageOffset (100 per page per API)
    if (request.page && request.page > 1) {
        const offset = (request.page - 1) * 100
        if (offset > 0) {
            params.append('pageOffset', offset.toString())
        }
    }

    // Filters
    if (request.statusId) {
        params.append('status.id', request.statusId)
    }
    if (request.parentId) {
        params.append('parent.id', request.parentId)
    }
    if (request.ownerEmail) {
        params.append('owner.email', request.ownerEmail)
    }
    if (request.noteId) {
        params.append('note.id', request.noteId)
    }

    const queryString = params.toString()
    const endpoint = `/features${queryString ? `?${queryString}` : ''}`

    return productboardClient.get(endpoint)
}

export { getFeaturesTool, GetFeaturesRequest, getFeatures }
