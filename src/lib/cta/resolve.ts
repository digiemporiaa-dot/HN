import { matchesRule } from "@/lib/popups/rules";
import type { CtaKind } from "./kinds";

/**
 * Which configuration a button uses.
 *
 * Pure, so the page that renders the button, the controller that opens the
 * popup and the server that accepts the submission all reach the same answer
 * from the same inputs. The server's answer is the one that counts: it decides
 * which fields are required and whether a file is released.
 *
 * Only active configurations of the button's own kind take part. Among them:
 *
 *   1. one the button names explicitly (a page-builder button's choice),
 *   2. one listing the button's placement,
 *   3. the default for the kind,
 *
 * and at each level one restricted to this product beats one restricted to
 * this page, which beats an unrestricted one. A configuration restricted to a
 * product or page that does not match is not a candidate at all. With no
 * candidate the button keeps its built-in behaviour (null).
 */
export type ResolvableConfig = {
  key: string;
  kind: CtaKind;
  isDefault: boolean;
  placements: string[];
  targetProductId: string | null;
  targetPaths: string[];
  /** ISO timestamp; the newer wins a tie. */
  updatedAt: string;
};

export type CtaContext = {
  kind: CtaKind;
  placement?: string | null;
  /** A configuration a page-builder button chose. */
  configKey?: string | null;
  productId?: string | null;
  /** The page the button is on. */
  path: string;
};

export function targetingMatches(config: ResolvableConfig, context: CtaContext): boolean {
  if (config.targetProductId && config.targetProductId !== (context.productId ?? null)) return false;
  if (config.targetPaths.length > 0 && !config.targetPaths.some((rule) => matchesRule(context.path, rule))) {
    return false;
  }
  return true;
}

export function specificity(config: ResolvableConfig, context: CtaContext): number {
  let level = 0;
  if (context.configKey && config.key === context.configKey) level = 300;
  else if (context.placement && config.placements.includes(context.placement)) level = 200;
  else if (config.isDefault) level = 100;
  else return -1;
  return level + (config.targetProductId ? 20 : 0) + (config.targetPaths.length > 0 ? 10 : 0);
}

export function resolveCta<T extends ResolvableConfig>(configs: readonly T[], context: CtaContext): T | null {
  let best: { config: T; score: number } | null = null;
  for (const config of configs) {
    if (config.kind !== context.kind) continue;
    if (!targetingMatches(config, context)) continue;
    const score = specificity(config, context);
    if (score < 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && config.updatedAt > best.config.updatedAt)
    ) {
      best = { config, score };
    }
  }
  return best?.config ?? null;
}
