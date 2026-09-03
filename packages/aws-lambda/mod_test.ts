import { assertEquals, assertRejects } from "@std/assert";
import type { Event, EventDocument } from "@hooksmith/core";
import type { RunReport, Runtime } from "@hooksmith/runtime";
import { createLambdaHandler } from "./mod.ts";

Deno.test("createLambdaHandler hydrates and processes the event document", async () => {
  let processed: Event<{ orderId: string }> | undefined;
  const runtime: Runtime<Event<{ orderId: string }>> = {
    process(event) {
      processed = event;
      return Promise.resolve(report(event));
    },
    plan(event) {
      return Promise.resolve(report(event));
    },
  };
  const handler = createLambdaHandler(runtime);
  const document: EventDocument<{ orderId: string }> = {
    type: "order.created",
    timestamp: "2026-09-02T20:00:00Z",
    source: { kind: "orders", id: "checkout" },
    data: { orderId: "42" },
  };

  const result = await handler(document);

  assertEquals(processed?.timestamp, Temporal.Instant.from(document.timestamp));
  assertEquals(processed?.data, { orderId: "42" });
  assertEquals(result.success, true);
});

Deno.test("createLambdaHandler rejects invalid event documents", async () => {
  const runtime: Runtime = {
    process(event) {
      return Promise.resolve(report(event));
    },
    plan(event) {
      return Promise.resolve(report(event));
    },
  };
  const handler = createLambdaHandler(runtime);

  await assertRejects(() =>
    handler({
      type: "order.created",
      timestamp: "not-a-timestamp",
      source: { kind: "orders" },
      data: {},
    })
  );
});

function report(event: Event): RunReport {
  return {
    mode: "run",
    event: {
      type: event.type,
      timestamp: event.timestamp.toString(),
      source: event.source,
      subject: event.subject,
      metadata: event.metadata,
    },
    results: [],
    success: true,
    outcome: "unmatched",
  };
}
