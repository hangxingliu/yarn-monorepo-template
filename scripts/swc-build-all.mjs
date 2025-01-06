#!/usr/bin/env node
//@ts-check
import { resolve } from "node:path";
import { execSync } from "./run.mjs";

const projectDir = resolve(import.meta.dirname, "..");
const cmd = [
  "swc-mux",
  // -D, --copy-files -s, --source-maps
  ...["--strip-leading-paths", "--no-swcrc", "-D", "-s"],
  ...["--config", "jsc.parser.syntax=typescript"],
  // ...["--config", `jsc.parser.dynamicImport=true`],
  ...["--config", "jsc.target=es2022"],
  ...["--config", `module.ignoreDynamic=true`],
  ...["--config", `module.type=es6`],
  ...muxProject("packages/template", "src", "esm"),
  // ...muxProject("packages/template", "src", "cjs", "commonjs"),
  // ...muxProject("packages/sub-project", "src", "esm"),
  // ...muxProject("packages/sub-project2", "src", "esm"),
];
execSync([...cmd, ...process.argv.slice(2)], { cwd: projectDir });

/**
 * @param {string} moduleDir
 * @param {string} srcDir
 * @param {string} outDir
 * @param {"es6"|"commonjs"|"amd"|"umd"} [moduleType]
 */
function muxProject(moduleDir, srcDir, outDir, moduleType) {
  const args = ["--mux", `${moduleDir}/${srcDir}`, "-d", `${moduleDir}/${outDir}`];
  if (moduleType) args.push("--config", `module.type=${moduleType}`);
  return args;
}
