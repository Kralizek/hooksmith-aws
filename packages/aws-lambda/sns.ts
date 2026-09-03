import type { RunReport } from "@hooksmith/runtime";
import type { EventProcessor, EventReader, LambdaHandler } from "./types.ts";

/** SNS notification payload contained in an AWS Lambda record. */
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

/** One SNS record contained in an AWS Lambda event. */
export interface LambdaRecord {
  Sns: Notification;
}

/** AWS Lambda SNS event containing one or more notification records. */
export interface LambdaEvent {
  Records: LambdaRecord[];
}

export function createHandler<TData = unknown>(
  read: EventReader<Notification, TData>,
  processor: EventProcessor<TData>,
): LambdaHandler<LambdaEvent, void> {
  return async (event) => {
    for (const record of event.Records) {
      let report: RunReport;
      try {
        const document = await read(record.Sns);
        report = await processor(document);
      } catch (error) {
        throw new Error("Hooksmith failed to process an SNS notification.", {
          cause: {
            messageId: record.Sns.MessageId,
            topicArn: record.Sns.TopicArn,
            error,
          },
        });
      }

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
