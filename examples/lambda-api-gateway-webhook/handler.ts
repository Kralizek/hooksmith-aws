import type { Config, Context, EventDocument } from "@hooksmith/core";
import type { HttpIngressMapper } from "@hooksmith/core/ingress";
import { createProcessor } from "@hooksmith/aws-lambda";
import { createApiGatewayHandler } from "@hooksmith/aws-lambda/api-gateway";
import {
  createConsoleLogWriter,
  createLoggerFactory,
  createRuntime,
} from "@hooksmith/runtime";

interface WebhookPayload {
  event: string;
  id: string;
  data: unknown;
}

const config: Config = {
  routes: [
    {
      name: "process-webhook",
      listeners: [
        {
          name: "log-webhook",
          run(event) {
            console.log(event.data);
            return { success: true };
          },
        },
      ],
    },
  ],
};

const context: Context = {
  logger: createLoggerFactory({ write: createConsoleLogWriter() }),
};

const readWebhook: HttpIngressMapper = ({ request }): EventDocument => {
  const payload = JSON.parse(
    new TextDecoder().decode(request.body),
  ) as WebhookPayload;

  return {
    type: payload.event,
    timestamp: new Date().toISOString(),
    source: {
      kind: "webhook",
      id: payload.id,
    },
    metadata: {
      method: request.method,
      url: request.url,
    },
    data: payload.data,
  };
};

const processor = createProcessor(createRuntime(config, context));

export const handler = createApiGatewayHandler(processor, {
  ingressMapper: readWebhook,
});
