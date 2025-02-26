#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequest,
    CallToolRequestSchema,
    ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getProductsTool, GetProductsRequest, getProducts } from "./product/get_products.js";
import { getProductDetailTool, GetProductDetailRequest, getProductDetail } from "./product/get_product_detail.js";

async function main() {
    const productboardAccessToken = process.env.PRODUCTBOARD_ACCESS_TOKEN

    if (!productboardAccessToken) {
        console.error("Please set PRODUCTBOARD_ACCESS_TOKEN environment variable");
        process.exit(1);
    }

    const server = new Server(
        {
            name: "Productboard MCP Server",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    server.setRequestHandler(
        CallToolRequestSchema,
        async (request: CallToolRequest) => {
            console.info("Received CallToolRequest: ", request);

            try {
                const { name, arguments: args } = request.params

                switch (name) {
                    case getProductsTool.name: {
                        const request = args as unknown as GetProductsRequest;
                        const result = await getProducts(request);
                        return {
                            content: [{ type: "text", text: JSON.stringify(result) }],
                        }
                    }

                    case getProductDetailTool.name: {
                        const request = args as unknown as GetProductDetailRequest;
                        const result = await getProductDetail(request);
                        return {
                            content: [{ type: "text", text: JSON.stringify(result) }],
                        }
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }

            } catch (error) {
                console.error("Error executing tool: ", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: error instanceof Error ? error.message : String(error),
                            }),
                        },
                    ],
                };
            }
        }
    )

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        console.info("Received ListToolsRequest");
        return {
            tools: [
                getProductsTool,
                getProductDetailTool
            ],
        };
    });

    const transport = new StdioServerTransport();
    console.log("Connecting server to transport...");
    await server.connect(transport);

    console.log("Productboard MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
