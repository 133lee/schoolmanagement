import { NextRequest, NextResponse } from "next/server";

// `context` intentionally typed `any`, matching AuthenticatedRouteHandler in
// lib/http/with-auth.ts — route handler second-arg shapes vary (bare,
// {params: Promise<{id}>}, etc.) across the app, and callRoute needs to
// accept any of them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export interface CallRouteOptions {
  method?: string;
  /** Path only, e.g. "/api/admin/reports/grades" — host is a placeholder, never actually hit. */
  url: string;
  token?: string | null;
  body?: unknown;
  params?: Record<string, string>;
}

export interface CallRouteResult<T = unknown> {
  status: number;
  json: T;
  contentType: string | null;
  /** Byte length of the raw response body — set for non-JSON responses (PDF/ZIP binaries). */
  byteLength: number | null;
}

/**
 * Invokes an exported route handler (GET/POST/etc. from a route.ts file)
 * directly, without a running Next server — no Supertest, no HTTP round
 * trip. Builds a real NextRequest and reads the real NextResponse, so the
 * full withAuth/withRole → service → repository → ApiResponse chain runs
 * exactly as it does in production.
 */
export async function callRoute<T = unknown>(
  handler: RouteHandler,
  options: CallRouteOptions
): Promise<CallRouteResult<T>> {
  const { method = "GET", url, token, body, params } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const context = params ? { params: Promise.resolve(params) } : {};
  const response = await handler(request, context);
  const contentType = response.headers.get("content-type");

  let json: T;
  let byteLength: number | null = null;
  if (contentType?.includes("application/json")) {
    try {
      json = await response.json();
    } catch {
      json = undefined as T;
    }
  } else {
    // Binary responses (PDF/ZIP exports) — don't attempt .json(), read the
    // raw byte length instead so tests can assert real content was produced.
    const buffer = await response.arrayBuffer();
    byteLength = buffer.byteLength;
    json = undefined as T;
  }

  return { status: response.status, json, contentType, byteLength };
}
