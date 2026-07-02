/**
 * Regenerate skills/glab-axi/SKILL.md from the shared skill source.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSkillMarkdown } from "../src/skill.js";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, "..", "skills", "glab-axi");
mkdirSync(skillDir, { recursive: true });
writeFileSync(join(skillDir, "SKILL.md"), createSkillMarkdown(), "utf-8");

console.log("skills/glab-axi/SKILL.md regenerated");
