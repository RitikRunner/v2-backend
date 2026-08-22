module.exports = {
  require: [
    "tsx/cjs",
    "src/tests/support/env-bootstrap.ts",
    "src/tests/support/containers.ts",
    "src/tests/support/hooks.ts",
  ],
  spec: "src/tests/**/*.test.ts",
  extension: ["ts"],
  timeout: 60000,
  exit: true,
};
