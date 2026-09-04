import type { Event, EventEnricher } from "@hooksmith/core";
import {
  GetCallerIdentityCommand,
  type GetCallerIdentityCommandInput,
  type GetCallerIdentityCommandOutput,
  STSClient,
  type STSClientConfig,
} from "@aws-sdk/client-sts";
import type { AwsEnrichmentMap } from "../shared/enrichment.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

/** Minimal STS client contract used for dependency injection. */
export interface STSClientLike {
  send(command: GetCallerIdentityCommand): Promise<GetCallerIdentityCommandOutput>;
}

/** Options used to resolve STS caller identity and map it to event enrichment. */
export interface GetCallerIdentityEnrichmentOptions<
  TEvent extends Event = Event,
> {
  name?: string;
  input?: ValueOrFactory<GetCallerIdentityCommandInput, TEvent>;
  map: AwsEnrichmentMap<TEvent, GetCallerIdentityCommandOutput>;
  client?: STSClientLike;
  clientConfig?: STSClientConfig;
}

/** Resolves the current AWS caller identity and maps it to event enrichment. */
export function getCallerIdentityEnrichment<TEvent extends Event = Event>(
  options: GetCallerIdentityEnrichmentOptions<TEvent>,
): EventEnricher<TEvent> {
  const client = options.client ?? new STSClient(options.clientConfig ?? {});

  return {
    name: options.name ?? "aws-sts-get-caller-identity-enrichment",
    async enrich(event, context) {
      const input = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const response = await client.send(new GetCallerIdentityCommand(input));
      return await options.map(event, response, context);
    },
  };
}
