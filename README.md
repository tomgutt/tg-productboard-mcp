# Productboard MCP Server

Integrate the Productboard API into agentic workflows via MCP


## Tools

1. `get_companies`
2. `get_company_detail`
3. `get_components`
4. `get_component_detail`
5. `get_features`
6. `search_features`
7. `get_feature_detail`
8. `get_feature_statuses`
9. `get_notes`
10. `get_note_detail`
11. `get_products`
12. `get_product_detail`


## Setup

### Access Token
Obtain your access token referring to [this guidance](https://developer.productboard.com/reference/authentication#public-api-access-token)

### Usage with Claude Desktop
To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

### NPX

```json
{
  "mcpServers": {
    "productboard": {
      "command": "npx",
      "args": [
        "-y",
        "@tomgutt/productboard-mcp"
      ],
      "env": {
        "PRODUCTBOARD_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

## Changes to original
- Implements additional parameters for get_features
- Implements additional search_features tool
- Implements post-processing for response data to reduce token usage

## Migration to Productboard API v2

Productboard retired API v1, so this server now talks to `https://api.productboard.com/v2` instead of the old v1 base URL, and no longer sends the `X-Version` header. See Productboard's own [migration guide](https://developer.productboard.com/reference/migration-guide) for the full picture of what changed upstream.

The most relevant changes for consumers of this MCP server:

- **Cursor-only pagination.** List tools (`get_products`, `get_components`, `get_features`, `get_companies`, `get_notes`) no longer accept a numeric `page` parameter. Instead they take an optional `pageCursor` string — pass the cursor from the previous response's `links.next` URL to fetch the next page. `get_feature_statuses` is no longer paginated at all; it's now a single configuration call.
- **`get_notes` filter changes:**
  - `anyTag` / `allTags` have been removed — Productboard's v2 API no longer supports tag-based note filtering. This is a permanent gap called out in their migration guide, not an oversight here.
  - `last` (e.g. `6m`, `10d`, `24h`) is still accepted, but is now translated into an absolute `createdFrom` timestamp client-side before calling the API, since v2 has no relative-duration filter.
- **`get_features` filter changes:** the `noteId` filter has been removed, since the v2 unified entities list endpoint has no way to filter by related note.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
