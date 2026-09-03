import type { EventProcessor, EventReader, LambdaHandler } from "./types.ts";

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

export interface LambdaEvent {
  Records: LambdaRecord[];
}

export function createHandler<TData = unknown>(
  read: EventReader<Notification, TData>,
  processor: EventProcessor<TData>,
): LambdaHandler<LambdaEvent, void> {
  return async (event) => {
    for (const record of event.Records) {
      const document = await read(record.Sns);
      const report = await processor(document);
      if (!report.success) {
        throw new Error("Hooksmith failed to process an SNS notification.", {
          cause: {
            messageId: record.Sns.MessageId,
            topicArn: record.Sns.TopicArn,
          },
        });
      }
    }
  };
}
