//@ts-check
/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  ignores: [(commit) => commit.toLowerCase().startsWith("wip")],
  /**
   * `[0]` represents disabling the rule
   * @see https://github.com/conventional-changelog/commitlint/blob/master/docs/reference/rules.md
   */
  rules: {
    "header-max-length": [0],
    "footer-max-length": [0],
    "body-max-line-length": [0],
    "type-enum": [
      2,
      "always",
      [
        "release",
        "chore",
        "ci",
        "deps",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
    // Sentence case
    "subject-case": [2, "always", ["sentence-case"]],
  },
};
export default config;
