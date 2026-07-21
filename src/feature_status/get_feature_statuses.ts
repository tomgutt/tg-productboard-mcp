import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const getFeatureStatusesTool: Tool = {
    "name": "get_feature_statuses",
    "description": "Returns a list of all feature statuses. There is no dedicated status-list endpoint in API v2; statuses are derived from the feature entity type's configuration (GET /entities/configurations/feature), so this call is not paginated.",
    "inputSchema": {
        "type": "object",
        "properties": {}
    }
}

interface GetFeatureStatusesRequest {
}

/**
 * Follows the `status` field's `values.links.next` cursor (if present) until
 * exhausted, and returns the concatenated status option list. Small/fixed
 * status sets are typically returned inline with no `links.next`.
 */
const getAllStatusValues = async (values: { data?: any[]; links?: { next?: string | null } } | undefined): Promise<any[]> => {
    if (!values) return [];

    const results: any[] = Array.isArray(values.data) ? [...values.data] : [];
    let nextUrl: string | null = values.links?.next ?? null;

    while (nextUrl) {
        const parsed = new URL(nextUrl);
        const endpoint = `${parsed.pathname.replace(/^\/v2/, '')}${parsed.search}`;
        const response: any = await productboardClient.get(endpoint);

        if (Array.isArray(response?.data)) {
            results.push(...response.data);
        }

        nextUrl = response?.links?.next ?? null;
    }

    return results;
}

const getFeatureStatuses = async (request: GetFeatureStatusesRequest): Promise<any> => {
    const response: any = await productboardClient.get('/entities/configurations/feature');

    const statusField = response?.data?.fields?.status;
    const statusOptions = await getAllStatusValues(statusField?.values);

    return { data: statusOptions };
}

export { getFeatureStatusesTool, GetFeatureStatusesRequest, getFeatureStatuses }
