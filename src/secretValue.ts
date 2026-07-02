import { AxiError } from "./errors.js";
import { readStdin, isStdinTTY } from "./stdin.js";

function valueRequiredError(noun: "secret" | "variable"): AxiError {
  if (noun === "secret") {
    return new AxiError(
      "secret value is required: pipe the value via stdin",
      "VALIDATION_ERROR",
      [`echo -n "<value>" | glab-axi secret set <name>`],
    );
  }

  return new AxiError(
    "variable value is required: pass --body <value> or pipe the value via stdin",
    "VALIDATION_ERROR",
    [
      `glab-axi variable set <name> --body <value>`,
      `echo -n "<value>" | glab-axi variable set <name>`,
    ],
  );
}

export async function resolveValue(
  flagValue: string | undefined,
  noun: "secret" | "variable",
): Promise<string> {
  if (flagValue !== undefined) {
    if (noun === "secret") {
      throw new AxiError(
        "Secret values must be piped via stdin; --body/-b is not accepted for secrets",
        "VALIDATION_ERROR",
        [`echo -n "<value>" | glab-axi secret set <name>`],
      );
    }
    if (flagValue.length === 0) {
      throw new AxiError(`--body requires a value`, "VALIDATION_ERROR", [
        `glab-axi ${noun} set <name> --body <value>`,
      ]);
    }
    return flagValue;
  }

  if (isStdinTTY()) {
    throw valueRequiredError(noun);
  }

  const value = await readStdin();
  if (value.length === 0) {
    throw valueRequiredError(noun);
  }
  return value;
}
