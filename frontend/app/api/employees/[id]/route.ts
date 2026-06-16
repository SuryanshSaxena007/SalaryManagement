import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function buildUrl(id: string): string {
  return `${serverEnv.FASTAPI_URL}/api/v1/employees/${encodeURIComponent(id)}`;
}

async function passthrough(upstreamResponse: Response): Promise<Response> {
  if (upstreamResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const upstreamResponse = await fetch(buildUrl(id), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return passthrough(upstreamResponse);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const payload = await request.text();
  const upstreamResponse = await fetch(buildUrl(id), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
    cache: "no-store",
  });
  return passthrough(upstreamResponse);
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const upstreamResponse = await fetch(buildUrl(id), {
    method: "DELETE",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return passthrough(upstreamResponse);
}
