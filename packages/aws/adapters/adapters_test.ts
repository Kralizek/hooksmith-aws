import { assertEquals, assertThrows } from "@std/assert";
import { fromEventBridge } from "./eventbridge.ts";
import { fromSns, fromSnsRaw } from "./sns.ts";
import { fromSqs, fromSqsRaw } from "./sqs.ts";

Deno.test("fromSqs maps envelope metadata and body data", () => {
  const event = fromSqs({
    messageId: "message-1",
    body: '{"orderId":"42"}',
    receiptHandle: "receipt-1",
    eventSourceARN: "arn:aws:sqs:eu-north-1:123:orders",
    awsRegion: "eu-north-1",
    attributes: { SentTimestamp: "1788390000000" },
    messageAttributes: {
      correlationId: {
        dataType: "String",
        stringValue: "correlation-1",
      },
    },
  });

  assertEquals(event.type, "aws.sqs.message");
  assertEquals(event.source.id, "arn:aws:sqs:eu-north-1:123:orders");
  assertEquals(event.subject?.id, "message-1");
  assertEquals(event.data, { orderId: "42" });
  assertEquals(event.metadata?.correlationId, "correlation-1");
  assertEquals(event.metadata?.sqs, {
    receiptHandle: "receipt-1",
    attributes: { SentTimestamp: "1788390000000" },
    awsRegion: "eu-north-1",
  });
});

Deno.test("fromSqs rejects reserved metadata collisions", () => {
  assertThrows(
    () =>
      fromSqs({
        messageId: "message-1",
        body: "{}",
        messageAttributes: { sqs: { stringValue: "custom" } },
      }),
    Error,
    'SQS message attribute "sqs" conflicts with reserved Hooksmith metadata key "sqs".',
  );
});

Deno.test("fromSqs falls back when SentTimestamp is invalid", () => {
  const event = fromSqs({
    messageId: "message-invalid-timestamp",
    body: "{}",
    attributes: { SentTimestamp: "not-a-number" },
  });

  assertEquals(
    Temporal.Instant.from(event.timestamp).toString(),
    event.timestamp,
  );
});

Deno.test("fromSqsRaw expects the body to be a Hooksmith event", () => {
  const event = fromSqsRaw({
    body: JSON.stringify({
      type: "order.created",
      timestamp: "2026-09-02T20:00:00Z",
      source: { kind: "orders", id: "checkout" },
      data: { orderId: "42" },
    }),
  });

  assertEquals(event.type, "order.created");
  assertEquals(event.data, { orderId: "42" });
});

Deno.test("fromSns promotes sender metadata and namespaces envelope metadata", () => {
  const event = fromSns({
    Type: "Notification",
    MessageId: "message-2",
    TopicArn: "arn:aws:sns:eu-north-1:123:orders",
    Subject: "Order created",
    Message: "hello",
    Timestamp: "2026-09-02T20:00:00Z",
    MessageAttributes: {
      correlationId: {
        Type: "String",
        Value: "correlation-2",
      },
    },
  });

  assertEquals(event.type, "aws.sns.notification");
  assertEquals(event.source.id, "arn:aws:sns:eu-north-1:123:orders");
  assertEquals(event.subject?.id, "message-2");
  assertEquals(event.data, "hello");
  assertEquals(event.metadata?.correlationId, "correlation-2");
  assertEquals(event.metadata?.sns, {
    notificationType: "Notification",
    subject: "Order created",
  });
});

Deno.test("fromSns rejects reserved metadata collisions", () => {
  assertThrows(
    () =>
      fromSns({
        Type: "Notification",
        MessageId: "message-2",
        TopicArn: "arn:aws:sns:eu-north-1:123:orders",
        Message: "{}",
        Timestamp: "2026-09-02T20:00:00Z",
        MessageAttributes: { sns: { Type: "String", Value: "custom" } },
      }),
    Error,
    'SNS message attribute "sns" conflicts with reserved Hooksmith metadata key "sns".',
  );
});

Deno.test("fromSnsRaw expects a Hooksmith event", () => {
  const event = fromSnsRaw({
    type: "order.created",
    timestamp: "2026-09-02T20:00:00Z",
    source: { kind: "orders" },
    data: { orderId: "42" },
  });

  assertEquals(event.type, "order.created");
});

Deno.test("raw adapters reject arbitrary payloads", () => {
  assertThrows(() => fromSnsRaw({ message: "not an event" }));
});

Deno.test("fromEventBridge uses detail as event data", () => {
  const event = fromEventBridge({
    version: "0",
    id: "event-1",
    "detail-type": "order.created",
    source: "com.example.orders",
    account: "123",
    time: "2026-09-02T20:00:00Z",
    region: "eu-north-1",
    resources: [],
    detail: { orderId: "42" },
  });

  assertEquals(event.type, "order.created");
  assertEquals(event.source, {
    kind: "aws.eventbridge",
    id: "com.example.orders",
  });
  assertEquals(event.data, { orderId: "42" });
});
