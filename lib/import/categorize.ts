// Sugestão de categoria para lançamentos importados, sem IA:
//   1) o que o próprio usuário já fez (mesmo estabelecimento/pessoa → mesma categoria);
//   2) regras com estabelecimentos e palavras comuns no Brasil;
//   3) o nome de uma categoria aparecendo na descrição;
//   4) "Outros".

export type CategoryLike = {
  id: string;
  name: string;
  type: "income" | "expense";
  kind?: string | null;
};

export type GuessSource = "historico" | "regra" | "nome" | "padrao";

export type Guess = { categoryId: string; source: GuessSource };

/** Chave aprendida por tipo: "expense|uber do brasil" → id da categoria. */
export type LearnedMap = Record<string, string>;

export function norm(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Prefixos de tipo que os bancos colocam antes do nome ("Pix enviado · UBER").
const TYPE_PREFIX =
  /^(pix|ted|doc|transferencia|transf|pagamento|pagto|pgto|compra|debito|credito|deposito|saque|boleto|tarifa|estorno|devolucao)( (enviado|enviada|recebido|recebida|realizado|realizada|efetuado|efetuada|devolvido|devolvida|no debito|no credito|com cartao|cartao|de boleto|qr ?code|agendado|programado))*\s*(·|-|:)?\s*/;

const LEGAL_SUFFIX =
  /\b(ltda|ltd|s\/?a|sa|me|mei|eireli|epp|cia|inc|com|br|do brasil|brasil|tecnologia|servicos|comercio|pagamentos|instituicao de pagamento|ip)\b/g;

/** "Pix enviado · UBER DO BRASIL TECNOLOGIA LTDA." → "uber". */
export function counterpartKey(description: string) {
  let text = norm(description)
    .replace(/\s+/g, " ")
    .trim();

  // Fica com o que vem depois do separador "·" (formato do importador).
  if (text.includes("·")) text = text.split("·").slice(1).join(" ").trim() || text;
  text = text.replace(TYPE_PREFIX, "");

  text = text
    .replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, " ") // datas
    .replace(/\d{3,}/g, " ") // documentos, CPF/CNPJ, números longos
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.split(" ").slice(0, 3).join(" ");
}

export function learnedKey(type: "income" | "expense", description: string) {
  const key = counterpartKey(description);
  return key ? `${type}|${key}` : "";
}

/* --------------------------------- regras --------------------------------- */

type Rule = { type: "income" | "expense"; categories: string[]; pattern: RegExp };

const w = (words: string) => new RegExp(`\\b(${words})\\b`);

