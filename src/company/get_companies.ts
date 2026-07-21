import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getCompaniesTool: Tool = {
    "name": "get_companies",
    "description": "Returns a list of all companies via the unified /entities endpoint (API v2). Pagination is cursor-based: to fetch the next page, take the `pageCursor` query value from the `links.next` URL of the previous response and pass it as the `pageCursor` input.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "pageCursor": {
                "type": "string",
                "description": "Cursor for the next page of results, taken from the `pageCursor` query value of the previous response's `links.next` URL. Omit for the first page."
            }
        }
    }
}

interface GetCompaniesRequest {
    pageCursor?: string
}

const getCompanies = async (request: GetCompaniesRequest): Promise<any> => {
    return productboardClient.get("/entities", {
        type: ["company"],
        pageCursor: request.pageCursor,
    })
}

export { getCompaniesTool, GetCompaniesRequest, getCompanies }
