import { AxiError } from "./errors.js";
import type { FieldDef } from "./toon.js";

export interface ExtraFieldSpec {
  jsonKey: string;
  def: FieldDef;
}

export interface ParseFieldsResult {
  extraDefs: FieldDef[];
  extraJsonKeys: string[];
}

export function parseFields(
  fieldsArg: string | undefined,
  available: Record<string, ExtraFieldSpec>,
): ParseFieldsResult {
  if (fieldsArg === undefined) {
    return { extraDefs: [], extraJsonKeys: [] };
  }

  const requested = [
    ...new Set(
      fieldsArg
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    ),
  ];

  const unknown = requested.filter((f) => !(f in available));
  if (unknown.length > 0) {
    const availableNames = Object.keys(available).sort().join(", ");
    throw new AxiError(
      `Unknown field(s): ${unknown.join(", ")}. Available: ${availableNames}`,
      "VALIDATION_ERROR",
    );
  }

  const extraDefs: FieldDef[] = [];
  const extraJsonKeys: string[] = [];

  for (const name of requested) {
    const spec = available[name];
    extraDefs.push(spec.def);
    extraJsonKeys.push(spec.jsonKey);
  }

  return { extraDefs, extraJsonKeys };
}
