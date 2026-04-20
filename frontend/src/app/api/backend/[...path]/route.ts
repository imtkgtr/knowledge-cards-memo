import { getBackendInternalUrl } from "@/lib/api/backend";
import type { NextRequest } from "next/server";

const FORWARDED_RESPONSE_HEADERS = ["content-type"] as const;

function buildTargetUrl(request: NextRequest, path: string[]) {
  const targetUrl = new URL(`/api/${path.join("/")}`, getBackendInternalUrl());
  targetUrl.search = request.nextUrl.search;
  return targetUrl;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const response = await fetch(buildTargetUrl(request, path), {
    method: request.method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
    cache: "no-store",
  });

  const headers = new Headers();
  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}
