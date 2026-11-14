import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (navegador de verdade).
 *
 *   npx playwright install chromium   # uma vez
 *   npm run dev                        # em outro terminal (ou E2E_BASE_URL)
 *   npm run e2e
 *
 * A jornada completa usa uma CONTA DE TESTE (nunca a sua conta real):
 *   E2E_EMAIL=teste@exemplo.com E2E_PASSWORD=... npm run e2e
 * Sem essas variáveis, só os testes públicos rodam.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
});
