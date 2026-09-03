import type { Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  SendMessageCommand,
  type SendMessageCommandInput,
  type SendMessageCommandOutput,
  SQSClient,
  type SQSClientConfig,
} from "@aws-sdk/client-sqs";
import { stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

/** Minimal SQS client contract used for dependency injection. */
export interface SqsClientLike {
  send(command: SendMessageCommand): Promise<SendMessageCommandOutput>;
}

/** Options used to send an SQS message from a Hooksmith event. */
export interface SendSqsMessageOptions<TEvent extends Event = Event> {
  queueUrl: ValueOrFactory<string, TEvent>;
  body?: ValueOrFactory<unknown, TEvent>;
  input?: ValueOrFactory<
    Omit<SendMessageCommandInput, "QueueUrl" | "MessageBody">,
    TEvent
  >;
  client?: SqsClientLike;
  clientConfig?: SQSClientConfig;
}

export function sendSqsMessage<TEvent extends Event = Event>(
  options: SendSqsMessageOptions<TEvent>,
): Listener<TEvent> {
  const client = options.client ?? new SQSClient(options.clientConfig ?? {});

  return {
    name: "aws-sqs-send-message",
    async run(event, context): Promise<ListenerResult> {
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const queueUrl = await resolve(options.queueUrl, event, context);
      const body = options.body === undefined
        ? event.data
        : await resolve(options.body, event, context);

      const response = await client.send(
        new SendMessageCommand({
          ...nativeInput,
          QueueUrl: queueUrl,
          MessageBody: stringifyPayload(body),
        }),
      );

      return {
        success: true,
        message: response.MessageId === undefined
          ? "SQS message sent."
          : `SQS message ${response.MessageId} sent.`,
        data: {
          messageId: response.MessageId,
          sequenceNumber: response.SequenceNumber,
        },
      };
    },
  };
}
