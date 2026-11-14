"use client";

import { useId, useState } from "react";

type Item = { q: string; a: string };

/** FAQ accordion: grid-rows 0fr → 1fr with a soft blur on the answer (transitions.dev). */
export function FaqList({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-${index}`;
        return (
          <div key={item.q} className="t-acc uv-faq__item t-reveal-item" data-open={isOpen} style={{ "--i": index } as React.CSSProperties}>
            <button
              type="button"
              className="uv-faq__q"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              {item.q}
              <span className="uv-faq__mark" aria-hidden>+</span>
            </button>
            <div id={panelId} role="region" className="t-acc-panel">
              <div className="t-acc-panel-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
