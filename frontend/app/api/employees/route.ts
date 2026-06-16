import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const ALLOWED_QUERY_KEYS = new Set([
  "q",
  "country_code",
  "department",
  "min_salary_usd",
  "max_salary_usd",
  "limit",
  "offset",
  "sort",
  "order",
]);

function upstreamListUrl(requestUrl: URL): URL {
  const upstream = new URL(`${serverEnv.FASTAPI_URL}/api/v1/employees`);
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (ALLOWED_QUERY_KEYS.has(key)) upstream.searchParams.set(key, value);
  }
  return upstream;
}

export async function GET(request: Request): Promise<Response> {
  const upstream = upstreamListUrl(new URL(request.url));

  const upstreamResponse = await fetch(upstream, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const upstream = `${serverEnv.FASTAPI_URL}/api/v1/employees`;

  const upstreamResponse = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
    cache: "no-store",
  });

  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
