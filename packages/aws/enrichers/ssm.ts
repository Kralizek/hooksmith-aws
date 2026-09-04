import type { Event, EventEnricher } from "@hooksmith/core";
import {
  GetParameterCommand,
  type GetParameterCommandInput,
  type GetParameterCommandOutput,
  SSMClient,
  type SSMClientConfig,
} from "@aws-sdk/client-ssm";
import type { AwsEnrichmentMap } from "../shared/enrichment.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

/** Minimal SSM client contract used for dependency injection. */
export interface SSMClientLike {
  send(command: GetParameterCommand): Promise<GetParameterCommandOutput>;
}

/** Options used to read an SSM parameter and map it to event enrichment. */
export interface GetParameterEnrichmentOptions<TEvent extends Event = Event> {
  name?: string;
  parameterName: ValueOrFactory<string, TEvent>;
  withDecryption?: ValueOrFactory<boolean, TEvent>;
  input?: ValueOrFactory<
    Omit<GetParameterCommandInput, "Name" | "WithDecryption">,
    TEvent
  >;
  map: AwsEnrichmentMap<TEvent, GetParameterCommandOutput>;
  client?: SSMClientLike;
  clientConfig?: SSMClientConfig;
}

/** Reads one SSM parameter and maps the AWS response to event enrichment. */
export function getParameterEnrichment<TEvent extends Event = Event>(
  options: GetParameterEnrichmentOptions<TEvent>,
): EventEnricher<TEvent> {
  const client = options.client ?? new SSMClient(options.clientConfig ?? {});

  return {
    name: options.name ?? "aws-ssm-get-parameter-enrichment",
    async enrich(event, context) {
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const parameterName = await resolve(
        options.parameterName,
        event,
        context,
      );
      const withDecryption = options.withDecryption === undefined
        ? undefined
        : await resolve(options.withDecryption, event, context);

      const response = await client.send(
        new GetParameterCommand({
          ...nativeInput,
          Name: parameterName,
          ...(withDecryption === undefined ? {} : { WithDecryption: withDecryption }),
        }),
      );

      return await options.map(event, response, context);
    },
  };
}
