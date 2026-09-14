import { normaliseHexColor } from "@/lib/utils/color";

/**
 * Applies administrator-chosen brand colours by overriding the design tokens.
 *
 * Because every component reads colour through `var(--color-*)`, redefining two
 * variables re-skins buttons, links and dark surfaces without any component
 * knowing a setting exists.
 *
 * The values are re-validated as strict six-digit hex before being written into
 * a style element. They were validated on save, but anything interpolated into
 * a stylesheet is checked again at the point of output — a stored value is not
 * a trusted value.
 */
export function BrandTheme({
  primary,
  secondary,
}: {
  primary: string | null;
  secondary: string | null;
}) {
  const primaryHex = primary ? normaliseHexColor(primary) : null;
  const secondaryHex = secondary ? normaliseHexColor(secondary) : null;

  if (!primaryHex && !secondaryHex) return null;

  const declarations = [
    primaryHex ? `--color-primary:${primaryHex};` : "",
    primaryHex ? `--color-ring:${primaryHex};` : "",
    secondaryHex ? `--color-secondary:${secondaryHex};` : "",
  ].join("");

  return <style>{`:root{${declarations}}`}</style>;
}
