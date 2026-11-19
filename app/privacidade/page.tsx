import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { SELLER_NAME } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Política de Privacidade | Forge Finance",
  description:
    "Como o Forge Finance coleta, usa e protege seus dados pessoais, incluindo o registro de gastos pelo WhatsApp.",
};

const CONTROLLER = SELLER_NAME;
const EMAIL = SUPPORT_EMAIL;
const UPDATED = "18 de novembro de 2026";

const SECTIONS: LegalSection[] = [
  {
    title: "1. Quem somos",
    paragraphs: [
      `O Forge Finance é um aplicativo de controle financeiro pessoal e para Microempreendedores Individuais (MEI). O responsável pelo tratamento dos seus dados pessoais (controlador, nos termos da Lei Geral de Proteção de Dados, LGPD, Lei 13.709/2018) é ${CONTROLLER}, pessoa física, que pode ser contatado pelo e-mail ${EMAIL}.`,
    ],
  },
  {
    title: "2. Quais dados coletamos",
    items: [
      "Dados de cadastro e acesso: nome (se informado), e-mail e credenciais de autenticação.",
      "Dados financeiros que você mesmo registra: contas, saldos, transações, categorias, metas, orçamentos e investimentos.",
      "Dados do modo Empresa, se você usar: clientes, contas a pagar e a receber, DAS e configurações do MEI.",
      "Dados da assinatura: plano, período, situação do pagamento e identificadores do Stripe.",
      "Mensagens que você envia ao suporte pelo aplicativo.",
      "Número de WhatsApp que você vincula ao app, usado para reconhecer que as mensagens vêm de você.",
      "Mensagens que você envia ao bot do WhatsApp (texto ou áudio) com gastos e receitas a registrar.",
      "Dados técnicos de funcionamento e segurança, como identificadores de mensagens (para evitar lançamentos duplicados) e registros de erros.",
    ],
  },
  {
    title: "3. Para que usamos seus dados",
    items: [
      "Prestar o serviço: criar sua conta, mostrar seus lançamentos, relatórios e dashboards.",
      "Registrar gastos e receitas enviados pelo WhatsApp. Lançamentos claros são salvos na hora, com um botão para desfazer por 24 horas; exclusões, alterações e casos com dúvida pedem a sua confirmação antes.",
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
      "Lançamentos claros são gravados na hora, com um botão para desfazer por 24 horas. Exclusões, alterações e casos com dúvida só são gravados depois que você toca em Confirmar; pedidos não confirmados expiram e são descartados.",
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
      "Stripe: processamento dos pagamentos das assinaturas. Os dados do cartão são informados diretamente ao Stripe e não passam nem ficam guardados no Forge Finance.",
      "Sentry: registro de erros técnicos do aplicativo.",
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
      "Adotamos medidas técnicas razoáveis para proteger os seus dados, como conexão criptografada (HTTPS), controle de acesso por usuário no banco de dados, verificação de assinatura nas mensagens recebidas da Meta e do Stripe, e confirmação antes de excluir ou alterar dados pelo WhatsApp. Nenhum sistema é totalmente imune a falhas, e por isso recomendamos que você use uma senha forte e exclusiva.",
      "A equipe do Forge Finance usa um painel administrativo restrito, que mostra dados da conta (nome, e-mail, plano, datas de uso, quantidade de lançamentos e se o WhatsApp está conectado) e as mensagens enviadas ao suporte. Esse painel não mostra o conteúdo dos seus lançamentos, saldos ou valores, e as ações da equipe ficam registradas.",
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
      `Em Configurações > Seus dados você baixa uma cópia completa dos seus dados (arquivo JSON) e pode excluir a conta: a exclusão apaga a conta e todos os dados associados na hora. Se preferir, envie um e-mail para ${EMAIL} a partir do e-mail cadastrado, com o assunto Exclusão de dados. Para parar de usar o WhatsApp, basta desvincular o número na página WhatsApp do app. Respondemos aos pedidos em prazo razoável, conforme a LGPD.`,
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
  return <LegalPage title="Política de Privacidade" updated={UPDATED} email={EMAIL} sections={SECTIONS} />;
}
