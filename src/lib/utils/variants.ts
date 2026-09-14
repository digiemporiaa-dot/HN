import { cn } from "./cn";

type VariantShape = Record<string, Record<string, string>>;

type VariantSelection<V extends VariantShape> = {
  [K in keyof V]?: keyof V[K] | null;
};

export type VariantArgs<V extends VariantShape> = VariantSelection<V> & {
  className?: string;
};

/**
 * Minimal variant builder. Deliberately local rather than a dependency: the
 * whole contract is "pick one value per axis, merge the classes".
 */
export function variants<V extends VariantShape>(config: {
  base: string;
  variants: V;
  defaults?: VariantSelection<V>;
}) {
  return (args: VariantArgs<V> = {}): string => {
    const classes: string[] = [config.base];

    for (const axis of Object.keys(config.variants) as (keyof V)[]) {
      const selected = args[axis] ?? config.defaults?.[axis];
      if (selected == null) continue;
      const value = config.variants[axis][selected as string];
      if (value) classes.push(value);
    }

    return cn(classes, args.className);
  };
}
