/// <reference types="@cloudflare/workers-types" />
/// <reference path="../wasm/wasm.d.ts" />

import { parse_google_maps_url, parse_kml, route_to_gpx } from '../wasm/wasm-loader';

interface McpRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

async function expandShortUrl(url: string): Promise<string> {
  const shortDomains = ['goo.gl', 'maps.app.goo.gl', 'g.co'];
  const urlObj = new URL(url);
  
  const isShortUrl = shortDomains.some(domain => urlObj.hostname.includes(domain));
  if (!isShortUrl) {
    return url;
  }

  const response = await fetch(url, {
    method: 'HEAD',
    redirect: 'follow',
  });
  
  return response.url;
}

const TOOL_DEFINITIONS = [
  {
    name: "convert_google_maps_url_to_gpx",
    description: "Convert a Google Maps directions URL (including short URLs like maps.app.goo.gl) to GPX format for GPS devices",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Google Maps directions URL (e.g., https://www.google.com/maps/dir/... or https://maps.app.goo.gl/...)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "convert_kml_to_gpx",
    description: "Convert KML content (exported from Google My Maps) to GPX format",
    inputSchema: {
      type: "object",
      properties: {
        kml: {
          type: "string",
          description: "KML file content as XML string",
        },
      },
      required: ["kml"],
    },
  },
];

function handleToolsList(): McpResponse["result"] {
  return { tools: TOOL_DEFINITIONS };
}

async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (name === "convert_google_maps_url_to_gpx") {
    const url = args.url as string;
    if (!url) {
      throw new Error("Missing 'url' argument");
    }
    const expandedUrl = await expandShortUrl(url);
    const route = parse_google_maps_url(expandedUrl);
    const gpx = route_to_gpx(route);
    return {
      content: [{ type: "text", text: gpx }],
    };
  }

  if (name === "convert_kml_to_gpx") {
    const kml = args.kml as string;
    if (!kml) {
      throw new Error("Missing 'kml' argument");
    }
    const route = parse_kml(kml);
    const gpx = route_to_gpx(route);
    return {
      content: [{ type: "text", text: gpx }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function createResponse(id: string | number, result: unknown): McpResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function createErrorResponse(
  id: string | number,
  code: number,
  message: string
): McpResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      name: "routes-to-gpx",
      version: "1.0.0",
      description: "Convert Google Maps URLs and KML files to GPX format",
      tools: TOOL_DEFINITIONS,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const request: McpRequest = await context.request.json();

    if (request.jsonrpc !== "2.0") {
      return new Response(
        JSON.stringify(createErrorResponse(request.id || 0, -32600, "Invalid JSON-RPC version")),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let response: McpResponse;

    switch (request.method) {
      case "initialize":
        response = createResponse(request.id, {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "routes-to-gpx",
            version: "1.0.0",
          },
          capabilities: {
            tools: {},
          },
        });
        break;

      case "tools/list":
        response = createResponse(request.id, handleToolsList());
        break;

      case "tools/call":
        try {
          const params = request.params as { name: string; arguments: Record<string, unknown> };
          const result = await handleToolCall(params.name, params.arguments || {});
          response = createResponse(request.id, result);
        } catch (error) {
          response = createErrorResponse(
            request.id,
            -32000,
            error instanceof Error ? error.message : "Tool execution failed"
          );
        }
        break;

      case "ping":
        response = createResponse(request.id, {});
        break;

      default:
        response = createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(createErrorResponse(0, -32700, "Parse error")),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
