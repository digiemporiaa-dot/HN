/**
 * Colour helpers used to keep administrator-chosen brand colours legible.
 *
 * Brand colour is a genuine business decision, but a primary colour that fails
 * contrast against white turns every button label into something people squint
 * at. The check below is applied when the setting is saved, so the problem is
 * caught at the point of choosing rather than discovered in an audit later.
 */

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

export function normaliseHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return HEX_PATTERN.test(trimmed) ? trimmed : null;
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const normalised = normaliseHexColor(hex);
  if (!normalised) return 0;

  const red = Number.parseInt(normalised.slice(1, 3), 16);
  const green = Number.parseInt(normalised.slice(3, 5), 16);
  const blue = Number.parseInt(normalised.slice(5, 7), 16);

  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

/** WCAG 2.1 contrast ratio, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal-size text. */
export const MINIMUM_CONTRAST = 4.5;

export function meetsContrast(
  foreground: string,
  background: string,
  minimum = MINIMUM_CONTRAST,
): boolean {
  return contrastRatio(foreground, background) >= minimum;
}
