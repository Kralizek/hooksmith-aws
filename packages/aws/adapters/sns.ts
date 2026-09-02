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
      notificationType: notification.Type,
      subject: notification.Subject,
      signatureVersion: notification.SignatureVersion,
      signature: notification.Signature,
      signingCertUrl: notification.SigningCertURL,
      unsubscribeUrl: notification.UnsubscribeURL,
      messageAttributes: notification.MessageAttributes,
    }),
    data: parsePayload(notification.Message) as TData,
  };
}

export function fromSnsRaw<TData = unknown>(
  payload: unknown,
): EventDocument<TData> {
  return parseEventDocument<TData>(payload);
}

function compact(
  values: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(values).filter(([, value]) =>
    value !== undefined
  );
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}
