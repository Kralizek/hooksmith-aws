import type {
  Config,
  Context,
  Event,
  EventDocument,
  Listener,
} from "@hooksmith/core";
import { fromSqs } from "@hooksmith/aws/sqs";
import { lambda } from "@hooksmith/aws/pipeline/lambda";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createHandler, type LambdaRecord } from "@hooksmith/aws-lambda/sqs";
import { pipe } from "@hooksmith/pipeline";
import {
  createConsoleLogWriter,
  createLoggerFactory,
  createRuntime,
} from "@hooksmith/runtime";

interface Order {
  orderId: string;
}

interface TenantRoute {
  tenantId: string;
  functionName: string;
  payload: Order;
}

const complete: Listener<Event<unknown>> = {
  name: "complete-tenant-route",
  run() {
    return { success: true };
  },
};

const config: Config<Event<TenantRoute>> = {
  routes: [
    {
      name: "route-tenant-message",
      listeners: [
        pipe(
          lambda<TenantRoute, unknown>({
            functionName: (route) => route.functionName,
            tenantId: (route) => route.tenantId,
            payload: (route) => route.payload,
          }),
          complete,
        ),
      ],
    },
  ],
};

const context: Context = {
  logger: createLoggerFactory({ write: createConsoleLogWriter() }),
};

const processor = createProcessor(createRuntime(config, context));

export const handler = createHandler(readTenantRoute, processor, context);

function readTenantRoute(record: LambdaRecord): EventDocument<TenantRoute> {
  const document = fromSqs<Order>(record);
  const tenantId = resolveTenantId(document);

  return {
    ...document,
    data: {
      tenantId,
      functionName: resolveTarget(tenantId),
      payload: document.data,
    },
  };
}

function resolveTenantId(document: EventDocument<Order>): string {
  const attributeTenant = document.metadata?.tenantId;
  if (typeof attributeTenant === "string" && attributeTenant.length > 0) {
    return attributeTenant;
  }

  const sqs = document.metadata?.sqs as
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
