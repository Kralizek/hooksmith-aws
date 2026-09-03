import type { EventDocument } from "@hooksmith/core";
import type { Processor } from "./handler.ts";

export interface Notification {
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

export interface LambdaRecord {
  Sns: Notification;
}

export type RecordReader<TData = unknown> = (
  notification: Notification,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export interface LambdaEvent {
  Records: LambdaRecord[];
}

export function createHandler<TData = unknown>(
  read: RecordReader<TData>,
  processor: Processor<TData>,
): (event: LambdaEvent) => Promise<void> {
  return async (event) => {
    for (const record of event.Records) {
      const document = await read(record.Sns);
      const report = await processor(document);
      if (!report.success) {
        throw new Error("Hooksmith failed to process an SNS notification.");
      }
    }
  };
}
