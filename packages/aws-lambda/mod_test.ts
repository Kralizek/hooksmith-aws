import { assertEquals, assertRejects } from "@std/assert";
import type { Event, EventDocument } from "@hooksmith/core";
import type { RunReport, Runtime } from "@hooksmith/runtime";
import { createHandler, createProcessor } from "./mod.ts";

Deno.test("createProcessor hydrates and processes the event document", async () => {
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
  const processor = createProcessor(runtime);
  const document: EventDocument<{ orderId: string }> = {
    type: "order.created",
    timestamp: "2026-09-02T20:00:00Z",
    source: { kind: "orders", id: "checkout" },
    data: { orderId: "42" },
  };

  const result = await processor(document);

  assertEquals(processed?.timestamp, Temporal.Instant.from(document.timestamp));
  assertEquals(processed?.data, { orderId: "42" });
  assertEquals(result.success, true);
});

Deno.test("createProcessor rejects invalid event documents", async () => {
  const runtime: Runtime = {
    process(event) {
      return Promise.resolve(report(event));
    },
    plan(event) {
      return Promise.resolve(report(event));
    },
  };
  const processor = createProcessor(runtime);

  await assertRejects(() =>
    processor({
      type: "order.created",
      timestamp: "not-a-timestamp",
      source: { kind: "orders" },
      data: {},
    })
  );
});

Deno.test("createHandler returns the raw processor", () => {
  const processor = async (_document: EventDocument) => reportDocument();
  assertEquals(createHandler(processor), processor);
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

function reportDocument(): RunReport {
  return {
    mode: "run",
    event: {
      type: "test.event",
      timestamp: "2026-09-03T00:00:00Z",
      source: { kind: "test" },
    },
    results: [],
    success: true,
    outcome: "matched",
  };
}
