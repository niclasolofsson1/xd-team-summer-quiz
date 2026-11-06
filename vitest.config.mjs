import { defineConfig } from "vitest/config";

// Unit tests for the client's plain logic (connection, retries, clock, formatting). They run in Node.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
    environment: "node"
  }
});
