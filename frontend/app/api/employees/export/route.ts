import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "country_code",
  "department",
  "min_salary_usd",
  "max_salary_usd",
  "q",
  "limit",
  "offset",
  "sort",
  "order",
  "format",
]);

function buildUpstreamUrl(requestUrl: URL): URL {
  const incoming = new URLSearchParams();
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (ALLOWED_KEYS.has(key)) incoming.set(key, value);
  }

  const format = incoming.get("format");
  incoming.delete("format");

  const path = format === "json" ? "/api/v1/employees" : "/api/v1/employees/export.csv";
  const upstream = new URL(`${serverEnv.FASTAPI_URL}${path}`);
  for (const [key, value] of incoming.entries()) {
    upstream.searchParams.set(key, value);
  }
  return upstream;
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstream = buildUpstreamUrl(requestUrl);
  const wantsJson = requestUrl.searchParams.get("format") === "json";

  const upstreamResponse = await fetch(upstream, {
    method: "GET",
    headers: { Accept: wantsJson ? "application/json" : "text/csv" },
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    const text = await upstreamResponse.text();
    return NextResponse.json(
      { error: "Upstream export failed", status: upstreamResponse.status, body: text },
      { status: 502 },
    );
  }

  const filename = wantsJson ? "employees.json" : "employees.csv";
  const contentType = wantsJson ? "application/json" : "text/csv";

  const headers = new Headers();
  headers.set("Content-Type", `${contentType}; charset=utf-8`);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");

  return new Response(upstreamResponse.body, {
    status: 200,
    headers,
  });
}
