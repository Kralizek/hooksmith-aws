import { assert } from "@std/assert";
import * as awsLambda from "./mod.ts";

Deno.test("module loads", () => {
  assert(awsLambda);
});
