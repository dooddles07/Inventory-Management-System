import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Off by default in eslint-config-next, which is how an unused import shipped.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
