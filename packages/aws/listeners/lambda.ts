import type { Context, Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  InvokeCommand,
  type InvokeCommandInput,
  type InvokeCommandOutput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import { stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

/** Minimal Lambda client contract used for dependency injection. */
export interface LambdaClientLike {
  send(command: InvokeCommand): Promise<InvokeCommandOutput>;
}

/** Event-aware Lambda payload selector. */
export type LambdaPayloadFactory<TEvent extends Event = Event> = (
  event: TEvent,
  context: Context,
) => unknown | Promise<unknown>;

/** Static Lambda payload values accepted without a selector callback. */
export type StaticLambdaPayload =
  | string
  | number
  | boolean
  | null
  | object;

/** Options used to invoke a Lambda function asynchronously from a Hooksmith event. */
export interface InvokeLambdaFunctionOptions<TEvent extends Event = Event> {
  functionName: ValueOrFactory<string, TEvent>;
  tenantId?: ValueOrFactory<string, TEvent>;
  payload?: StaticLambdaPayload | LambdaPayloadFactory<TEvent>;
  input?: ValueOrFactory<
    Omit<
      InvokeCommandInput,
      "FunctionName" | "Payload" | "InvocationType" | "TenantId"
    >,
    TEvent
  >;
  client?: LambdaClientLike;
  clientConfig?: LambdaClientConfig;
}

export function invokeLambdaFunction<TEvent extends Event = Event>(
  options: InvokeLambdaFunctionOptions<TEvent>,
): Listener<TEvent> {
  const client = options.client ?? new LambdaClient(options.clientConfig ?? {});
  const encoder = new TextEncoder();

  return {
    name: "aws-lambda-invoke",
    async run(event, context): Promise<ListenerResult> {
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, event, context);
      const functionName = await resolve(options.functionName, event, context);
      const tenantId = options.tenantId === undefined
        ? undefined
        : await resolve(options.tenantId, event, context);
      const payload = options.payload === undefined
        ? event.data
        : typeof options.payload === "function"
        ? await options.payload(event, context)
        : options.payload;

      const response = await client.send(
        new InvokeCommand({
          ...nativeInput,
          FunctionName: functionName,
          Payload: encoder.encode(stringifyPayload(payload)),
          InvocationType: "Event",
          TenantId: tenantId,
        }),
      );
      const statusCode = response.StatusCode;
      const success = statusCode === 202;

      return {
        success,
        message: success
          ? `Lambda ${functionName} invoked asynchronously.`
          : `Lambda ${functionName} asynchronous invocation failed.`,
        data: {
          statusCode,
          requestId: response.$metadata.requestId,
        },
      };
    },
  };
}
