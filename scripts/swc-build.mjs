#!/usr/bin/env node
//@ts-check
/// <reference types="node" />

import { execSync } from "./run.mjs";

const srcDir = "src";
let buildESM = false;
let silent = false;

const restArgs = [];
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--") {
    restArgs.push(...process.argv.slice(i + 1));
    break;
  } else if (arg === "--esm") buildESM = true;
  else if (arg === "-q" || arg === "--silent") silent = true;
  else restArgs.push(arg);
}

/** @type {import('./run.mjs').ExecOptions} */
const execOpts = { cwd: process.cwd(), shortName: true, showCmd: !silent };

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string} moduleType
 * @param  {...string} rest
 * @returns {string[]}
 */
function getCommand(inputDir, outputDir, moduleType, ...rest) {
  return [
    "yarn",
    "swc",
    ...["--strip-leading-paths", "--no-swcrc", "-D", "-s"],
    ...["-C", "jsc.parser.syntax=typescript"],
    // ...["-C", `jsc.parser.dynamicImport=true`],
    ...["-C", `jsc.target=es2022`],
    ...["-C", `module.ignoreDynamic=true`],
    ...["-C", `module.type=${moduleType}`],
    "--out-dir",
    outputDir,
    inputDir,
    ...rest,
  ];
}

const commandESM = getCommand(srcDir, "esm", "es6");
if (buildESM) execSync([...commandESM, ...restArgs], execOpts);