// A primeira categoria da lista que existir para o usuário é usada.
const RULES: Rule[] = [
  // Despesas
  {
    type: "expense",
    categories: ["transporte"],
    pattern: w(
      "uber|99 ?app|99 ?pop|99 tecnologia|99 taxi|cabify|indrive|in driver|taxi|posto|postos|combustivel|gasolina|etanol|shell|ipiranga|petrobras|br mania|ale combustiveis|estacionamento|estapar|sem parar|veloe|conectcar|move mais|pedagio|ccr|metro|metrorio|jae|riocard|bilhete unico|bilhete digital|top transporte|onibus|brt|supervia|cptm|vlt|barcas|ccr barcas|lime|tembici|bike itau|blablacar|buser|clickbus|rodoviaria|detran|ipva|licenciamento|oficina|autopecas|mecanica|lava jato"
    ),
  },
  {
    type: "expense",
    categories: ["assinaturas", "contas e servicos"],
    pattern: w(
      "netflix|spotify|amazon prime|prime video|primevideo|disney|disney plus|hbo|hbo max|globoplay|youtube premium|youtube|deezer|apple com|apple music|icloud|google one|google storage|chatgpt|openai|anthropic|claude ai|canva|microsoft|office 365|adobe|dropbox|crunchyroll|paramount|star plus|telecine|tidal|audible|kindle unlimited|duolingo|tinder|bumble|gympass|wellhub|totalpass"
    ),
  },
  {
    type: "expense",
    categories: ["compras"],
    pattern: w(
      "amazon|amazon marketplace|mercado livre|mercadolivre|mercado pago|shopee|shein|aliexpress|temu|magalu|magazine luiza|americanas|casas bahia|ponto frio|extra com|renner|riachuelo|cea|zara|hering|marisa|pernambucanas|centauro|netshoes|decathlon|kabum|fast shop|leroy merlin|tok stok|ikea|camicado|havan|lojas|loja|shopping|outlet|nike|adidas|apple store|samsung"
    ),
  },
  {
    type: "expense",
    categories: ["alimentacao", "mercado", "supermercado"],
    pattern: w(
      "ifood|99 ?food|zamp|rappi|ze delivery|aiqfome|james delivery|mercado|supermercado|supermercados|mercadinho|minimercado|atacadao|assai|carrefour|pao de acucar|guanabara|prezunic|mundial|zona sul|hortifruti|sacolao|feira|padaria|panificadora|confeitaria|restaurante|lanchonete|lanches|burger|burguer|mcdonald|mc donalds|bk|burger king|subway|bobs|habibs|giraffas|spoleto|outback|madero|pizza|pizzaria|acai|cafe|cafeteria|starbucks|bar|boteco|choperia|bistro|sushi|temaki|churrascaria|acougue|hamburgueria|sorveteria|doceria|cantina|refeicao|alimentacao|quitanda|mercearia|pastelaria|pastel|bolos|bolo|doces|salgados|emporio|delicatessen|oxxo|dia supermercado|st marche|hirota|big box|sams club|makro|tenda atacado|mateus|bretas|savegnago|condor|muffato|angeloni|zaffari|bistek"
    ),
  },
  {
    type: "expense",
    categories: ["moradia", "contas e servicos"],
    pattern: w("aluguel|condominio|imobiliaria|quinto andar|quintoandar|iptu|loft|administradora"),
  },
  {
    type: "expense",
    categories: ["contas e servicos", "contas", "servicos"],
    pattern: w(
      "fatura|pagamento de fatura|cartao de credito|picpay card|nubank fatura|light|enel|cemig|copel|celesc|coelba|celpe|cosern|equatorial|energisa|neoenergia|cpfl|eletropaulo|cedae|sabesp|copasa|sanepar|embasa|compesa|aguas|agua e esgoto|naturgy|comgas|ceg|claro|vivo|tim|oi fibra|oi|net servicos|sky|internet|fibra|telefone|telefonia|recarga|recarga de celular|energia|luz|gas|boleto|cartorio|correios|seguro|seguradora|porto seguro|tarifa|anuidade|iof|juros|multa|darf|das mei|simples nacional|inss|receita federal"
    ),
  },
  {
    type: "expense",
    categories: ["saude"],
    pattern: w(
      "farmacia|drogaria|droga raia|raia|drogasil|pacheco|venancio|pague menos|panvel|sao joao|nissei|drogal|ultrafarma|hospital|clinica|laboratorio|exame|consulta|medico|dentista|odonto|psicologo|psicologa|terapia|fisioterapia|unimed|amil|sulamerica|bradesco saude|hapvida|notredame|prevent senior|smart fit|smartfit|bluefit|bodytech|academia|selfit|crossfit|pilates"
    ),
  },
  {
    type: "expense",
    categories: ["cuidados pessoais", "saude"],
    pattern: w(
      "salao|barbearia|barber|cabeleireiro|cabelereiro|estetica|manicure|depilacao|boticario|o boticario|natura|sephora|avon|eudora|quem disse berenice|perfumaria|cosmeticos|beleza"
    ),
  },
  {
    type: "expense",
    categories: ["lazer"],
    pattern: w(
      "cinema|cinemark|kinoplex|uci|ingresso|ingressos|sympla|eventim|ticketmaster|ingresse|show|teatro|museu|parque|steam|playstation|gaming|games|game|esports|entertainment|psn|xbox|nintendo|epic games|riot|blizzard|hotel|pousada|airbnb|booking|decolar|123 milhas|latam|gol linhas|azul linhas|viagem|turismo|clube|boliche|karaoke"
    ),
  },
  {
    type: "expense",
    categories: ["educacao"],
    pattern: w(
      "escola|colegio|faculdade|universidade|mensalidade escolar|curso|cursos|udemy|alura|coursera|hotmart|kiwify|eduzz|livraria|livros|saraiva|papelaria|kalunga|material escolar|idiomas|ingles|wizard|ccaa|fisk"
    ),
  },
  {
    type: "expense",
    categories: ["pets"],
    pattern: w("petz|cobasi|petlove|pet shop|petshop|veterinario|veterinaria|clinica veterinaria|racao|banho e tosa"),
  },
  // Receitas
  {
    type: "income",
    categories: ["salario"],
    pattern: w("salario|folha|folha de pagamento|proventos|pagamento de salario|adiantamento salarial|ferias|decimo terceiro|13o salario|plr"),
  },
  {
    type: "income",
    categories: ["investimentos"],
    pattern: w("rendimento|rendimentos|juros|dividendo|dividendos|jcp|resgate|cdb|tesouro|poupanca|cashback"),
  },
];

