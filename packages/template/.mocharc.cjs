/// https://mochajs.org/#configuring-mocha-nodejs
/// > JavaScript: Create a .mocharc.js (or .mocharc.cjs when using "type"="module" in
/// > your package.json) in your project’s root directory, and export an object
/// > (module.exports = {/* ... */}) containing your configuration.
/// 2025-03-28

/** @type {string[]} */
let spec = ["src/**/*.spec.ts"];
/// Use spec files from command line arguments
const argv = process.argv.slice(2).filter(it => !it.startsWith('-') && /\.(ts|js)/i.test(it));
if (argv.length > 0) spec = argv;

module.exports = {
  spec,
  import: "tsx",
};
