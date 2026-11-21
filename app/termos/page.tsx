import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { PIX_MANDATE_MAX_BRL, pixEnabled } from "@/lib/billing/config";
import { PLAN_PRICING, formatBRL } from "@/lib/billing/plans";
import { SELLER_LINE, SELLER_NAME } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Termos de Uso | Forge Finance",
  description: "Regras de uso do Forge Finance: planos, pagamento, renovação, cancelamento e direito de desistência.",
};

const EMAIL = SUPPORT_EMAIL;
const UPDATED = "21 de novembro de 2026";

const price = (plan: "pessoal" | "pro") =>
  `${formatBRL(PLAN_PRICING[plan].month.cents)} por mês ou ${formatBRL(PLAN_PRICING[plan].year.cents)} por ano`;

const PIX = pixEnabled();

const PAYMENT_ITEMS = [
  PIX
    ? "O pagamento é feito por cartão de crédito ou Pix Automático, processado pelo Stripe. Os dados de pagamento não passam pelo Forge Finance."
    : "O pagamento é feito por cartão de crédito, processado pelo Stripe. Os dados do cartão não passam pelo Forge Finance.",
  "A assinatura é renovada automaticamente ao fim de cada período (mensal ou anual), com cobrança na mesma forma de pagamento, até que você cancele.",
  ...(PIX
    ? [
        `No Pix Automático, você autoriza uma única vez, no app do seu banco, cobranças recorrentes de até ${formatBRL(PIX_MANDATE_MAX_BRL * 100)} por mês. O banco avisa antes de cada cobrança. Cancelar essa autorização no banco interrompe as cobranças, mas não cancela o plano: para cancelar, use Plano e assinatura.`,
      ]
    : []),
  "Se a cobrança falhar, poderemos tentar novamente. Sem o pagamento, a conta passa para o Forge Free.",
];

const SECTIONS: LegalSection[] = [
  {
    title: "1. Quem oferece o serviço",
    paragraphs: [
      `O Forge Finance é oferecido por ${SELLER_LINE}, pessoa física. Contato: ${EMAIL}.`,
      "Ao criar uma conta ou assinar um plano, você concorda com estes Termos e com a nossa Política de Privacidade.",
    ],
  },
  {
    title: "2. O que é o Forge Finance",
    paragraphs: [
      "O Forge Finance é uma ferramenta de organização financeira pessoal e para Microempreendedores Individuais (MEI), usada pelo aplicativo na web e pelo WhatsApp.",
      "O serviço não é banco, corretora nem instituição financeira, e não movimenta o seu dinheiro. As informações mostradas têm caráter organizacional: o Forge Finance não substitui um contador nem presta consultoria financeira, contábil, fiscal ou jurídica.",
    ],
  },
  {
    title: "3. Sua conta",
    items: [
      "Você precisa ter pelo menos 18 anos para usar o serviço.",
      "Informe dados verdadeiros e mantenha sua senha em segredo. Você responde pelo que for feito na sua conta.",
      "Os lançamentos são informados por você. Confira os dados registrados, inclusive os interpretados pela inteligência artificial, que pode cometer erros.",
    ],
  },
  {
    title: "4. Planos e preços",
    items: [
      "Forge Free: gratuito, com os recursos básicos no aplicativo e 10 consultas por mês ao assistente de IA.",
      `Forge Pessoal: ${price("pessoal")}. Inclui o registro pelo WhatsApp e 100 consultas por mês ao assistente de IA.`,
      `Forge MEI: ${price("pro")}. Inclui tudo do Forge Pessoal e o modo Empresa.`,
    ],
    paragraphs: [
      "Os preços estão em reais. Se um preço mudar, avisaremos antes da renovação, e você poderá cancelar se não concordar.",
    ],
  },
  {
    title: "5. Teste grátis",
    paragraphs: [
      "Novas contas têm 30 dias de teste grátis a partir do cadastro, com os recursos dos planos pagos e sem precisar informar cartão. Ao final do teste, a conta passa para o Forge Free, sem nenhuma cobrança automática.",
    ],
  },
  {
    title: "6. Pagamento e renovação",
    items: PAYMENT_ITEMS,
  },
  {
    title: "7. Cancelamento",
    paragraphs: [
      "Você pode cancelar quando quiser, sem multa e sem fidelidade, em Plano e assinatura. O plano continua ativo até o fim do período já pago e não é renovado. Depois disso, a conta passa para o Forge Free e os seus dados continuam disponíveis.",
      "Fora do prazo de desistência da seção 8, não há devolução proporcional do período já pago, exceto nos casos previstos em lei.",
    ],
  },
  {
    title: "8. Direito de desistência (7 dias)",
    paragraphs: [
      `Você pode desistir da assinatura em até 7 dias depois da contratação e receber de volta o valor pago, conforme o artigo 49 do Código de Defesa do Consumidor. Basta pedir pelo e-mail ${EMAIL} ou pelo suporte do aplicativo. O estorno é feito na mesma forma de pagamento da compra.`,
    ],
  },
  {
    title: "9. Uso permitido",
    paragraphs: ["Ao usar o serviço, você se compromete a não:"],
    items: [
      "usar o Forge Finance para atividades ilegais ou fraudes;",
      "tentar acessar dados de outras pessoas ou burlar as medidas de segurança;",
      "enviar mensagens automáticas em massa ou sobrecarregar o serviço;",
      "copiar, revender ou explorar o serviço sem autorização.",
    ],
  },
  {
    title: "10. Limites de uso e suspensão",
    paragraphs: [
      "Para proteger o serviço, existem limites técnicos contra envios automáticos e abusos. Podemos suspender ou encerrar contas que violem estes Termos, avisando você sempre que possível.",
    ],
  },
  {
    title: "11. Disponibilidade",
    paragraphs: [
      "Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções por manutenção ou por falhas de fornecedores, como provedores de hospedagem, WhatsApp e inteligência artificial. Recursos podem ser alterados para melhorar o serviço.",
    ],
  },
  {
    title: "12. Responsabilidade",
    paragraphs: [
      "Decisões financeiras, fiscais e contábeis tomadas com base nas informações do aplicativo são de sua responsabilidade. Nada nestes Termos limita os direitos garantidos a você pelo Código de Defesa do Consumidor.",
    ],
  },
  {
    title: "13. Seus dados",
    paragraphs: [
      "O tratamento dos seus dados pessoais está descrito na Política de Privacidade, disponível em /privacidade. Você pode baixar uma cópia dos seus dados e excluir a sua conta em Configurações > Seus dados. Se tiver uma assinatura ativa, cancele-a antes de excluir a conta.",
    ],
  },
  {
    title: "14. Alterações destes Termos",
    paragraphs: [
      "Podemos atualizar estes Termos. A data da última atualização fica no topo desta página e, em mudanças importantes, avisaremos você pelo aplicativo ou por e-mail.",
    ],
  },
  {
    title: "15. Lei aplicável e contato",
    paragraphs: [
      "Estes Termos seguem as leis do Brasil. Eventuais disputas podem ser levadas ao foro do seu domicílio, como consumidor.",
      `Dúvidas ou reclamações: ${SELLER_NAME} - ${EMAIL}.`,
    ],
  },
];

export default function TermsPage() {
  return <LegalPage title="Termos de Uso" updated={UPDATED} email={EMAIL} sections={SECTIONS} />;
}
