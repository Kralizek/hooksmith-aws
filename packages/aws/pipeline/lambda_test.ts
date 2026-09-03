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
        return response({
          StatusCode: 200,
          Payload: payload('{"orderId":"42","risk":"low"}'),
        });
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

Deno.test("lambda JSON-encodes string input", async () => {
  let command: InvokeCommand | undefined;
  const transformer = lambda<string, string>({
    functionName: "echo",
    client: {
      send(value) {
        command = value;
        return response({
          StatusCode: 200,
          Payload: payload('"foo"'),
        });
      },
    },
  });

  const result = await transformer.transform("foo", context);

  assertEquals(
    new TextDecoder().decode(command?.input.Payload as Uint8Array),
    '"foo"',
  );
  assertEquals(result, "foo");
});

Deno.test("lambda wraps JSON serialization errors", async () => {
  const transformer = lambda<bigint, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        throw new Error("Lambda should not be invoked");
      },
    },
  });

  const error = await assertRejects(
    () => Promise.resolve(transformer.transform(1n, context)),
    TypeError,
    "Lambda transformer input must be JSON-serializable.",
  );

  assertEquals(error.cause instanceof TypeError, true);
});

Deno.test("lambda rejects function errors", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return response({
          StatusCode: 200,
          FunctionError: "Unhandled",
          Payload: payload('{"errorMessage":"boom"}'),
        });
      },
    },
  });

  const error = await assertRejects(
    () => Promise.resolve(transformer.transform({}, context)),
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
        return response({ StatusCode: 200 });
      },
    },
  });

  await assertRejects(
    () => Promise.resolve(transformer.transform({}, context)),
    Error,
    "Lambda enrich-order returned no payload.",
  );
});

Deno.test("lambda rejects invalid JSON response payloads", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return response({
          StatusCode: 200,
          Payload: payload("not-json"),
        });
      },
    },
  });

  await assertRejects(
    () => Promise.resolve(transformer.transform({}, context)),
    TypeError,
    "Lambda enrich-order returned an invalid JSON payload.",
  );
});

Deno.test("lambda rejects non-200 invocation status", async () => {
  const transformer = lambda<unknown, unknown>({
    functionName: "enrich-order",
    client: {
      send(_value: InvokeCommand) {
        return response({ StatusCode: 500 });
      },
    },
  });

  await assertRejects(
    () => Promise.resolve(transformer.transform({}, context)),
    Error,
    "Lambda enrich-order returned status 500.",
  );
});

function payload(value: string): NonNullable<InvokeCommandOutput["Payload"]> {
  return new TextEncoder().encode(value) as NonNullable<
    InvokeCommandOutput["Payload"]
  >;
}

function response(
  output: Omit<InvokeCommandOutput, "$metadata">,
): Promise<InvokeCommandOutput> {
  return Promise.resolve({ $metadata: {}, ...output });
}
