/**
 * AWS Lambda pipeline integrations for Hooksmith.
 *
 * @module
 */

import {
  InvokeCommand,
  type InvokeCommandInput,
  type InvokeCommandOutput,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import type { Transformer, TransformContext } from "@hooksmith/pipeline";

/** Minimal Lambda client contract used by the pipeline transformer. */
export interface LambdaClientLike {
  send(command: InvokeCommand): Promise<InvokeCommandOutput>;
}

/** Fixed value or pipeline-input-aware factory. */
export type PipelineValueOrFactory<TValue, TInput> =
  | TValue
  | ((
    input: TInput,
    context: TransformContext,
  ) => TValue | Promise<TValue>);

/** Options used to synchronously invoke a Lambda function as a pipeline stage. */
export interface LambdaTransformerOptions<TInput> {
  functionName: PipelineValueOrFactory<string, TInput>;
  tenantId?: PipelineValueOrFactory<string, TInput>;
  payload?: PipelineValueOrFactory<unknown, TInput>;
  name?: string;
  input?: PipelineValueOrFactory<
    Omit<
      InvokeCommandInput,
      "FunctionName" | "Payload" | "InvocationType" | "TenantId"
    >,
    TInput
  >;
  client?: LambdaClientLike;
  clientConfig?: LambdaClientConfig;
}

/**
 * Transforms a pipeline value by synchronously invoking an AWS Lambda function.
 *
 * The selected payload is JSON-serialized into the Lambda request and the
 * Lambda response payload must be valid JSON representing the output value.
 */
export function lambda<TInput, TOutput>(
  options: LambdaTransformerOptions<TInput>,
): Transformer<TInput, TOutput> {
  const client = options.client ?? new LambdaClient(options.clientConfig ?? {});
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const defaultName = typeof options.functionName === "string"
    ? `aws-lambda:${options.functionName}`
    : "aws-lambda";

  return {
    name: options.name ?? defaultName,
    async transform(input, context): Promise<TOutput> {
      const functionName = await resolve(options.functionName, input, context);
      const tenantId = options.tenantId === undefined
        ? undefined
        : await resolve(options.tenantId, input, context);
      const nativeInput = options.input === undefined
        ? {}
        : await resolve(options.input, input, context);
      const selectedPayload = options.payload === undefined
        ? input
        : await resolve(options.payload, input, context);

      let serialized: string | undefined;
      try {
        serialized = JSON.stringify(selectedPayload);
      } catch (error) {
        throw new TypeError(
          "Lambda transformer input must be JSON-serializable.",
          { cause: error },
        );
      }

      if (serialized === undefined) {
        throw new TypeError(
          "Lambda transformer input must be JSON-serializable.",
        );
      }

      const response = await client.send(
        new InvokeCommand({
          ...nativeInput,
          FunctionName: functionName,
          InvocationType: "RequestResponse",
          Payload: encoder.encode(serialized),
          TenantId: tenantId,
        }),
      );

      if (response.StatusCode !== 200) {
        throw new Error(
          `Lambda ${functionName} returned status ${
            response.StatusCode ?? "unknown"
          }.`,
        );
      }

      if (response.FunctionError !== undefined) {
        throw new Error(
          `Lambda ${functionName} returned a function error: ${response.FunctionError}.`,
          {
            cause: response.Payload === undefined
              ? undefined
              : decoder.decode(response.Payload),
          },
        );
      }

      if (response.Payload === undefined || response.Payload.length === 0) {
        throw new Error(
          `Lambda ${functionName} returned no payload.`,
        );
      }

      const payload = decoder.decode(response.Payload);
      try {
        return JSON.parse(payload) as TOutput;
      } catch (error) {
        throw new TypeError(
          `Lambda ${functionName} returned an invalid JSON payload.`,
          { cause: error },
        );
      }
    },
  };
}

async function resolve<TValue, TInput>(
  value: PipelineValueOrFactory<TValue, TInput>,
  input: TInput,
  context: TransformContext,
): Promise<TValue> {
  return typeof value === "function"
    ? await (
      value as (
        input: TInput,
        context: TransformContext,
      ) => TValue | Promise<TValue>
    )(input, context)
    : value;
}
