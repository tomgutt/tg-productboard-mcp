// Helper function to remove fields from an object
export function removeFields(dataObject: Record<string, any>, fields: string[]): Record<string, any> {
    /**
     * This will first check if the specified fields are in the data and then remove them
     */
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(dataObject)) {
        if (!fields.includes(key)) {
            result[key] = value;
        }
    }
    return result;
}

export function removeNestedFieldsIfPresent(
    dataObject: Record<string, any>,
    fieldsToRemove: string[][]
): Record<string, any> {
    /**
     * Remove nested fields from an object.
     *
     * Parameters:
     *     dataObject: The object to process
     *     fieldsToRemove: List of field paths to remove, e.g. [["user", "status"], ["user", "email"]]
     *
     * Returns:
     *     The object with specified nested fields removed
     */
    if (!fieldsToRemove || fieldsToRemove.length === 0) {
        return dataObject;
    }

    function removeFieldPath(obj: any, path: string[]): any {
        if (typeof obj !== 'object' || obj === null || !path || path.length === 0) {
            return obj;
        }

        if (path.length === 1) {
            // Remove the field if it exists
            if (path[0] in obj) {
                const newObj = { ...obj }; // Create a copy to avoid mutating original
                delete newObj[path[0]];
                return newObj;
            }
            return obj;
        }

        // Navigate deeper into the structure
        if (path[0] in obj) {
            const newObj = { ...obj }; // Create a copy to avoid mutating original
            newObj[path[0]] = removeFieldPath(obj[path[0]], path.slice(1));
            return newObj;
        }

        return obj;
    }

    // Process the single data object
    let processedObject = dataObject;
    for (const fieldPath of fieldsToRemove) {
        processedObject = removeFieldPath(processedObject, fieldPath);
    }

    return processedObject;
}

export function removeEmptyFields(dataObject: Record<string, any>): Record<string, any> {
    /**
     * Remove top-level fields that are:
     * 1. null values
     * 2. empty arrays
     * 3. objects where all subfields are null
     */
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(dataObject)) {
        // Skip null values
        if (value === null) {
            continue;
        }
        
        // Skip empty arrays
        if (Array.isArray(value) && value.length === 0) {
            continue;
        }
        
        // Check if it's an object with all null subfields
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const hasNonNullValue = Object.values(value).some(subValue => subValue !== null);
            if (!hasNonNullValue) {
                continue; // Skip objects where all subfields are null
            }
        }
        
        // Keep the field if it doesn't match any removal criteria
        result[key] = value;
    }
    
    return result;
}

export function sanitizeHTMLContent(rawHtml: string): string {
    /**
     * Reduce token-heavy markup and boilerplate in HTML contents while preserving readable text.
     * Strategy:
     * - Drop scripts/styles/images/tables and Word/Office markup
     * - Convert basic structure tags to newlines and list bullets
     * - Strip remaining HTML tags/attributes
     * - Collapse whitespace
     * - Replace long/trackable URLs with just their domains
     */

    if (!rawHtml) {
        return rawHtml;
    }

    // 1) Remove heavy blocks entirely
    let text = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<table[\s\S]*?<\/table>/gi, '')
        .replace(/<img[^>]*>/gi, '');

    // 2) Normalize line breaks and list markers
    text = text
        .replace(/<(?:br|br\/)\s*>/gi, '\n')
        .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n')
        .replace(/<(?:p|div|h[1-6])[^>]*>/gi, '')
        .replace(/<li[^>]*>/gi, '- ');

    // 3) Unwrap anchors: keep inner text, drop attributes
    text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');

    // 4) Strip any remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // 5) Decode a few common HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, d: string) => {
            const code = Number(d);
            return Number.isFinite(code) ? String.fromCharCode(code) : _;
        })
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => {
            const code = parseInt(h, 16);
            return Number.isFinite(code) ? String.fromCharCode(code) : _;
        });

    // 6) Drop all URLs outright to minimize tokens
    text = text
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\bwww\.[^\s]+/g, '');

    // 7) Collapse whitespace and trim
    text = text
        .replace(/[\t\x0B\f\r]/g, ' ')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

    return text;
}
