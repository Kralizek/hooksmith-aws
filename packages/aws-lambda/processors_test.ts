import { assertEquals, assertRejects } from "@std/assert";
import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";
import * as sns from "./sns.ts";
import * as sqs from "./sqs.ts";

interface TestRecord {
  messageId: string;
  body: string;
}

Deno.test("SQS processor returns failed item identifiers", async () => {
  const processor = sqs.createProcessor<TestRecord, { fail?: boolean }>(
    (record) => {
      if (record.body === "throw") {
        throw new Error("bad record");
      }
      return document({ fail: record.body === "fail" });
    },
    (event) => Promise.resolve(report(event.data.fail !== true)),
  );

  const result = await processor({
    Records: [
      { messageId: "ok", body: "ok" },
      { messageId: "failed", body: "fail" },
      { messageId: "broken", body: "throw" },
    ],
  });

  assertEquals(result, {
    batchItemFailures: [
      { itemIdentifier: "failed" },
      { itemIdentifier: "broken" },
    ],
  });
});

Deno.test("SNS processor processes every notification", async () => {
  const processed: string[] = [];
  const processor = sns.createProcessor<string, string>(
    (value) => document(value),
    (event) => {
      processed.push(event.data);
      return Promise.resolve(report(true));
    },
  );

  await processor({
    Records: [{ Sns: "one" }, { Sns: "two" }],
  });

  assertEquals(processed, ["one", "two"]);
});

Deno.test("SNS processor rejects unsuccessful Hooksmith processing", async () => {
  const processor = sns.createProcessor<string, string>(
    (value) => document(value),
    () => Promise.resolve(report(false)),
  );

  await assertRejects(
    () => processor({ Records: [{ Sns: "failed" }] }),
    Error,
    "Hooksmith failed to process an SNS notification.",
  );
});

function document<TData>(data: TData): EventDocument<TData> {
  return {
    type: "test.event",
    timestamp: "2026-09-03T00:00:00Z",
    source: { kind: "test" },
    data,
  };
}

function report(success: boolean): RunReport {
  return {
    mode: "run",
    event: {
      type: "test.event",
      timestamp: "2026-09-03T00:00:00Z",
      source: { kind: "test" },
    },
    results: [],
    success,
    outcome: "matched",
  };
}
