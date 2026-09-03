import { assertEquals, assertRejects } from "@std/assert";
import type { TransformContext } from "@hooksmith/pipeline";
import type {
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import { lambda } from "./lambda.ts";

const context: TransformContext = {
  originalData: { orderId: "42" },
  log: {
    debug() {},
    info() {},
    warn() {},
    error() {},
  },
};

Deno.test("lambda transforms input through synchronous invocation", async () => {
  let command: InvokeCommand | undefined;
  const transformer = lambda<
    { orderId: string },
    { orderId: string; risk: string }
  >({
    functionName: "enrich-order",
    input: { Qualifier: "live" },
    client: {
      send(value) {
        command = value;
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
          Payload: new TextEncoder().encode(
            '{"orderId":"42","risk":"low"}',
          ),
        } satisfies InvokeCommandOutput);
      },
    },
  });

  const result = await transformer.transform({ orderId: "42" }, context);

  assertEquals(command?.input.FunctionName, "enrich-order");
  assertEquals(command?.input.InvocationType, "RequestResponse");
  assertEquals(command?.input.Qualifier, "live");
  assertEquals(
    new TextDecoder().decode(command?.input.Payload as Uint8Array),
    '{"orderId":"42"}',
  );
  assertEquals(result, { orderId: "42", risk: "low" });
});

Deno.test("lambda rejects function errors", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
          FunctionError: "Unhandled",
          Payload: new TextEncoder().encode('{"errorMessage":"boom"}'),
        } satisfies InvokeCommandOutput);
      },
    },
  });

  const error = await assertRejects(
    () => transformer.transform({}, context),
    Error,
    "Lambda enrich-order returned a function error: Unhandled.",
  );

  assertEquals(error.cause, '{"errorMessage":"boom"}');
});

Deno.test("lambda rejects missing response payloads", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
        } satisfies InvokeCommandOutput);
      },
    },
  });

  await assertRejects(
    () => transformer.transform({}, context),
    Error,
    "Lambda enrich-order returned no payload.",
  );
});

Deno.test("lambda rejects invalid JSON response payloads", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return Promise.resolve({
          $metadata: {},
          StatusCode: 200,
          Payload: new TextEncoder().encode("not-json"),
        } satisfies InvokeCommandOutput);
      },
    },
  });

  await assertRejects(
    () => transformer.transform({}, context),
    TypeError,
    "Lambda enrich-order returned an invalid JSON payload.",
  );
});

Deno.test("lambda rejects non-200 invocation status", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return Promise.resolve({
          $metadata: {},
          StatusCode: 500,
        } satisfies InvokeCommandOutput);
      },
    },
  });

  await assertRejects(
    () => transformer.transform({}, context),
    Error,
    "Lambda enrich-order returned status 500.",
  );
});
