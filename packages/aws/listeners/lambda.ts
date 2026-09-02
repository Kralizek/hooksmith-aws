import type { Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  InvokeCommand,
  type InvokeCommandInput,
  type InvokeCommandOutput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

export interface LambdaClientLike {
  send(command: InvokeCommand): Promise<InvokeCommandOutput>;
}

export interface InvokeLambdaFunctionOptions<TEvent extends Event = Event> {
  functionName: ValueOrFactory<string, TEvent>;
  payload?: ValueOrFactory<unknown, TEvent>;
  input?: ValueOrFactory<
    Omit<InvokeCommandInput, "FunctionName" | "Payload">,
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

      const response = await client.send(new InvokeCommand({
        ...nativeInput,
        FunctionName: functionName,
        Payload: encoder.encode(JSON.stringify(payload)),
      }));
      const statusCode = response.StatusCode;
      const success = response.FunctionError === undefined &&
        statusCode !== undefined && statusCode >= 200 && statusCode < 300;

      return {
        success,
        message: success
          ? `Lambda ${functionName} invoked.`
          : `Lambda ${functionName} invocation failed.`,
        data: {
          statusCode,
          functionError: response.FunctionError,
          executedVersion: response.ExecutedVersion,
          logResult: response.LogResult,
        },
      };
    },
  };
}
