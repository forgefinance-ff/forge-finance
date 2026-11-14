import { expect, test, type Page } from "@playwright/test";

/**
 * Jornada principal com uma CONTA DE TESTE:
 * entrar → criar conta → lançar gasto → conferir no extrato → editar →
 * transferir → orçamento → relatórios → limpar.
 * Valores com centavos "estranhos" (12,34) para achar o lançamento sem
 * confundir com dados reais.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Defina E2E_EMAIL e E2E_PASSWORD de uma conta de teste.");
test.skip(({ isMobile }) => isMobile, "A jornada completa roda no desktop; o celular é coberto em public.spec.");

const stamp = Date.now().toString().slice(-5);
const ACCOUNT_A = `E2E Conta A ${stamp}`;
const ACCOUNT_B = `E2E Conta B ${stamp}`;
const DESCRIPTION = `E2E Mercado ${stamp}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/dashboard|comecar/);
}

async function typeMoney(page: Page, label: string | RegExp, digits: string) {
  const field = page.getByLabel(label).first();
  await field.click();
  await field.press("Delete");
  await field.pressSequentially(digits);
}

test("jornada completa", async ({ page }) => {
  await login(page);

  // 1) Duas contas.
  for (const name of [ACCOUNT_A, ACCOUNT_B]) {
    await page.goto("/contas");
    await page.getByLabel("Nome da conta").fill(name);
    await typeMoney(page, "Saldo de hoje", "100000"); // R$ 1.000,00
    await page.getByRole("button", { name: "Salvar conta" }).click();
    await expect(page.getByText(name).first()).toBeVisible();
  }

  // 2) Gasto de R$ 12,34 na conta A.
  await page.goto("/transacoes");
  await page.getByRole("button", { name: "Nova transação" }).first().click();
  const sheet = page.getByRole("dialog");
  await typeMoney(page, "Valor", "1234");
  await expect(sheet.getByLabel("Valor")).toHaveValue("R$ 12,34");
  await sheet.getByLabel("Descrição").fill(DESCRIPTION);
  await sheet.getByLabel("Categoria").selectOption({ index: 1 });
  await sheet.getByLabel("Conta").selectOption({ label: ACCOUNT_A });
  await sheet.getByRole("button", { name: "Salvar transação" }).click();
  await expect(page.getByRole("button", { name: new RegExp(DESCRIPTION) })).toBeVisible();

  // 3) Editar para R$ 12,35.
  await page.getByRole("button", { name: new RegExp(DESCRIPTION) }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Valor").click();
  await edit.getByLabel("Valor").press("Backspace");
  await edit.getByLabel("Valor").pressSequentially("5");
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`${DESCRIPTION}.*12,35`) })).toBeVisible();

  // 4) Saldo da conta A: 1.000,00 − 12,35 = 987,65.
  await page.goto("/contas");
  await expect(page.getByText("987,65").first()).toBeVisible();

  // 5) Transferência A → B não muda receitas/despesas.
  await page.goto("/transacoes");
  const saiuAntes = await page.getByLabel("Resumo do mês").innerText();
  await page.getByRole("button", { name: "Nova transação" }).first().click();
  await page.getByRole("radio", { name: "Transferir" }).click();
  await typeMoney(page, "Valor", "5000");
  await page.getByLabel("De", { exact: true }).selectOption({ label: ACCOUNT_A });
  await page.getByLabel("Para", { exact: true }).selectOption({ label: ACCOUNT_B });
  await page.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(page.getByText(`Transferência para ${ACCOUNT_B}`).first()).toBeVisible();
  await expect(page.getByLabel("Resumo do mês")).toHaveText(saiuAntes);

  // 6) Excluir a transferência apaga os dois lados.
  await page.getByRole("button", { name: new RegExp(`Transferência para ${ACCOUNT_B}`) }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Excluir os dois lados" }).click();
  await expect(page.getByText(`Transferência para ${ACCOUNT_B}`)).toHaveCount(0);

  // 7) Relatórios abrem e mostram totais.
  await page.goto("/relatorios");
  await expect(page.getByText("Despesas").first()).toBeVisible();

  // 8) Limpeza: apaga o gasto e as contas de teste.
  await page.goto(`/transacoes?q=${encodeURIComponent(DESCRIPTION)}`);
  await page.getByRole("button", { name: new RegExp(DESCRIPTION) }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByRole("button", { name: new RegExp(DESCRIPTION) })).toHaveCount(0);
});
