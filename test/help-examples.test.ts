import { describe, it, expect } from "vitest";
import { ISSUE_HELP } from "../src/commands/issue.js";
import { MR_HELP } from "../src/commands/mr.js";
import { PIPELINE_HELP } from "../src/commands/pipeline.js";
import { JOB_HELP } from "../src/commands/job.js";
import { RELEASE_HELP } from "../src/commands/release.js";
import { PROJECT_HELP } from "../src/commands/project.js";
import { LABEL_HELP } from "../src/commands/label.js";
import { VARIABLE_HELP } from "../src/commands/variable.js";
import { SEARCH_HELP } from "../src/commands/search.js";
import { API_HELP } from "../src/commands/api.js";
import { TOP_HELP } from "../src/cli.js";

function assertHelpHasExamples(name: string, help: string) {
  describe(`${name}`, () => {
    it("contains an examples: section", () => {
      expect(help).toContain("examples:");
    });

    it('has at least 2 examples starting with "glab-axi"', () => {
      const examplesSection = help.slice(help.indexOf("examples:"));
      const exampleLines = examplesSection
        .split("\n")
        .filter((line) => line.trim().startsWith("glab-axi"));
      expect(exampleLines.length).toBeGreaterThanOrEqual(2);
    });

    it("examples are indented with 2 spaces", () => {
      const examplesSection = help.slice(help.indexOf("examples:"));
      const exampleLines = examplesSection
        .split("\n")
        .filter((line) => line.trim().startsWith("glab-axi"));
      for (const line of exampleLines) {
        expect(line).toMatch(/^ {2}glab-axi/);
      }
    });
  });
}

describe("Help output includes examples for every command family", () => {
  assertHelpHasExamples("TOP_HELP", TOP_HELP);
  assertHelpHasExamples("ISSUE_HELP", ISSUE_HELP);
  assertHelpHasExamples("MR_HELP", MR_HELP);
  assertHelpHasExamples("PIPELINE_HELP", PIPELINE_HELP);
  assertHelpHasExamples("JOB_HELP", JOB_HELP);
  assertHelpHasExamples("RELEASE_HELP", RELEASE_HELP);
  assertHelpHasExamples("PROJECT_HELP", PROJECT_HELP);
  assertHelpHasExamples("LABEL_HELP", LABEL_HELP);
  assertHelpHasExamples("VARIABLE_HELP", VARIABLE_HELP);
  assertHelpHasExamples("SEARCH_HELP", SEARCH_HELP);
  assertHelpHasExamples("API_HELP", API_HELP);
});

describe("--body-file discoverability", () => {
  it("documents --body-file in body-accepting command help", () => {
    expect(ISSUE_HELP).toContain("--body-file <path>");
    expect(MR_HELP).toContain("--body-file <path>");
    expect(RELEASE_HELP).toContain("--body-file");
  });
});
