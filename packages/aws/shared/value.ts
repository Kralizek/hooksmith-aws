import type { Context, Event } from "@hooksmith/core";

export type ValueOrFactory<T, TEvent extends Event = Event> =
  | T
  | ((event: TEvent, context: Context) => T | Promise<T>);

export async function resolve<T, TEvent extends Event>(
  value: ValueOrFactory<T, TEvent>,
  event: TEvent,
  context: Context,
): Promise<T> {
  return typeof value === "function"
    ? await (value as (event: TEvent, context: Context) => T | Promise<T>)(
      event,
      context,
    )
    : value;
}
