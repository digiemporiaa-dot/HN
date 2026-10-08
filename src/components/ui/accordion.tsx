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
                className="group text-ink flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span className="text-h4 group-hover:text-primary text-safe transition-colors">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "border-line-strong text-ink-muted group-hover:border-primary group-hover:text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color,color,background-color] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                    open && "bg-primary border-primary rotate-45 text-white group-hover:text-white",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            {/* Collapsed with a grid-row transition rather than `hidden`, so
                it animates; `inert` keeps a closed panel out of the tab order
                and the accessibility tree all the same. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="prose-hn max-w-[70ch] pr-12 pb-7">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
