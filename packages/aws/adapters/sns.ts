import type { EventDocument } from "@hooksmith/core";
import { parseEventDocument, parsePayload } from "../shared/payload.ts";

export interface SnsNotification {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  UnsubscribeURL?: string;
  MessageAttributes?: Record<string, unknown>;
}

export function fromSns<TData = unknown>(
  notification: SnsNotification,
): EventDocument<TData> {
  assertReservedMetadataKeyAvailable(notification.MessageAttributes, "sns");

  const sns = compact({
    notificationType: notification.Type,
    subject: notification.Subject,
    signatureVersion: notification.SignatureVersion,
    signature: notification.Signature,
    signingCertUrl: notification.SigningCertURL,
    unsubscribeUrl: notification.UnsubscribeURL,
  });

  return {
    type: "aws.sns.notification",
    timestamp: Temporal.Instant.from(notification.Timestamp).toString(),
    source: {
      kind: "aws.sns",
      id: notification.TopicArn,
    },
    subject: {
      kind: "aws.sns.message",
      id: notification.MessageId,
    },
    metadata: compact({
      ...readMessageAttributes(notification.MessageAttributes),
      sns,
    }),
    data: parsePayload(notification.Message) as TData,
  };
}

export function fromSnsRaw<TData = unknown>(
  payload: unknown,
): EventDocument<TData> {
  return parseEventDocument<TData>(payload);
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
  return value.Value ?? attribute;
}

function assertReservedMetadataKeyAvailable(
  attributes: Record<string, unknown> | undefined,
  key: string,
): void {
  if (attributes !== undefined && key in attributes) {
    throw new Error(
      `SNS message attribute "${key}" conflicts with reserved Hooksmith metadata key "${key}".`,
    );
  }
}

function compact(
  values: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(values).filter(([, value]) =>
    value !== undefined
  );
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}
