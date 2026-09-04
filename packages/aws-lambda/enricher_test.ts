import { assertEquals } from "@std/assert";
import type { Context, Event } from "@hooksmith/core";
import { lambdaEnvironmentEnrichment } from "./enricher.ts";

const context: Context = {
  log: {
    debug() {},
    info() {},
    warn() {},
    error() {},
  },
};

const event: Event = {
  type: "test",
  timestamp: Temporal.Instant.from("2026-09-04T12:00:00Z"),
  source: { kind: "test" },
  data: {},
};

Deno.test("lambdaEnvironmentEnrichment exposes Lambda environment metadata", async () => {
  const previousRegion = Deno.env.get("AWS_REGION");
  const previousName = Deno.env.get("AWS_LAMBDA_FUNCTION_NAME");
  const previousVersion = Deno.env.get("AWS_LAMBDA_FUNCTION_VERSION");
  const previousMemory = Deno.env.get("AWS_LAMBDA_FUNCTION_MEMORY_SIZE");

  Deno.env.set("AWS_REGION", "eu-north-1");
  Deno.env.set("AWS_LAMBDA_FUNCTION_NAME", "hooksmith-handler");
  Deno.env.set("AWS_LAMBDA_FUNCTION_VERSION", "42");
  Deno.env.set("AWS_LAMBDA_FUNCTION_MEMORY_SIZE", "512");

  try {
    const enricher = lambdaEnvironmentEnrichment();
    assertEquals(await enricher.enrich(event, context), {
      metadata: {
        aws: {
          region: "eu-north-1",
          lambda: {
            executionEnvironment: Deno.env.get("AWS_EXECUTION_ENV"),
            functionName: "hooksmith-handler",
            functionVersion: "42",
            functionMemorySize: 512,
            logGroupName: Deno.env.get("AWS_LAMBDA_LOG_GROUP_NAME"),
            logStreamName: Deno.env.get("AWS_LAMBDA_LOG_STREAM_NAME"),
            xrayTraceHeader: Deno.env.get("_X_AMZN_TRACE_ID"),
          },
        },
      },
    });
  } finally {
    restore("AWS_REGION", previousRegion);
    restore("AWS_LAMBDA_FUNCTION_NAME", previousName);
    restore("AWS_LAMBDA_FUNCTION_VERSION", previousVersion);
    restore("AWS_LAMBDA_FUNCTION_MEMORY_SIZE", previousMemory);
  }
});

Deno.test("lambdaEnvironmentEnrichment supports custom mapping", async () => {
  const previousRegion = Deno.env.get("AWS_REGION");
  Deno.env.set("AWS_REGION", "eu-north-1");

  try {
    const enricher = lambdaEnvironmentEnrichment({
      map: (_event, environment) => ({
        metadata: { region: environment.region },
      }),
    });

    assertEquals(await enricher.enrich(event, context), {
      metadata: { region: "eu-north-1" },
    });
  } finally {
    restore("AWS_REGION", previousRegion);
  }
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    Deno.env.delete(name);
  } else {
    Deno.env.set(name, value);
  }
}
