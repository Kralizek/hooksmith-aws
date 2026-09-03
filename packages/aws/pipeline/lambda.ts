import {
  InvokeCommand,
  type InvokeCommandInput,
  type InvokeCommandOutput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import type { Transformer } from "@hooksmith/pipeline";
import { stringifyPayload } from "../shared/payload.ts";

export interface LambdaClientLike {
  send(command: InvokeCommand): Promise<InvokeCommandOutput>;
}

export interface LambdaTransformerOptions {
  functionName: string;
  name?: string;
  input?: Omit<
    InvokeCommandInput,
    "FunctionName" | "Payload" | "InvocationType"
  >;
  client?: LambdaClientLike;
  clientConfig?: LambdaClientConfig;
}

/**
 * Transforms a pipeline value by synchronously invoking an AWS Lambda function.
 *
 * The input value is JSON-serialized into the Lambda payload and the Lambda
 * response payload must be valid JSON representing the output value.
 */
export function lambda<TInput, TOutput>(
  options: LambdaTransformerOptions,
): Transformer<TInput, TOutput> {
  const client = options.client ?? new LambdaClient(options.clientConfig ?? {});
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    name: options.name ?? `aws-lambda:${options.functionName}`,
    async transform(input): Promise<TOutput> {
      const response = await client.send(
        new InvokeCommand({
          ...options.input,
          FunctionName: options.functionName,
          InvocationType: "RequestResponse",
          Payload: encoder.encode(stringifyPayload(input)),
        }),
      );

      if (response.StatusCode !== 200) {
        throw new Error(
          `Lambda ${options.functionName} returned status ${response.StatusCode ?? "unknown"}.`,
        );
      }

      if (response.FunctionError !== undefined) {
        throw new Error(
          `Lambda ${options.functionName} returned a function error: ${response.FunctionError}.`,
          {
            cause: response.Payload === undefined
              ? undefined
              : decoder.decode(response.Payload),
          },
        );
      }

      if (response.Payload === undefined || response.Payload.length === 0) {
        throw new Error(
          `Lambda ${options.functionName} returned no payload.`,
        );
      }

      const payload = decoder.decode(response.Payload);
      try {
        return JSON.parse(payload) as TOutput;
      } catch (error) {
        throw new TypeError(
          `Lambda ${options.functionName} returned an invalid JSON payload.`,
          { cause: error },
        );
      }
    },
  };
}
