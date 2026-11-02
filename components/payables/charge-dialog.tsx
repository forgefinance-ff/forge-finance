"use client";

import { useState } from "react";
import { MessageCircleIcon } from "lucide-react";

import { inputClass } from "@/components/customers/customer-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import type { Payable } from "@/lib/payables-shared";
import { formatBrPhone, whatsappLink } from "@/lib/phone";

function defaultMessage(payable: Payable, today: string) {
  const firstName = payable.customer_name?.split(" ")[0] ?? "";
  const due = formatDateBR(payable.due_date);
  const when =
    payable.due_date < today
      ? `que venceu em ${due}`
      : payable.due_date === today
        ? `que vence hoje (${due})`
        : `com vencimento em ${due}`;

  return `Olá, ${firstName}! Tudo bem? 😊

Passando para lembrar do pagamento de *${payable.description}*, no valor de *${formatCurrency(payable.amount)}*, ${when}.

Se já fez o pagamento, por favor desconsidere esta mensagem. Qualquer dúvida, estou à disposição.

Obrigado!`;
}

type Props = {
  payable: Payable | null;
  today: string;
  onClose: () => void;
};

/**
 * Abre o WhatsApp do usuário (wa.me) com uma mensagem pronta e editável.
 * Nada é enviado pela API: quem envia é o próprio usuário.
 */
export function ChargeDialog({ payable, today, onClose }: Props) {
  return (
    <Dialog open={payable !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {payable?.customer_phone && (
          <ChargeBody key={payable.id} payable={payable} today={today} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChargeBody({
  payable,
  today,
  onClose,
}: {
  payable: Payable;
  today: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(() => defaultMessage(payable, today));
  const phone = payable.customer_phone!;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Cobrar {payable.customer_name} pelo WhatsApp</DialogTitle>
        <DialogDescription>
          Revise a mensagem. Ela abre no seu WhatsApp para {formatBrPhone(phone)} e só é
          enviada quando você tocar em enviar lá.
        </DialogDescription>
      </DialogHeader>

      <label htmlFor="charge-message" className="sr-only">
        Mensagem de cobrança
      </label>
      <textarea
        id="charge-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={9}
        maxLength={1500}
        className={`${inputClass} resize-y text-sm`}
      />

      <DialogFooter>
        <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
          Fechar
        </button>
        <a
          href={whatsappLink(phone, message.trim())}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          aria-disabled={!message.trim()}
          className={buttonVariants()}
        >
          <MessageCircleIcon className="h-4 w-4" />
          Abrir WhatsApp
        </a>
      </DialogFooter>
    </div>
  );
}
