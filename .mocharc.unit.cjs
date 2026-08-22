module.exports = {
  require: ["tsx/cjs", "src/tests/support/env-bootstrap.ts"],
  spec: "src/tests/unit/**/*.test.ts",
  extension: ["ts"],
  timeout: 20000,
};
