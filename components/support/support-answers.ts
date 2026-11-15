/**
 * Respostas rápidas do balão de suporte. Procura pela pergunta que tem mais
 * palavras em comum com o que a pessoa escreveu. Sem IA, sem custo, na hora.
 */

type Answer = { text: string; link?: { href: string; label: string } };
type Entry = Answer & { keywords: string[] };

const ENTRIES: Entry[] = [
  {
    keywords: ["registrar", "registro", "lancar", "lancamento", "gasto", "despesa", "receita", "adicionar", "novo", "nova", "anotar"],
    text: "Toque em \"Registrar transação\" no início ou em Transações > Nova transação. Comece pelo valor, depois descrição e categoria. Pelo WhatsApp é só mandar \"gastei 45 no mercado\".",
    link: { href: "/transacoes", label: "Ir para Transações" },
  },
  {
    keywords: ["errei", "corrigir", "editar", "mudar", "alterar", "trocar", "valor", "errado"],
    text: "Em Transações, toque no lançamento: abre a edição. Mude o que precisar e salve; o saldo da conta acompanha. No WhatsApp: \"na verdade foram 48\".",
    link: { href: "/transacoes", label: "Ir para Transações" },
  },
  {
    keywords: ["apagar", "excluir", "deletar", "remover"],
    text: "Toque no lançamento em Transações e use \"Excluir\". Transferências somem dos dois lados de uma vez.",
    link: { href: "/transacoes", label: "Ir para Transações" },
  },
  {
    keywords: ["parcela", "parcelado", "parcelada", "cartao", "credito", "fatura", "pagar fatura"],
    text: "Em Nova transação, escolha \"Cartão de crédito\" e as parcelas. Cada parcela entra no mês dela; as futuras ficam como \"a vencer\". Para pagar a fatura, use a página Cartões.",
    link: { href: "/cartoes", label: "Ver cartões" },
  },
  {
    keywords: ["transferir", "transferencia", "mover", "passar", "entre contas", "pix"],
    text: "Em Nova transação, escolha \"Transferir\", a conta de origem e a de destino. Não conta como receita nem despesa.",
  },
  {
    keywords: ["saldo", "bate", "banco", "diferente", "errado", "conferir"],
    text: "Confira o saldo inicial da conta e se há lançamentos com data futura: eles só entram no saldo quando o dia chega. Importar o extrato ajuda a achar o que faltou.",
    link: { href: "/importar", label: "Importar extrato" },
  },
  {
    keywords: ["importar", "extrato", "ofx", "csv", "planilha", "excel"],
    text: "Em Importar extrato, envie o arquivo OFX, CSV ou XLSX do banco. Você revisa as categorias antes de salvar.",
    link: { href: "/importar", label: "Importar extrato" },
  },
  {
    keywords: ["whatsapp", "zap", "conectar", "vincular", "bot", "audio"],
    text: "Na página WhatsApp, gere o código e envie para o número do Forge. Depois é só conversar: registrar, consultar, corrigir e até mandar áudio.",
    link: { href: "/whatsapp", label: "Conectar WhatsApp" },
  },
  {
    keywords: ["orcamento", "limite", "categoria", "estourar", "teto"],
    text: "Em Orçamentos, escolha a categoria e o limite do mês. O Forge avisa quando o ritmo indicar que vai estourar.",
    link: { href: "/orcamentos", label: "Abrir Orçamentos" },
  },
  {
    keywords: ["meta", "objetivo", "guardar", "juntar", "reserva"],
    text: "Em Metas, crie o objetivo com valor e prazo e vá registrando quanto guardou. O anel no início mostra o progresso.",
    link: { href: "/metas", label: "Abrir Metas" },
  },
  {
    keywords: ["senha", "login", "entrar", "acesso", "esqueci"],
    text: "Se esqueceu, use \"Esqueci minha senha\" na tela de login. Logado, troque em Configurações > Segurança.",
    link: { href: "/configuracoes", label: "Abrir Configurações" },
  },
  {
    keywords: ["dados", "lgpd", "baixar", "exportar", "apagar conta", "excluir conta", "privacidade"],
    text: "Em Configurações > Seus dados você baixa uma cópia completa ou exclui a conta.",
    link: { href: "/configuracoes", label: "Abrir Configurações" },
  },
  {
    keywords: ["mei", "empresa", "das", "imposto", "cnpj", "faturamento", "cliente"],
    text: "Troque para \"Empresa\" no seletor do menu. Lá ficam Gestão, Clientes e Impostos (DAS e limite do MEI).",
  },
  {
    keywords: ["plano", "pro", "assinar", "assinatura", "pagar", "preco", "cancelar"],
    text: "Os planos e a sua assinatura ficam em Configurações > Planos.",
    link: { href: "/planos", label: "Ver planos" },
  },
  {
    keywords: ["relatorio", "grafico", "categoria", "patrimonio", "evolucao"],
    text: "Em Relatórios você vê despesas por categoria, a evolução do patrimônio e a atividade do período.",
    link: { href: "/relatorios", label: "Abrir Relatórios" },
  },
];

export const SUGGESTIONS = [
  "Como registro um gasto?",
  "Errei um valor",
  "Compra parcelada",
  "Conectar o WhatsApp",
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");

export function findAnswer(question: string, pathname: string): Answer | null {
  const q = ` ${norm(question)} `;
  let best: Entry | null = null;
  let bestScore = 0;

  for (const entry of ENTRIES) {
    let score = 0;
    for (const k of entry.keywords) {
      const key = norm(k).trim();
      if (key.includes(" ") ? q.includes(` ${key} `) : new RegExp(` ${key}\\w{0,3} `).test(q)) {
        score += key.includes(" ") ? 2 : 1;
      }
    }
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  if (!best) return null;
  // Já está na página do link: não manda para ela de novo.
  return best.link && best.link.href === pathname ? { text: best.text } : { text: best.text, link: best.link };
}
