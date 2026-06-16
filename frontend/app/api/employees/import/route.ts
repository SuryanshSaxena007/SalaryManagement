import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const incoming = await request.formData();
  const file = incoming.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Missing file" }, { status: 400 });
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name);

  const upstreamResponse = await fetch(
    `${serverEnv.FASTAPI_URL}/api/v1/employees/import`,
    {
      method: "POST",
      body: upstreamForm,
      cache: "no-store",
    },
  );

  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
