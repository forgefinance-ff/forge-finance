import { expect, test } from "@playwright/test";

// Páginas abertas (sem login).

test("landing carrega e leva ao cadastro", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Forge/i);
  await expect(page.getByRole("link", { name: /criar conta|começar|cadastr/i }).first()).toBeVisible();
});

test("login mostra erro em português com senha errada", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("ninguem-e2e@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText(/incorretos|tentativas/i);
});

test("esqueci minha senha está ligado ao login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/esqueci-senha/);
  await expect(page.getByLabel("E-mail da sua conta")).toBeVisible();
});

test("página protegida manda para o login", async ({ page }) => {
  await page.goto("/transacoes");
  await expect(page).toHaveURL(/login/);
});

test("404 em português", async ({ page }) => {
  const response = await page.goto("/pagina-que-nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Essa página não existe.")).toBeVisible();
});

test("sem rolagem lateral no celular", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/", "/login", "/cadastro", "/esqueci-senha"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
