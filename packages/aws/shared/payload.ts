import type { EventDocument } from "@hooksmith/core";

export function parsePayload(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function stringifyPayload(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function parseEventDocument<TData = unknown>(
  value: unknown,
): EventDocument<TData> {
  const parsed = parsePayload(value);

  if (!isRecord(parsed)) {
    throw new TypeError("Expected a Hooksmith event document object.");
  }
  if (typeof parsed.type !== "string" || parsed.type.length === 0) {
    throw new TypeError("Event document type must be a non-empty string.");
  }
  if (typeof parsed.timestamp !== "string" || parsed.timestamp.length === 0) {
    throw new TypeError("Event document timestamp must be a non-empty string.");
  }
  if (!isResourceReference(parsed.source)) {
    throw new TypeError("Event document source must be a resource reference.");
  }
  if (!("data" in parsed)) {
    throw new TypeError("Event document data is required.");
  }

  return parsed as unknown as EventDocument<TData>;
}

function isResourceReference(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.kind === "string" &&
    value.kind.length > 0 &&
    (value.id === undefined || typeof value.id === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
