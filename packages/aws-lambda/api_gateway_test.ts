import type { EventDocument } from "@hooksmith/core";
import { assertEquals } from "@std/assert";
import {
  type ApiGatewayEventV2,
  createApiGatewayHandler,
  fromApiGatewayHttpV2,
} from "./api_gateway.ts";

const eventDocument: EventDocument = {
  type: "test",
  timestamp: "2026-09-07T00:00:00Z",
  source: { kind: "test" },
  data: {},
};

const report = {
  mode: "run" as const,
  event: {
    type: "test",
    timestamp: "2026-09-07T00:00:00Z",
    source: { kind: "test" },
  },
  results: [],
  success: true,
};

function requestEvent(
  overrides: Partial<ApiGatewayEventV2> = {},
): ApiGatewayEventV2 {
  return {
    rawPath: "/webhook",
    rawQueryString: "source=test",
    headers: {
      host: "example.com",
      "x-forwarded-proto": "https",
      "x-delivery-id": "delivery-123",
    },
    requestContext: {
      domainName: "example.com",
      http: { method: "POST" },
    },
    body: JSON.stringify(eventDocument),
    ...overrides,
  };
}

Deno.test("API Gateway v2 events normalize into HTTP ingress requests", () => {
  const request = fromApiGatewayHttpV2(requestEvent());

  assertEquals(request.method, "POST");
  assertEquals(request.url, "https://example.com/webhook?source=test");
  assertEquals(request.headers.get("x-delivery-id"), "delivery-123");
  assertEquals(
    new TextDecoder().decode(request.body),
    JSON.stringify(eventDocument),
  );
});

Deno.test("API Gateway v2 base64 bodies preserve decoded bytes", () => {
  const payload = '{\n  "message": "hello"\n}';
  const request = fromApiGatewayHttpV2(
    requestEvent({
      body: btoa(payload),
      isBase64Encoded: true,
    }),
  );

  assertEquals(new TextDecoder().decode(request.body), payload);
});

Deno.test("API Gateway handler passes normalized request to ingress mapper", async () => {
  let deliveryId: string | null = null;
  let payload = "";
  const handler = createApiGatewayHandler(
    () => Promise.resolve(report),
    {
      ingressMapper: ({ request }) => {
        deliveryId = request.headers.get("x-delivery-id");
        payload = new TextDecoder().decode(request.body);
        return eventDocument;
      },
    },
  );

  const response = await handler(requestEvent({ body: "raw webhook body" }));

  assertEquals(deliveryId, "delivery-123");
  assertEquals(payload, "raw webhook body");
  assertEquals(response.statusCode, 200);
  assertEquals(JSON.parse(response.body ?? "null"), report);
});

Deno.test("API Gateway handler accepts Hooksmith event documents without a mapper", async () => {
  let processed: EventDocument | undefined;
  const handler = createApiGatewayHandler((document) => {
    processed = document;
    return Promise.resolve(report);
  });

  const response = await handler(requestEvent());

  assertEquals(processed, eventDocument);
  assertEquals(response.statusCode, 200);
});

Deno.test("API Gateway handler rejects invalid event document shapes", async () => {
  let processed = false;
  const handler = createApiGatewayHandler(() => {
    processed = true;
    return Promise.resolve(report);
  });

  const response = await handler(
    requestEvent({ body: JSON.stringify({ foo: "bar" }) }),
  );

  assertEquals(processed, false);
  assertEquals(response.statusCode, 400);
  assertEquals(response.headers?.["content-type"], "application/problem+json");
});

Deno.test("API Gateway handler maps ingress failures to 400", async () => {
  const handler = createApiGatewayHandler(
    () => Promise.resolve(report),
    {
      ingressMapper: () => {
        throw new Error("invalid signature");
      },
    },
  );

  const response = await handler(requestEvent());

  assertEquals(response.statusCode, 400);
  assertEquals(response.headers?.["content-type"], "application/problem+json");
});

Deno.test("API Gateway handler maps processor failures to 500", async () => {
  const handler = createApiGatewayHandler(() =>
    Promise.reject(new Error("boom"))
  );

  const response = await handler(requestEvent());

  assertEquals(response.statusCode, 500);
  assertEquals(response.headers?.["content-type"], "application/problem+json");
});
