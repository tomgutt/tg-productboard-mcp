import { Tool } from "@modelcontextprotocol/sdk/types.js";
import productboardClient from "../productboard_client.js";

const searchFeaturesTool: Tool = {
    "name": "search_features",
    "description": "Searches through all features by name and optionally by description. Matches any of the provided terms (OR). This tool should not be called multiple times in parallel. Also, its parameters should be used sparingly.",
    "inputSchema": {
        "type": "object",
        "required": ["searchQueries"],
        "properties": {
            "searchQueries": {
                "type": "array",
                "minItems": 1,
                "items": { "type": "string", "description": "A precise and topic-oriented search term to look for in feature names and optionally descriptions", "minLength": 1 },
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

    // Collect all feature entities across all pages
    const allFeatures: any[] = await productboardClient.getAllPages('/entities', { type: ['feature'] });

    // Search through collected features
    const matchingFeatures = allFeatures.filter(feature => {
        const name = feature.fields?.name;
        const description = feature.fields?.description;

        const nameLower = name ? String(name).toLowerCase() : '';
        let cleanDescriptionLower: string | undefined = undefined;
        if (searchDescriptions && description) {
            cleanDescriptionLower = String(description).replace(/<[^>]*>/g, '').toLowerCase();
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
