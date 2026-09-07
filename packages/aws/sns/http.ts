/**
 * Amazon SNS HTTP ingress support for Hooksmith.
 *
 * @module
 */

import type { EventDocument } from "@hooksmith/core";
import type { HttpIngressContext } from "@hooksmith/core/ingress";
import MessageValidator from "sns-validator";
import { fromSns, type SnsNotification } from "../adapters/sns.ts";

/** Maps a signed Amazon SNS HTTP delivery into a Hooksmith event document. */
export async function fromSnsHttp<TData = unknown>(
  context: HttpIngressContext,
): Promise<EventDocument<TData>> {
  const notification = JSON.parse(
    new TextDecoder().decode(context.request.body),
  ) as SnsNotification;

  await validateSnsMessage(notification);
  return fromSns<TData>(notification);
}

function validateSnsMessage(notification: SnsNotification): Promise<void> {
  const validator = new MessageValidator();
  return new Promise((resolve, reject) => {
    validator.validate(notification, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
