import { prisma } from "@/server/db";
import { getSectionDefinition } from "@/cms/sections/definitions";
import { hasPlaceholder } from "@/lib/cms/placeholders";

/**
 * Names of the enabled sections on a page or city that still hold template
 * placeholders, as an editor would recognise them: the section type and, when
 * it has one, its heading.
 */
export async function sectionsWithPlaceholders(
  owner: { pageId: string } | { cityId: string } | { postId: string },
): Promise<string[]> {
  const sections = await prisma.pageSection.findMany({
    where: { ...owner, enabled: true },
    orderBy: { order: "asc" },
    select: { type: true, content: true },
  });

  return sections
    .filter((section) => hasPlaceholder(section.content))
    .map((section) => describeSection(section.type, section.content));
}

export function describeSection(type: string, content: unknown): string {
  const label = getSectionDefinition(type)?.label ?? type;
  const heading = (content as Record<string, unknown> | null)?.heading;
  return typeof heading === "string" &&
    heading.trim() &&
    !hasPlaceholder(heading)
    ? `${label} “${heading.trim()}”`
    : label;
}

/** The refusal shown when placeholders stand between a page and going live. */
export function placeholderRefusal(labels: string[]): string {
  return `Replace the [[…]] placeholders before this goes live — they are still in: ${labels.join(", ")}. Or switch those sections off.`;
}
