import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      "array-callback-return": "error",
      "consistent-return": "error",
      "eqeqeq": "error",
      "no-await-in-loop": "error",
      "no-constant-binary-expression": "error",
      "no-implicit-coercion": "error",
      "no-object-constructor": "error",
      "no-param-reassign": "error",
      "no-promise-executor-return": "error",
      "no-return-assign": "error",
      "no-self-compare": "error",
      "no-shadow": "error",
      "no-template-curly-in-string": "error",
      "no-unmodified-loop-condition": "error",
      "no-unused-vars": ["error", { args: "none" }],
      "no-use-before-define": "error",
      "require-atomic-updates": "error",
    }
  }
];
