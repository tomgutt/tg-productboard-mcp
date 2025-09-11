import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const searchFeaturesTool: Tool = {
    "name": "search_features",
    "description": "Searches through all features by name and optionally by description. Fetches all pages automatically. This tool should not be called multiple times in parallel.",
    "inputSchema": {
        "type": "object",
        "required": ["searchQuery"],
        "properties": {
            "searchQuery": {
                "type": "string",
                "description": "The search term to look for in feature names and descriptions"
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
    searchQuery: string;
    searchDescriptions?: boolean;
}

const searchFeatures = async (request: SearchFeaturesRequest): Promise<any> => {
    const { searchQuery, searchDescriptions = false } = request;
    
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
    const searchTerm = searchQuery.toLowerCase();    
    const matchingFeatures = allFeatures.filter(feature => {
        // Search in name (always)
        const nameMatch = feature.name?.toLowerCase().includes(searchTerm);
        
        // Search in description (if enabled)
        let descriptionMatch = false;
        if (searchDescriptions && feature.description) {
            // Remove HTML tags from description for better searching
            const cleanDescription = feature.description.replace(/<[^>]*>/g, '').toLowerCase();
            descriptionMatch = cleanDescription.includes(searchTerm);
        }
        
        return nameMatch || descriptionMatch;
    });
        
    return {
        data: matchingFeatures,
        allFeaturesCount: allFeatures.length,
        featuresMatchedCount: matchingFeatures.length,
        searchQuery: searchQuery,
        searchedDescriptions: searchDescriptions
    };
}

export { searchFeaturesTool, SearchFeaturesRequest, searchFeatures }
