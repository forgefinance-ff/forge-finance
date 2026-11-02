import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Forge Finance",
  description:
    "Como o Forge Finance coleta, usa e protege seus dados pessoais, incluindo o registro de gastos pelo WhatsApp.",
};

const CONTROLLER = "Thiago Paes da Costa Canto";
const EMAIL = "thiagopaes957@gmail.com";
const UPDATED = "2 de novembro de 2026";

type Section = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

const SECTIONS: Section[] = [
  {
    title: "1. Quem somos",
    paragraphs: [
      `O Forge Finance é um aplicativo de controle financeiro pessoal. O responsável pelo tratamento dos seus dados pessoais (controlador, nos termos da Lei Geral de Proteção de Dados, LGPD, Lei 13.709/2018) é ${CONTROLLER}, pessoa física, que pode ser contatado pelo e-mail ${EMAIL}.`,
    ],
  },
  {
    title: "2. Quais dados coletamos",
    items: [
      "Dados de cadastro e acesso: nome (se informado), e-mail e credenciais de autenticação.",
      "Dados financeiros que você mesmo registra: contas, saldos, transações, categorias, metas, orçamentos e investimentos.",
      "Número de WhatsApp que você vincula ao app, usado para reconhecer que as mensagens vêm de você.",
      "Mensagens que você envia ao bot do WhatsApp (texto ou áudio) com gastos e receitas a registrar.",
      "Dados técnicos de funcionamento e segurança, como identificadores de mensagens (para evitar lançamentos duplicados) e registros de erros.",
    ],
  },
  {
    title: "3. Para que usamos seus dados",
    items: [
      "Prestar o serviço: criar sua conta, mostrar seus lançamentos, relatórios e dashboards.",
      "Registrar gastos e receitas enviados pelo WhatsApp, sempre com a sua confirmação antes de salvar.",
      "Interpretar o texto das suas mensagens e responder ao assistente de IA do app.",
      "Manter a segurança do serviço, prevenir fraudes e abusos e corrigir falhas.",
      "Cumprir obrigações legais e responder a pedidos seus.",
    ],
    paragraphs: [
      "As bases legais usadas são, conforme o caso: execução do serviço que você contratou ou solicitou, o seu consentimento (por exemplo, ao vincular o WhatsApp), o legítimo interesse na segurança do serviço e o cumprimento de obrigações legais.",
    ],
  },
  {
    title: "4. Como funciona o registro pelo WhatsApp",
    items: [
      "Você vincula o seu número gerando um código na página WhatsApp do app e enviando esse código ao bot.",
      "Quando você envia um texto, ele é lido por um modelo de IA (Claude, da Anthropic), que extrai valor, categoria, conta e data.",
      "Quando você envia um áudio, ele é baixado da Meta, transcrito em texto por um serviço de transcrição (OpenAI) e então interpretado como o texto acima. Não guardamos o arquivo de áudio.",
      "O bot mostra o lançamento e só o grava depois que você toca em Confirmar. Lançamentos não confirmados expiram e são descartados.",
      "Você pode desvincular o número a qualquer momento na página WhatsApp do app.",
    ],
  },
  {
    title: "5. Com quem compartilhamos",
    paragraphs: [
      "Não vendemos seus dados pessoais. Para o app funcionar, usamos fornecedores que tratam dados em nosso nome, cada um com seus próprios termos e políticas de privacidade:",
    ],
    items: [
      "Supabase: banco de dados e autenticação.",
      "Vercel: hospedagem do aplicativo.",
      "Meta (WhatsApp Business Platform): envio e recebimento das mensagens do WhatsApp.",
      "Anthropic: interpretação das mensagens e assistente de IA.",
      "OpenAI: transcrição de áudios enviados ao bot.",
    ],
  },
  {
    title: "6. Transferência internacional",
    paragraphs: [
      "Alguns desses fornecedores processam dados em servidores fora do Brasil. Nesses casos, buscamos fornecedores que ofereçam salvaguardas adequadas de proteção de dados, conforme a LGPD.",
    ],
  },
  {
    title: "7. Por quanto tempo guardamos",
    paragraphs: [
      "Mantemos os seus dados enquanto a sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais ou resolver disputas. Lançamentos pendentes de confirmação pelo WhatsApp expiram em poucos minutos. Ao excluir a sua conta, apagamos ou anonimizamos os seus dados, salvo quando a lei exigir a guarda.",
    ],
  },
  {
    title: "8. Segurança",
    paragraphs: [
      "Adotamos medidas técnicas razoáveis para proteger os seus dados, como conexão criptografada (HTTPS), controle de acesso por usuário no banco de dados, verificação de assinatura nas mensagens recebidas da Meta e confirmação antes de gravar lançamentos. Nenhum sistema é totalmente imune a falhas, e por isso recomendamos que você use uma senha forte e exclusiva.",
    ],
  },
  {
    title: "9. Seus direitos",
    paragraphs: [
      "Pela LGPD, você pode solicitar, a qualquer momento:",
    ],
    items: [
      "confirmação de que tratamos os seus dados e acesso a eles;",
      "correção de dados incompletos, inexatos ou desatualizados;",
      "anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;",
      "portabilidade dos dados, quando aplicável;",
      "informação sobre com quem compartilhamos os dados;",
      "revogação do consentimento e eliminação dos dados tratados com base nele.",
    ],
  },
  {
    title: "10. Como pedir a exclusão dos seus dados",
    paragraphs: [
      `Para excluir a sua conta e os dados associados, envie um e-mail para ${EMAIL} a partir do e-mail cadastrado, com o assunto Exclusão de dados. Para parar de usar o WhatsApp, basta desvincular o número na página WhatsApp do app. Respondemos aos pedidos em prazo razoável, conforme a LGPD.`,
    ],
  },
  {
    title: "11. Menores de idade",
    paragraphs: [
      "O Forge Finance não é destinado a menores de 18 anos, e não coletamos dados de menores de forma intencional.",
    ],
  },
  {
    title: "12. Alterações desta política",
    paragraphs: [
      "Podemos atualizar esta política para refletir mudanças no app ou na lei. A data da última atualização fica no topo desta página.",
    ],
  },
  {
    title: "13. Contato",
    paragraphs: [
      `Dúvidas, pedidos ou reclamações sobre privacidade: ${CONTROLLER} - ${EMAIL}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#09090B] px-4 py-12 text-slate-300">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-8">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
            Forge Finance
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Política de Privacidade
          </h1>

          <p className="mt-2 text-slate-400">Última atualização: {UPDATED}</p>
        </header>

        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-6"
          >
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>

            {section.paragraphs?.map((text) => (
              <p key={text} className="mt-3 leading-relaxed">
                {text}
              </p>
            ))}

            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="pb-6 text-center text-sm text-slate-500">
          <a
            href={`mailto:${EMAIL}`}
            className="underline underline-offset-4 hover:text-slate-300"
          >
            {EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
