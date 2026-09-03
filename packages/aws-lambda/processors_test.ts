import { assertEquals, assertRejects } from "@std/assert";
import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";
import * as sns from "./sns.ts";
import * as sqs from "./sqs.ts";

Deno.test("SQS handler returns failed item identifiers", async () => {
  const handler = sqs.createHandler<{ fail?: boolean }>(
    (record) => {
      if (record.body === "throw") {
        throw new Error("bad record");
      }
      return document({ fail: record.body === "fail" });
    },
    (event) => Promise.resolve(report(event.data.fail !== true)),
  );

  const result = await handler({
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

Deno.test("SNS handler processes every notification", async () => {
  const processed: string[] = [];
  const handler = sns.createHandler<string>(
    (notification) => document(notification.Message),
    (event) => {
      processed.push(event.data);
      return Promise.resolve(report(true));
    },
  );

  await handler({
    Records: [
      { Sns: notification("one", "message-1") },
      { Sns: notification("two", "message-2") },
    ],
  });

  assertEquals(processed, ["one", "two"]);
});

Deno.test("SNS handler rejects unsuccessful Hooksmith processing", async () => {
  const handler = sns.createHandler<string>(
    (value) => document(value.Message),
    () => Promise.resolve(report(false)),
  );

  await assertRejects(
    () =>
      handler({
        Records: [{ Sns: notification("failed", "message-1") }],
      }),
    Error,
    "Hooksmith failed to process an SNS notification.",
  );
});

function notification(message: string, messageId: string): sns.Notification {
  return {
    Type: "Notification",
    MessageId: messageId,
    TopicArn: "arn:aws:sns:eu-north-1:123:orders",
    Message: message,
    Timestamp: "2026-09-03T00:00:00Z",
  };
}

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
