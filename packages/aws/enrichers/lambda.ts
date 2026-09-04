import type { Context, Event, EventEnricher } from "@hooksmith/core";
import {
  InvokeCommand,
  type InvokeCommandInput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import type { AwsEnrichmentMap } from "../shared/enrichment.ts";
import { parsePayload, stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";
import type { LambdaClientLike } from "../listeners/lambda.ts";

/** Options used to synchronously invoke Lambda and map its response to event enrichment. */
export interface InvokeLambdaEnrichmentOptions<
  TEvent extends Event = Event,
  TResponse = unknown,
> {
  name?: string;
  functionName: ValueOrFactory<string, TEvent>;
  payload?: ValueOrFactory<unknown, TEvent>;
  input?: ValueOrFactory<
    Omit<InvokeCommandInput, "FunctionName" | "Payload" | "InvocationType">,
    TEvent
  >;
  map: AwsEnrichmentMap<TEvent, TResponse>;
  client?: LambdaClientLike;
  clientConfig?: LambdaClientConfig;
}

/** Synchronously invokes Lambda and maps the returned payload to event enrichment. */
export function invokeLambdaEnrichment<
  TEvent extends Event = Event,
  TResponse = unknown,
>(
  options: InvokeLambdaEnrichmentOptions<TEvent, TResponse>,
): EventEnricher<TEvent> {
  const client = options.client ?? new LambdaClient(options.clientConfig ?? {});
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    name: options.name ?? "aws-lambda-invoke-enrichment",
    async enrich(event, context) {
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const functionName = await resolve(options.functionName, event, context);
      const payload = options.payload === undefined
        ? event.data
        : await resolve(options.payload, event, context);

      const response = await client.send(
        new InvokeCommand({
          ...nativeInput,
          FunctionName: functionName,
          Payload: encoder.encode(stringifyPayload(payload)),
          InvocationType: "RequestResponse",
        }),
      );

      if (response.FunctionError !== undefined) {
        throw new Error(
          `Lambda ${functionName} returned a function error: ${response.FunctionError}.`,
        );
      }
      if (response.StatusCode !== 200) {
        throw new Error(
          `Lambda ${functionName} synchronous invocation returned status ${response.StatusCode ?? "unknown"}.`,
        );
      }

      const decoded = response.Payload === undefined
        ? undefined
        : parsePayload(decoder.decode(response.Payload));

      return await options.map(
        event,
        decoded as TResponse,
        context as Context,
      );
    },
  };
}
