import { assertEquals, assertRejects } from "@std/assert";
import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";
import * as eventbridge from "./eventbridge.ts";
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

Deno.test("SQS handler exposes record exceptions without changing batch response", async () => {
  const observed: Array<{ error: unknown; record: sqs.LambdaRecord }> = [];
  const handler = sqs.createHandler(
    () => {
      throw new Error("bad record");
    },
    () => Promise.resolve(report(true)),
    {
      onRecordError(error, record) {
        observed.push({ error, record });
      },
    },
  );

  const result = await handler({
    Records: [{ messageId: "broken", body: "throw" }],
  });

  assertEquals(result, {
    batchItemFailures: [{ itemIdentifier: "broken" }],
  });
  assertEquals(observed.length, 1);
  assertEquals((observed[0].error as Error).message, "bad record");
  assertEquals(observed[0].record.messageId, "broken");
});

Deno.test("SQS handler isolates record observer failures", async () => {
  const handler = sqs.createHandler(
    () => {
      throw new Error("bad record");
    },
    () => Promise.resolve(report(true)),
    {
      onRecordError() {
        throw new Error("observer failed");
      },
    },
  );

  const result = await handler({
    Records: [{ messageId: "broken", body: "throw" }],
  });

  assertEquals(result, {
    batchItemFailures: [{ itemIdentifier: "broken" }],
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

  const error = await assertRejects(
    () =>
      handler({
        Records: [{ Sns: notification("failed", "message-1") }],
      }),
    Error,
    "Hooksmith failed to process an SNS notification.",
  );

  assertEquals(error.cause, {
    messageId: "message-1",
    topicArn: "arn:aws:sns:eu-north-1:123:orders",
  });
});

Deno.test("SNS handler preserves notification context for thrown errors", async () => {
  const originalError = new Error("reader failed");
  const handler = sns.createHandler(
    () => {
      throw originalError;
    },
    () => Promise.resolve(report(true)),
  );

  const error = await assertRejects(
    () =>
      handler({
        Records: [{ Sns: notification("failed", "message-1") }],
      }),
    Error,
    "Hooksmith failed to process an SNS notification.",
  );

  assertEquals(error.cause, {
    messageId: "message-1",
    topicArn: "arn:aws:sns:eu-north-1:123:orders",
    error: originalError,
  });
});

Deno.test("EventBridge handler processes one event", async () => {
  const handler = eventbridge.createHandler<{ orderId: string }>(
    (event) => document(event.detail),
    () => Promise.resolve(report(true)),
  );

  const result = await handler(eventBridgeEvent({ orderId: "42" }));

  assertEquals(result.success, true);
});

Deno.test("EventBridge handler rejects unsuccessful Hooksmith processing", async () => {
  const handler = eventbridge.createHandler(
    (event) => document(event.detail),
    () => Promise.resolve(report(false)),
  );

  await assertRejects(
    () => handler(eventBridgeEvent({ orderId: "42" })),
    Error,
    "Hooksmith failed to process the EventBridge event.",
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

function eventBridgeEvent<TDetail>(
  detail: TDetail,
): eventbridge.LambdaEvent<TDetail> {
  return {
    version: "0",
    id: "event-1",
    "detail-type": "order.created",
    source: "com.example.orders",
    account: "123",
    time: "2026-09-03T00:00:00Z",
    region: "eu-north-1",
    resources: [],
    detail,
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
