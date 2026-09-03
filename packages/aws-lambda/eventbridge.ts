import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

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

export type EventReader<TData = unknown> = (
  event: LambdaEvent<TData>,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export function createHandler<TData = unknown>(
  read: EventReader<TData>,
  process: EventProcessor<TData>,
): (event: LambdaEvent<TData>) => Promise<RunReport> {
  return async (event) => {
    const report = await process(await read(event));
    if (!report.success) {
      throw new Error("Hooksmith failed to process the EventBridge event.");
    }

    return report;
  };
}
