import type { Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  InvokeCommand,
  type InvokeCommandInput,
  type InvokeCommandOutput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import { stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

export interface LambdaClientLike {
  send(command: InvokeCommand): Promise<InvokeCommandOutput>;
}

export interface InvokeLambdaFunctionOptions<TEvent extends Event = Event> {
  functionName: ValueOrFactory<string, TEvent>;
  payload?: ValueOrFactory<unknown, TEvent>;
  input?: ValueOrFactory<
    Omit<InvokeCommandInput, "FunctionName" | "Payload" | "InvocationType">,
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
      const payload = options.payload === undefined
        ? event.data
        : await resolve(options.payload, event, context);

      const response = await client.send(
        new InvokeCommand({
          ...nativeInput,
          FunctionName: functionName,
          Payload: encoder.encode(stringifyPayload(payload)),
          InvocationType: "Event",
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
