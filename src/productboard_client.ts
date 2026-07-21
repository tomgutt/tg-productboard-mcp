type QueryParamValue = string | number | boolean | string[] | undefined;
type QueryParams = Record<string, QueryParamValue>;

class ProductboardClient {
    private accessToken: string
    private baseUrl = "https://api.productboard.com/v2"
    private headers: { [key: string]: string };

    constructor(accessToken: string) {
        this.accessToken = accessToken
        this.headers = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
    }

    private buildUrl(endpoint: string, params?: QueryParams): string {
        const query = new URLSearchParams();
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined) continue;
                if (Array.isArray(value)) {
                    for (const item of value) {
                        query.append(`${key}[]`, item);
                    }
                } else {
                    query.append(key, String(value));
                }
            }
        }
        const queryString = query.toString();
        return `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;
    }

    async get(endpoint: string, params?: QueryParams) {
        const response = await fetch(this.buildUrl(endpoint, params), {
            method: "GET",
            headers: this.headers,
        });
        return response.json()
    }

    async post(endpoint: string, body: unknown) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        return response.json()
    }

    /**
     * Follows cursor-based pagination (`links.next`) until exhausted and returns
     * the concatenated `data` arrays. API v2 has no page-size/offset control, so
     * this is the only way to retrieve a full result set for tools that need it.
     */
    async getAllPages(endpoint: string, params?: QueryParams): Promise<any[]> {
        const results: any[] = [];
        let url: string | null = this.buildUrl(endpoint, params);

        while (url) {
            const response = await fetch(url, {
                method: "GET",
                headers: this.headers,
            });
            const json: any = await response.json();

            if (Array.isArray(json?.data)) {
                results.push(...json.data);
            }

            url = json?.links?.next ?? null;
        }

        return results;
    }
}

const productboardAccessToken = process.env.PRODUCTBOARD_ACCESS_TOKEN

if (!productboardAccessToken) {
    console.error("Please set PRODUCTBOARD_ACCESS_TOKEN environment variable");
    process.exit(1);
}

const productboardClient = new ProductboardClient(process.env.PRODUCTBOARD_ACCESS_TOKEN!)
export default productboardClient
export { QueryParams }
