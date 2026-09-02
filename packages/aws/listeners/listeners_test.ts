import { assertEquals } from "@std/assert";
import type { Context, Event } from "@hooksmith/core";
import type {
  PutEventsCommand,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";
import type {
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import type { PublishCommand, PublishCommandOutput } from "@aws-sdk/client-sns";
import type {
  SendMessageCommand,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import { putEventBridgeEvent } from "./eventbridge.ts";
import { invokeLambdaFunction } from "./lambda.ts";
import { publishSnsMessage } from "./sns.ts";
import { sendSqsMessage } from "./sqs.ts";

const event: Event<{ orderId: string }> = {
  type: "order.created",
  timestamp: Temporal.Instant.from("2026-09-02T20:00:00Z"),
  source: { kind: "orders", id: "checkout" },
  data: { orderId: "42" },
};

const context: Context = {
  log: {
    debug() {},
    info() {},
    warn() {},
    error() {},
  },
};

Deno.test("sendSqsMessage sends event data by default", async () => {
  let command: SendMessageCommand | undefined;
  const listener = sendSqsMessage({
    queueUrl: "https://sqs.example/orders",
    client: {
      send(value) {
        command = value;
        return Promise.resolve(
          { MessageId: "message-1" } satisfies SendMessageCommandOutput,
        );
      },
    },
  });

  const result = await listener.run(event, context);

  assertEquals(command?.input.QueueUrl, "https://sqs.example/orders");
  assertEquals(command?.input.MessageBody, '{"orderId":"42"}');
  assertEquals(result.success, true);
});

Deno.test("publishSnsMessage sends event data by default", async () => {
  let command: PublishCommand | undefined;
  const listener = publishSnsMessage({
    topicArn: "arn:aws:sns:eu-north-1:123:orders",
    client: {
      send(value) {
        command = value;
        return Promise.resolve(
          { MessageId: "message-2" } satisfies PublishCommandOutput,
        );
      },
    },
  });

  await listener.run(event, context);

  assertEquals(command?.input.TopicArn, "arn:aws:sns:eu-north-1:123:orders");
  assertEquals(command?.input.Message, '{"orderId":"42"}');
});

Deno.test("putEventBridgeEvent derives source and detail type", async () => {
  let command: PutEventsCommand | undefined;
  const listener = putEventBridgeEvent({
    client: {
      send(value) {
        command = value;
        return Promise.resolve(
          {
            FailedEntryCount: 0,
            Entries: [{ EventId: "event-1" }],
          } satisfies PutEventsCommandOutput,
        );
      },
    },
  });

  const result = await listener.run(event, context);
  const entry = command?.input.Entries?.[0];

  assertEquals(entry?.Source, "checkout");
  assertEquals(entry?.DetailType, "order.created");
  assertEquals(entry?.Detail, '{"orderId":"42"}');
  assertEquals(result.success, true);
});

Deno.test("putEventBridgeEvent reports partial API failure", async () => {
  const listener = putEventBridgeEvent({
    client: {
      send(_value: PutEventsCommand) {
        return Promise.resolve(
          {
            FailedEntryCount: 1,
            Entries: [{ ErrorCode: "InternalFailure", ErrorMessage: "boom" }],
          } satisfies PutEventsCommandOutput,
        );
      },
    },
  });

  const result = await listener.run(event, context);

  assertEquals(result.success, false);
});

Deno.test("invokeLambdaFunction serializes event data", async () => {
  let command: InvokeCommand | undefined;
  const listener = invokeLambdaFunction({
    functionName: "process-order",
    client: {
      send(value) {
        command = value;
        return Promise.resolve(
          { StatusCode: 200 } satisfies InvokeCommandOutput,
        );
      },
    },
  });

  const result = await listener.run(event, context);

  assertEquals(command?.input.FunctionName, "process-order");
  assertEquals(
    new TextDecoder().decode(command?.input.Payload),
    '{"orderId":"42"}',
  );
  assertEquals(result.success, true);
});
