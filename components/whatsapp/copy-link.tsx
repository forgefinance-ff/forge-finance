"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="max-w-full truncate rounded-xl border border-line bg-background-soft px-3 py-2 text-xs text-text-soft">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-xl border border-line px-3 py-2 text-xs font-medium text-foreground transition hover:bg-tint-strong"
      >
        {copied ? "Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
