import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getCompanyDetailTool: Tool = {
    "name": "get_company_detail",
    "description": "Returns detailed information about a specific company via the unified /entities endpoint (API v2)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "companyId": {
                "type": "string",
                "description": "ID of the company to retrieve"
            }
        },
        "required": ["companyId"]
    }
}

interface GetCompanyDetailRequest {
    companyId: string
}

const getCompanyDetail = async (request: GetCompanyDetailRequest): Promise<any> => {
    const endpoint = `/entities/${request.companyId}`
    return productboardClient.get(endpoint)
}

export { getCompanyDetailTool, GetCompanyDetailRequest, getCompanyDetail }
