import { assertEquals, assertRejects } from "@std/assert";
import type { Context, Event } from "@hooksmith/core";
import type {
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import type { GetParameterCommand } from "@aws-sdk/client-ssm";
import type { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { invokeLambdaEnrichment } from "./lambda.ts";
import { getParameterEnrichment } from "./ssm.ts";
import { getCallerIdentityEnrichment } from "./sts.ts";

const context: Context = {
  log: {
    debug() {},
    info() {},
    warn() {},
    error() {},
  },
};

const event: Event<{ tenantId: string }> = {
  type: "tenant.updated",
  timestamp: Temporal.Instant.from("2026-09-04T12:00:00Z"),
  source: { kind: "test" },
  data: { tenantId: "tenant-42" },
};

Deno.test("invokeLambdaEnrichment invokes synchronously and maps the payload", async () => {
  const enricher = invokeLambdaEnrichment<
    Event<{ tenantId: string }>,
    { plan: string }
  >({
    functionName: "resolve-tenant",
    payload: (currentEvent: Event<{ tenantId: string }>) => ({
      tenantId: currentEvent.data.tenantId,
    }),
    client: {
      send(command: InvokeCommand) {
        assertEquals(command.input.FunctionName, "resolve-tenant");
        assertEquals(command.input.InvocationType, "RequestResponse");
        assertEquals(
          new TextDecoder().decode(command.input.Payload as Uint8Array),
          JSON.stringify({ tenantId: "tenant-42" }),
        );
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({ plan: "pro" })),
        } as InvokeCommandOutput);
      },
    },
    map: (_event, response) => ({
      metadata: { tenantPlan: response.plan },
    }),
  });

  assertEquals(await enricher.enrich(event, context), {
    metadata: { tenantPlan: "pro" },
  });
});

Deno.test("invokeLambdaEnrichment rejects Lambda function errors", async () => {
  const enricher = invokeLambdaEnrichment({
    functionName: "broken-function",
    client: {
      send() {
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
          FunctionError: "Unhandled",
        });
      },
    },
    map: () => ({ metadata: {} }),
  });

  await assertRejects(
    async () => await enricher.enrich(event, context),
    Error,
    "Lambda broken-function returned a function error: Unhandled.",
  );
});

Deno.test("getParameterEnrichment resolves request values and maps the response", async () => {
  const enricher = getParameterEnrichment<Event<{ tenantId: string }>>({
    parameterName: ({ data }) => `/tenants/${data.tenantId}/plan`,
    withDecryption: true,
    client: {
      send(command: GetParameterCommand) {
        assertEquals(command.input.Name, "/tenants/tenant-42/plan");
        assertEquals(command.input.WithDecryption, true);
        return Promise.resolve({
          $metadata: {},
          Parameter: { Value: "pro" },
        });
      },
    },
    map: (_event, response) => ({
      metadata: { tenantPlan: response.Parameter?.Value },
    }),
  });

  assertEquals(await enricher.enrich(event, context), {
    metadata: { tenantPlan: "pro" },
  });
});

Deno.test("getCallerIdentityEnrichment maps STS identity", async () => {
  const enricher = getCallerIdentityEnrichment({
    client: {
      send(command: GetCallerIdentityCommand) {
        assertEquals(command.input, {});
        return Promise.resolve({
          $metadata: {},
          Account: "123456789012",
          Arn: "arn:aws:iam::123456789012:user/example",
          UserId: "AIDAEXAMPLE",
        });
      },
    },
    map: (_event, response) => ({
      metadata: {
        awsAccount: response.Account,
        awsArn: response.Arn,
        awsUserId: response.UserId,
      },
    }),
  });

  assertEquals(await enricher.enrich(event, context), {
    metadata: {
      awsAccount: "123456789012",
      awsArn: "arn:aws:iam::123456789012:user/example",
      awsUserId: "AIDAEXAMPLE",
    },
  });
});
