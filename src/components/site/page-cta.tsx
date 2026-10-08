import type { ReactNode } from "react";

import { Section } from "@/components/ui";
import { SCENES, type Visual } from "@/lib/visuals";
import { SmartImage } from "./media";

/**
 * The closing call to action on catalogue and landing pages: a framed navy
 * panel over a faint clinical photograph, so every page ends on the same
 * decision without two dark bands stacking above the footer.
 */
export function PageCta({
  eyebrow = "Start a conversation",
  title,
  body,
  actions,
  image = SCENES.otAlt,
  background = "default",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actions: ReactNode;
  image?: Visual;
  background?: "default" | "pearl";
}) {
  return (
    <Section spacing="large" container="wide" background={background}>
      <div className="reveal surface-dark surface-navy gradient-border relative isolate overflow-hidden rounded-3xl px-6 py-12 shadow-[var(--shadow-float)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="media-frame absolute inset-0 -z-10 bg-transparent">
          <SmartImage src={image.url} alt="" sizes="100vw" className="opacity-50" />
        </div>
        <div
          aria-hidden="true"
          className="from-navy-975 via-navy-975/90 to-navy-975/40 absolute inset-0 -z-10 bg-gradient-to-r"
        />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-[44rem] flex-col gap-5">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="text-section text-safe max-w-[22ch] text-white">{title}</h2>
            {body ? <p className="text-lead max-w-[56ch] text-white/75">{body}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
      </div>
    </Section>
  );
}
