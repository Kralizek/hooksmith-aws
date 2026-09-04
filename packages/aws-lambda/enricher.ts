import type { Context, Event, EventEnricher, EventEnrichment } from "@hooksmith/core";

/** AWS Lambda execution-environment values exposed to enrichment mapping. */
export interface LambdaEnvironment {
  region?: string;
  executionEnvironment?: string;
  functionName?: string;
  functionVersion?: string;
  functionMemorySize?: number;
  logGroupName?: string;
  logStreamName?: string;
  xrayTraceHeader?: string;
}

/** Maps the current Lambda environment to Hooksmith event enrichment. */
export type LambdaEnvironmentMap<TEvent extends Event = Event> = (
  event: TEvent,
  environment: LambdaEnvironment,
  context: Context,
) => EventEnrichment | Promise<EventEnrichment>;

/** Options used to enrich events from the current AWS Lambda environment. */
export interface LambdaEnvironmentEnrichmentOptions<
  TEvent extends Event = Event,
> {
  name?: string;
  map?: LambdaEnvironmentMap<TEvent>;
}

/** Enriches events with metadata from the current AWS Lambda environment. */
export function lambdaEnvironmentEnrichment<TEvent extends Event = Event>(
  options: LambdaEnvironmentEnrichmentOptions<TEvent> = {},
): EventEnricher<TEvent> {
  const environment = readLambdaEnvironment();

  return {
    name: options.name ?? "aws-lambda-environment-enrichment",
    async enrich(event, context) {
      if (options.map !== undefined) {
        return await options.map(event, environment, context);
      }

      return {
        metadata: {
          aws: {
            region: environment.region,
            lambda: {
              executionEnvironment: environment.executionEnvironment,
              functionName: environment.functionName,
              functionVersion: environment.functionVersion,
              functionMemorySize: environment.functionMemorySize,
              logGroupName: environment.logGroupName,
              logStreamName: environment.logStreamName,
              xrayTraceHeader: environment.xrayTraceHeader,
            },
          },
        },
      };
    },
  };
}

function readLambdaEnvironment(): LambdaEnvironment {
  return {
    region: Deno.env.get("AWS_REGION"),
    executionEnvironment: Deno.env.get("AWS_EXECUTION_ENV"),
    functionName: Deno.env.get("AWS_LAMBDA_FUNCTION_NAME"),
    functionVersion: Deno.env.get("AWS_LAMBDA_FUNCTION_VERSION"),
    functionMemorySize: parseNumber(Deno.env.get("AWS_LAMBDA_FUNCTION_MEMORY_SIZE")),
    logGroupName: Deno.env.get("AWS_LAMBDA_LOG_GROUP_NAME"),
    logStreamName: Deno.env.get("AWS_LAMBDA_LOG_STREAM_NAME"),
    xrayTraceHeader: Deno.env.get("_X_AMZN_TRACE_ID"),
  };
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
