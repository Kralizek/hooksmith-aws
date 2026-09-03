import type { EventDocument } from "@hooksmith/core";
import { parseEventDocument, parsePayload } from "../shared/payload.ts";

export interface SqsMessage {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
  awsRegion?: string;
}

export function fromSqs<TData = unknown>(
  message: SqsMessage,
): EventDocument<TData> {
  assertReservedMetadataKeyAvailable(message.messageAttributes, "sqs");

  const timestamp = resolveTimestamp(message.attributes?.SentTimestamp);
  const sqs = compact({
    receiptHandle: message.receiptHandle,
    attributes: message.attributes,
    awsRegion: message.awsRegion,
  });

  return {
    type: "aws.sqs.message",
    timestamp,
    source: {
      kind: "aws.sqs",
      id: message.eventSourceARN,
    },
    subject: {
      kind: "aws.sqs.message",
      id: message.messageId,
    },
    metadata: compact({
      ...readMessageAttributes(message.messageAttributes),
      sqs,
    }),
    data: parsePayload(message.body) as TData,
  };
}

export function fromSqsRaw<TData = unknown>(
  message: Pick<SqsMessage, "body">,
): EventDocument<TData> {
  return parseEventDocument<TData>(message.body);
}

function readMessageAttributes(
  attributes: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (attributes === undefined) return {};

  return Object.fromEntries(
    Object.entries(attributes).map(([key, attribute]) => [
      key,
      readMessageAttribute(attribute),
    ]),
  );
}

function readMessageAttribute(attribute: unknown): unknown {
  if (attribute === null || typeof attribute !== "object") return attribute;

  const value = attribute as Record<string, unknown>;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.binaryValue !== undefined) return value.binaryValue;
  if (value.stringListValues !== undefined) return value.stringListValues;
  if (value.binaryListValues !== undefined) return value.binaryListValues;
  return attribute;
}

function assertReservedMetadataKeyAvailable(
  attributes: Record<string, unknown> | undefined,
  key: string,
): void {
  if (attributes !== undefined && key in attributes) {
    throw new Error(
      `SQS message attribute "${key}" conflicts with reserved Hooksmith metadata key "${key}".`,
    );
  }
}

function resolveTimestamp(sentTimestamp: string | undefined): string {
  if (sentTimestamp !== undefined) {
    const milliseconds = Number(sentTimestamp);
    if (Number.isFinite(milliseconds)) {
      try {
        return Temporal.Instant.fromEpochMilliseconds(milliseconds).toString();
      } catch {
        // Fall back to the receive time for invalid or out-of-range timestamps.
      }
    }
  }

  return Temporal.Now.instant().toString();
}

function compact(
  values: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(values).filter(([, value]) =>
    value !== undefined
  );
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}
