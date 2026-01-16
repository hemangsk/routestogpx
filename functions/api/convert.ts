/// <reference types="@cloudflare/workers-types" />
/// <reference path="../wasm/wasm.d.ts" />

import { parse_google_maps_url, parse_kml, route_to_gpx } from '../wasm/wasm-loader';

interface ConvertRequest {
  type: "url" | "kml";
  input: string;
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const inputUrl = url.searchParams.get("url");

  if (!inputUrl) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const route = parse_google_maps_url(inputUrl);
    const gpx = route_to_gpx(route);

    return new Response(gpx, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": 'attachment; filename="route.gpx"',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: ConvertRequest = await context.request.json();

    if (!body.type || !body.input) {
      return new Response(
        JSON.stringify({ error: "Missing 'type' or 'input' in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let route;
    if (body.type === "url") {
      route = parse_google_maps_url(body.input);
    } else if (body.type === "kml") {
      route = parse_kml(body.input);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be 'url' or 'kml'" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const gpx = route_to_gpx(route);

    return new Response(JSON.stringify({ gpx }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
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
