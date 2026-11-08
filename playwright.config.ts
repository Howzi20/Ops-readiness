import { defineConfig } from "@playwright/test";

// Runs against a throwaway database (prisma/e2e.db) seeded fresh for each run.
const PORT = 3201;
const env = { DATABASE_URL: "file:./e2e.db", SESSION_SECRET: "e2e-only-secret-0123456789abcdef", REQUIRE_LOGIN: process.env.REQUIRE_LOGIN ?? "false", APP_URL: `http://localhost:${PORT}`, SMTP_HOST: "" };

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // use a locally installed Chromium if PW_CHROMIUM_PATH is set
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `node -e "require('fs').rmSync('prisma/e2e.db',{force:true})" && prisma db push --skip-generate && tsx prisma/seed/seed.ts && next dev -p ${PORT}`,
    port: PORT,
    timeout: 180_000,
    reuseExistingServer: false,
    env,
  },
});
