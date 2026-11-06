import { defineConfig } from "@playwright/test";

// End-to-end tests for the player app against the real server and a production build.
// The quiz state lives in one server, so tests run one at a time and reset the quiz first.
const PORT = 4199;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce"
  },
  webServer: {
    command: "npm run build && node server.js",
    url: `http://localhost:${PORT}/participant.html`,
    reuseExistingServer: false,
    timeout: 120000,
    env: { PORT: String(PORT), HOST_PIN: "e2e-pin", COUNTDOWN_MS: "800", PUBLIC_URL: "" }
  }
});
