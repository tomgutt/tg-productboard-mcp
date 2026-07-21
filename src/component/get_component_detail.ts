import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getComponentDetailTool: Tool = {
    "name": "get_component_detail",
    "description": "Returns detailed information about a specific component via the unified /entities endpoint (API v2)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "componentId": {
                "type": "string",
                "description": "ID of the component to retrieve"
            }
        },
        "required": ["componentId"]
    }
}

interface GetComponentDetailRequest {
    componentId: string
}

const getComponentDetail = async (request: GetComponentDetailRequest): Promise<any> => {
    const endpoint = `/entities/${request.componentId}`
    return productboardClient.get(endpoint)
}

export { getComponentDetailTool, GetComponentDetailRequest, getComponentDetail }
