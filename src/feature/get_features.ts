import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getFeaturesTool: Tool = {
    "name": "get_features",
    "description": "Returns a list of all features via the unified /entities endpoint (API v2). Pagination is cursor-based: to fetch the next page, take the `pageCursor` query value from the `links.next` URL of the previous response and pass it as the `pageCursor` input. Note: filtering features by linked note (`noteId`) is no longer supported via this tool as of the API v2 migration, since the /entities list endpoint has no relationship-based filter for notes.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "pageCursor": {
                "type": "string",
                "description": "Cursor for the next page of results, taken from the `pageCursor` query value of the previous response's `links.next` URL. Omit for the first page."
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
            }
        }
    }
}

interface GetFeaturesRequest {
    pageCursor?: string;
    statusId?: string;
    parentId?: string;
    ownerEmail?: string;
}

const getFeatures = async (request: GetFeaturesRequest): Promise<any> => {
    return productboardClient.get("/entities", {
        type: ["feature"],
        pageCursor: request.pageCursor,
        "status[id]": request.statusId,
        "parent[id]": request.parentId,
        "owner[email]": request.ownerEmail,
    })
}

export { getFeaturesTool, GetFeaturesRequest, getFeatures }
