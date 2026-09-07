/**
 * AWS Lambda hosting support for API Gateway HTTP API payloads.
 *
 * @module
 */

import type { EventDocument } from "@hooksmith/core";
import type {
  HttpIngressMapper,
  HttpIngressRequest,
} from "@hooksmith/core/ingress";
import type { RunReport } from "@hooksmith/runtime";
import type { EventProcessor, LambdaHandler } from "./types.ts";

/** API Gateway HTTP API v2 request context subset used by the Hooksmith host. */
export interface ApiGatewayRequestContext {
  readonly domainName?: string;
  readonly http: {
    readonly method: string;
  };
}

/** API Gateway HTTP API v2 event subset used by the Hooksmith host. */
export interface ApiGatewayEventV2 {
  readonly body?: string | null;
  readonly headers?: Record<string, string | undefined>;
  readonly isBase64Encoded?: boolean;
  readonly rawPath: string;
  readonly rawQueryString?: string;
  readonly requestContext: ApiGatewayRequestContext;
}

/** API Gateway HTTP API v2 response returned by the Hooksmith host. */
export interface ApiGatewayResultV2 {
  readonly statusCode: number;
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}

/** Options used to create an API Gateway HTTP API handler. */
export interface ApiGatewayHandlerOptions {
  readonly ingressMapper?: HttpIngressMapper;
}

/** Converts an API Gateway HTTP API v2 event into normalized Hooksmith ingress data. */
export function fromApiGatewayHttpV2(
  event: ApiGatewayEventV2,
): HttpIngressRequest {
  return {
    method: event.requestContext.http.method,
    url: buildUrl(event),
    headers: createHeaders(event.headers),
    body: decodeBody(event.body, event.isBase64Encoded ?? false),
  };
}

/** Creates an AWS Lambda handler for API Gateway HTTP API v2 requests. */
export function createApiGatewayHandler(
  processor: EventProcessor,
  options: ApiGatewayHandlerOptions = {},
): LambdaHandler<ApiGatewayEventV2, ApiGatewayResultV2> {
  return async (input) => {
    let document: EventDocument;

    try {
      const request = fromApiGatewayHttpV2(input);
      const value = options.ingressMapper
        ? await options.ingressMapper({ request })
        : JSON.parse(new TextDecoder().decode(request.body)) as unknown;
      document = requireEventDocument(value);
    } catch {
      return problemResponse(400, "Bad Request");
    }

    try {
      const report = await processor(document);
      return reportResponse(report);
    } catch {
      return problemResponse(500, "Internal Server Error");
    }
  };
}

function createHeaders(
  values: Record<string, string | undefined> | undefined,
): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(values ?? {})) {
    if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function buildUrl(event: ApiGatewayEventV2): string {
  const headers = createHeaders(event.headers);
  const host = event.requestContext.domainName ?? headers.get("host") ??
    "localhost";
  const scheme = headers.get("x-forwarded-proto") ?? "https";
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  return `${scheme}://${host}${event.rawPath}${query}`;
}

function decodeBody(
  body: string | null | undefined,
  base64: boolean,
): Uint8Array {
  if (!body) return new Uint8Array();
  if (!base64) return new TextEncoder().encode(body);

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function requireEventDocument(value: unknown): EventDocument {
  if (!isEventDocument(value)) {
    throw new TypeError("Ingress mapper did not produce a Hooksmith event document.");
  }
  return value;
}

function isEventDocument(value: unknown): value is EventDocument {
  if (value === null || typeof value !== "object") return false;

  const document = value as Record<string, unknown>;
  const source = document.source;

  return typeof document.type === "string" &&
    typeof document.timestamp === "string" &&
    source !== null &&
    typeof source === "object" &&
    typeof (source as Record<string, unknown>).kind === "string" &&
    "data" in document;
}

function reportResponse(report: RunReport): ApiGatewayResultV2 {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(report),
  };
}

function problemResponse(
  statusCode: number,
  title: string,
): ApiGatewayResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/problem+json" },
    body: JSON.stringify({
      type: "about:blank",
      title,
      status: statusCode,
    }),
  };
}