const LOAN = w("emprestimo|emprestimos|emprestimo pessoal|consignado|financiamento|credito pessoal");
const REFUND = w("devolvido|devolvida|devolucao|estorno|estornado|estornada|reembolso|ressarcimento");

/** Pix/transferência entre contas da própria pessoa (nome dela na descrição). */
export function isOwnTransfer(description: string, userName: string) {
  const own = counterpartKey(userName).split(" ").slice(0, 2).join(" ");
  if (own.split(" ").length < 2) return false;
  return counterpartKey(description).startsWith(own);
}

/* ------------------------------- sugestão -------------------------------- */

export function guessCategory(
  description: string,
  type: "income" | "expense",
  categories: CategoryLike[],
  learned: LearnedMap = {}
): Guess {
  const options = categories.filter((c) => c.type === type);
  const regular = options.filter((c) => !c.kind || c.kind === "regular");
  const ids = new Set(options.map((c) => c.id));

  const text = norm(description).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  const byName = (name: string) => regular.find((c) => norm(c.name) === name);
  const othersId = byName("outros")?.id;

  // 1) Histórico do usuário ("Outros" no histórico não ensina nada).
  const key = learnedKey(type, description);
  const fromHistory = key ? learned[key] : undefined;
  if (fromHistory && ids.has(fromHistory) && fromHistory !== othersId) {
    return { categoryId: fromHistory, source: "historico" };
  }
  const byKind = (kind: string) => options.find((c) => c.kind === kind);

  // 2a) Empréstimos e devoluções vão para as categorias especiais
  //     (mexem no saldo, mas não são receita nem despesa).
  if (LOAN.test(text)) {
    const found = byKind("loan");
    if (found) return { categoryId: found.id, source: "regra" };
  }
  if (type === "income" && REFUND.test(text)) {
    const found = byKind("refund");
    if (found) return { categoryId: found.id, source: "regra" };
  }

  // 2) Regras.
  for (const rule of RULES) {
    if (rule.type !== type || !rule.pattern.test(text)) continue;
    for (const name of rule.categories) {
      const found = byName(name);
      if (found) return { categoryId: found.id, source: "regra" };
    }
  }

  // 3) Nome de uma categoria do usuário dentro da descrição.
  const named = regular
    .filter((c) => c.name.length >= 4 && text.includes(norm(c.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (named) return { categoryId: named.id, source: "nome" };

  // 4) Outros.
  return { categoryId: othersId ?? "", source: "padrao" };
}
