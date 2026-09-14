"use client";

import { useId, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type AccordionItemData = {
  id: string;
  question: ReactNode;
  answer: ReactNode;
};

type AccordionProps = {
  items: AccordionItemData[];
  /** Single-open behaviour is the default; FAQs read better that way. */
  allowMultiple?: boolean;
  defaultOpenId?: string;
  className?: string;
};

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenId,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : [],
  );

  const toggle = (id: string) => {
    setOpenIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return allowMultiple ? [...current, id] : [id];
    });
  };

  return (
    <div className={cn("border-line divide-line divide-y border-y", className)}>
      {items.map((item) => {
        const open = openIds.includes(item.id);
        const triggerId = `${baseId}-trigger-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group text-ink flex w-full items-start justify-between gap-6 py-5 text-left"
              >
                <span className="text-h4 group-hover:text-primary transition-colors">
                  {item.question}
                </span>
                <Plus
                  aria-hidden="true"
                  className={cn(
                    "text-ink-muted mt-1 size-5 shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                    open && "rotate-45",
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!open}
              className="pb-6"
            >
              <div className="prose-hn max-w-[70ch]">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
