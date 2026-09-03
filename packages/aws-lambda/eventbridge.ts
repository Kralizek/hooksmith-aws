import type { RunReport } from "@hooksmith/runtime";
import type { EventProcessor, EventReader, LambdaHandler } from "./types.ts";

/** AWS EventBridge event shape accepted by the Lambda hosting adapter. */
export interface LambdaEvent<TDetail = unknown> {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: TDetail;
}

export function createHandler<
  TDetail = unknown,
  TData = TDetail,
>(
  read: EventReader<LambdaEvent<TDetail>, TData>,
  processor: EventProcessor<TData>,
): LambdaHandler<LambdaEvent<TDetail>, RunReport> {
  return async (event) => {
    const report = await processor(await read(event));
    if (!report.success) {
      throw new Error("Hooksmith failed to process the EventBridge event.");
    }

    return report;
  };
}
