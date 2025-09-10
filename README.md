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

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
