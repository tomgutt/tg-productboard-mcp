import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const searchFeaturesTool: Tool = {
    "name": "search_features",
    "description": "Searches through all features by name and optionally by description. Matches any of the provided terms (OR). Fetches all pages automatically. This tool should not be called multiple times in parallel and its parameters should be used sparingly.",
    "inputSchema": {
        "type": "object",
        "required": ["searchQueries"],
        "properties": {
            "searchQueries": {
                "type": "array",
                "minItems": 1,
                "items": { "type": "string", "minLength": 1 },
                "description": "Array of search terms to look for in feature names and optionally descriptions"
            },
            "searchDescriptions": {
                "type": "boolean",
                "default": false,
                "description": "Whether to search in feature descriptions in addition to names"
            }
        }
    }
}

interface SearchFeaturesRequest {
    searchQueries: string[];
    searchDescriptions?: boolean;
}

const searchFeatures = async (request: SearchFeaturesRequest): Promise<any> => {
    const { searchQueries, searchDescriptions = false } = request;
    const searchTerms = searchQueries
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);
    
    // Collect all features from all pages
    const allFeatures: any[] = [];
    let nextUrl: string | undefined = '/features?pageLimit=1000';
    
    // Fetch all pages
    while (nextUrl) {
        const response: any = await productboardClient.get(nextUrl);
        
        if (response.data && Array.isArray(response.data)) {
            allFeatures.push(...response.data);
        }
        
        // Continue to next page only if there's a next URL AND current page has 1000 items
        if (response.links?.next && response.data.length === 1000) {
            nextUrl = new URL(response.links.next).pathname + new URL(response.links.next).search;
        } else {
            nextUrl = undefined;
        }
    }
        
    // Search through collected features
    const matchingFeatures = allFeatures.filter(feature => {
        const nameLower = feature.name ? String(feature.name).toLowerCase() : '';
        let cleanDescriptionLower: string | undefined = undefined;
        if (searchDescriptions && feature.description) {
            cleanDescriptionLower = String(feature.description).replace(/<[^>]*>/g, '').toLowerCase();
        }
        
        const matchesAnyTerm = searchTerms.some(term => {
            const nameMatch = nameLower.includes(term);
            const descriptionMatch = cleanDescriptionLower ? cleanDescriptionLower.includes(term) : false;
            return nameMatch || descriptionMatch;
        });
        
        return matchesAnyTerm;
    });
        
    return {
        data: matchingFeatures,
        allFeaturesCount: allFeatures.length,
        featuresMatchedCount: matchingFeatures.length,
        searchQueries: searchQueries,
        searchedDescriptions: searchDescriptions
    };
}

export { searchFeaturesTool, SearchFeaturesRequest, searchFeatures }
