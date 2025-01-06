#!/usr/bin/env node
//@ts-check

//
// #region config
/** @type {RunConfig} */
const runConfig = {
  build: ["yarn", "run", "build"],
  rewriteFrom: ["src"],
  rewriteTo: { cjs: ["cjs"], esm: ["esm"] },
  baseDir: [process.cwd(), import.meta.dirname],
  node: ["node"], // ['yarn', 'node']
  nodeArgs: ["--enable-source-maps"], // --inspect
  maxDepth: 16,
};
// #endregion config
//

//
// #region main
// template:    run-ts.mjs
// version:     2024-12-08
// author:      hangxingliu
// description: Build (npm/yarn build) and execute single TypeScript source file
// changelog:
//   2024-12-08: init version transformmed from `ts.sh`
//
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const enableDebug = !!process.env.DEBUG;
const dim = "\x1b[2m";
const reset = "\x1b[0m";

/**
 * @typedef {{
 * build?: string[];
 * rewriteFrom?: string[];
 * rewriteTo?: { cjs?: string[]; esm?: string[] };
 * baseDir?: string[];
 * node?: string[];
 * nodeArgs?: string[];
 * maxDepth?: number;
 * }} RunConfig
 */
function usage() {
  const bin = basename(import.meta.filename);
  console.log(
    [
      "",
      `  Usage: ${bin} [...node-args] [--] <ts-file> [...args]`,
      "",
      "  Description: Build (npm/yarn build) and execute single TypeScript source file",
      "",
    ].join("\n")
  );
  return process.exit(0);
}

/**
 * @type {<T extends keyof RunConfig>(
 *  configKey: T,
 *  defaultVal: Required<RunConfig>[T]
 * ) => Required<RunConfig>[T]}
 */
function getConfig(configKey, defaultVal) {
  const val = /** @type {any} */ (runConfig[configKey]);
  if (val === undefined || val === null) return defaultVal;
  return val;
}
function parseArgs() {
  /** @type {string|undefined} */
  let tsFile;
  const tsArgs = [];
  const nodeArgs = [];
  let isArgForNode = true;
  for (let i = 2; i < process.argv.length; i++) {
    const thisArg = process.argv[i];
    if (isArgForNode) {
      if (thisArg === "--help") return usage();
      if (thisArg === "--") isArgForNode = false;
      else if (thisArg.startsWith("--")) nodeArgs.push(thisArg);
      else if (thisArg === "inspect" && nodeArgs.length === 0) nodeArgs.push(thisArg);
      else {
        isArgForNode = false;
        tsFile = thisArg;
      }
      continue;
    }
    if (tsFile) tsArgs.push(thisArg);
    else tsFile = thisArg;
  }
  if (!tsFile) return usage();
  nodeArgs.push(...getConfig("nodeArgs", []));
  return { nodeArgs, tsFile, tsArgs };
}

/**
 * @param {string} path
 */
function resolvePath(path) {
  const baseDirs = getConfig("baseDir", [process.cwd()]);
  for (const baseDir of baseDirs) {
    const absPath = resolve(baseDir, path);
    if (existsSync(absPath)) return { baseDir, absPath };
  }
  throw new Error(`The file "${path}" is not found`);
}

/**
 * @param {string} path
 */
function getPackageJSON(path) {
  let baseDir = dirname(path);
  const maxDepth = getConfig("maxDepth", 16);
  for (let i = 0; i < maxDepth; i++) {
    const filePath = resolve(baseDir, "package.json");
    if (existsSync(filePath)) return filePath;
    const nextDir = dirname(baseDir);
    if (nextDir === baseDir || !nextDir) break;
    baseDir = nextDir;
  }
  throw new Error(`Failed to resolve the package.json for "${path}"`);
}

/**
 * @param {string} path
 * @returns {string[]}
 */
function getNodeModuleBinDirs(path) {
  /** @type {string[]} */
  const result = [];
  let baseDir = dirname(path);
  const maxDepth = getConfig("maxDepth", 16);
  for (let i = 0; i < maxDepth; i++) {
    const binDir = resolve(baseDir, "node_modules/.bin");
    if (existsSync(binDir)) result.push(binDir);
    const nextDir = dirname(baseDir);
    if (nextDir === baseDir || !nextDir) break;
    baseDir = nextDir;
  }
  return result;
}

/**
 * @param {any} pkgJSON
 */
function isESMPackage(pkgJSON) {
  return pkgJSON && typeof pkgJSON === "object" && pkgJSON.type === "module";
}
/**
 * @param {string} log
 */
function debug(log) {
  if (!enableDebug) return;
  process.stdout.write(`${dim}debug: ${log}${reset}\n`);
}

/** @type {string[]} */
let prependedPath = [];

/**
 * @param {string[]} command
 * @param {string} cwd
 */
function execSync(command, cwd) {
  console.log(`${dim}$ ${command.join(" ")}${reset}`);
  const [bin, ...args] = command;
  const env = { ...process.env };
  if (prependedPath.length > 0) {
    const path = (process.env.PATH || "").split(":");
    path.unshift(...prependedPath);
    env.PATH = path.filter(Boolean).join(":");
  }
  const isWin32 = process.platform === "win32";
  const ret = spawnSync(bin, args, {
    cwd,
    env,
    shell: isWin32 ? true : undefined,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (ret.status !== 0) {
    let log = `${bin} exit with`;
    if (typeof ret.status === "number") log += ` code ${ret.status}`;
    if (ret.signal) log += ` signal ${ret.signal}`;
    if (ret.error) log += ` error "${ret.error.message}"`;
    console.error(log);
    process.exit(typeof ret.status === "number" ? ret.status : 1);
  }
}

async function main() {
  const { nodeArgs, tsFile, tsArgs } = parseArgs();
  const pathInfo = resolvePath(tsFile);
  debug(`source file  = ${pathInfo.absPath}`);

  const packageFile = getPackageJSON(pathInfo.absPath);
  debug(`package.json = ${packageFile}`);

  const isESM = isESMPackage(JSON.parse(readFileSync(packageFile, "utf-8")));
  if (isESM) debug(`esm mode = true`);

  let allRewriteFrom = getConfig("rewriteFrom", []);
  const allRewriteTo = getConfig("rewriteTo", {});
  const rewriteTo = (isESM ? allRewriteTo.esm : allRewriteTo.cjs) || [];
  if (rewriteTo.length === 0) allRewriteFrom = [];

  let newTsFile = pathInfo.absPath;
  for (let rewriteFrom of allRewriteFrom) {
    rewriteFrom += "/";
    const index = tsFile.indexOf(rewriteFrom);
    if (index < 0) continue;
    const rewriteBase = tsFile.slice(0, index);
    const rewriteSuffix = tsFile.slice(index + rewriteFrom.length);

    let rewritten = false;
    for (const to of rewriteTo) {
      const testDir = resolve(pathInfo.baseDir, rewriteBase, to);
      if (!existsSync(testDir)) continue;
      newTsFile = resolve(pathInfo.baseDir, rewriteBase, to, rewriteSuffix);
      rewritten = true;
      break;
    }
    if (rewritten) break;
  }

  const targetJsFile = newTsFile.replace(/\.[mc]?tsx?$/, "");
  prependedPath = getNodeModuleBinDirs(targetJsFile);
  debug(`target file  = ${targetJsFile}`);

  const buildCommand = getConfig("build", ["npm", "run", "build"]);
  execSync(buildCommand, dirname(packageFile));
  execSync([...getConfig("node", ["node"]), ...nodeArgs, targetJsFile, ...tsArgs], process.cwd());
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
//
// #endregion main
//
