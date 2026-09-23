import type { Config, Context, Event } from "@hooksmith/core";
import { invokeLambdaFunction } from "@hooksmith/aws/lambda";
import { fromSqs } from "@hooksmith/aws/sqs";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler } from "@hooksmith/aws-lambda/sqs";
import {
  createConsoleLogWriter,
  createLoggerFactory,
  createRuntime,
} from "@hooksmith/runtime";

interface Order {
  orderId: string;
}

const config: Config<Event<Order>> = {
  routes: [
    {
      name: "route-tenant-message",
      listeners: [
        invokeLambdaFunction<Event<Order>>({
          functionName: (event) => resolveTarget(resolveTenantId(event)),
          tenantId: resolveTenantId,
          payload: (event) => event.data,
        }),
      ],
    },
  ],
};

const context: Context = {
  logger: createLoggerFactory({ write: createConsoleLogWriter() }),
};

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(fromSqs<Order>, processor, context);

function resolveTenantId(event: Event<Order>): string {
  const attributeTenant = event.metadata?.tenantId;
  if (typeof attributeTenant === "string" && attributeTenant.length > 0) {
    return attributeTenant;
  }

  const sqs = event.metadata?.sqs as
    | { attributes?: Record<string, string> }
    | undefined;
  const messageGroupId = sqs?.attributes?.MessageGroupId;
  if (messageGroupId !== undefined && messageGroupId.length > 0) {
    return messageGroupId;
  }

  throw new Error("Unable to resolve tenant ID for SQS message.");
}

function resolveTarget(tenantId: string): string {
  const targets = new Map<string, string>([
    ["tenant-a", "orders-processor-a"],
    ["tenant-b", "orders-processor-b"],
  ]);

  const functionName = targets.get(tenantId);
  if (functionName === undefined) {
    throw new Error(`No downstream Lambda configured for tenant ${tenantId}.`);
  }

  return functionName;
}
