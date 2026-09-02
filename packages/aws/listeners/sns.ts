import type { Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  PublishCommand,
  type PublishCommandInput,
  type PublishCommandOutput,
  SNSClient,
  type SNSClientConfig,
} from "@aws-sdk/client-sns";
import { stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

export interface SnsClientLike {
  send(command: PublishCommand): Promise<PublishCommandOutput>;
}

export interface PublishSnsMessageOptions<TEvent extends Event = Event> {
  topicArn: ValueOrFactory<string, TEvent>;
  message?: ValueOrFactory<unknown, TEvent>;
  input?: ValueOrFactory<
    Omit<PublishCommandInput, "TopicArn" | "Message">,
    TEvent
  >;
  client?: SnsClientLike;
  clientConfig?: SNSClientConfig;
}

export function publishSnsMessage<TEvent extends Event = Event>(
  options: PublishSnsMessageOptions<TEvent>,
): Listener<TEvent> {
  const client = options.client ?? new SNSClient(options.clientConfig ?? {});

  return {
    name: "aws-sns-publish",
    async run(event, context): Promise<ListenerResult> {
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const topicArn = await resolve(options.topicArn, event, context);
      const message = options.message === undefined
        ? event.data
        : await resolve(options.message, event, context);

      const response = await client.send(new PublishCommand({
        ...nativeInput,
        TopicArn: topicArn,
        Message: stringifyPayload(message),
      }));

      return {
        success: true,
        message: response.MessageId === undefined
          ? "SNS message published."
          : `SNS message ${response.MessageId} published.`,
        data: {
          messageId: response.MessageId,
          sequenceNumber: response.SequenceNumber,
        },
      };
    },
  };
}
