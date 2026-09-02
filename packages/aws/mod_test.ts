import { assert } from "@std/assert";
import * as aws from "./mod.ts";

Deno.test("module loads", () => {
  assert(aws);
});
