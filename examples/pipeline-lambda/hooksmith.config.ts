import type { Config, Event, Listener } from "@hooksmith/core";
import { lambda } from "@hooksmith/aws/pipeline/lambda";
import { pipe } from "@hooksmith/pipeline";

interface Order {
  orderId: string;
}

interface EnrichedOrder extends Order {
  risk: "low" | "high";
}

const terminalListener: Listener<Event<EnrichedOrder>> = {
  name: "log-enriched-order",
  run(event) {
    console.log(event.data);
    return { success: true };
  },
};

export default {
  routes: [
    {
      name: "enrich-order",
      listeners: [
        pipe(
          lambda<Order, EnrichedOrder>({
            functionName: Deno.env.get("FUNCTION_NAME")!,
            clientConfig: { region: Deno.env.get("AWS_REGION") },
          }),
          terminalListener,
        ),
      ],
    },
  ],
} satisfies Config<Event<Order>>;
