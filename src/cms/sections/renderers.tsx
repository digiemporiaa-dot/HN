import type { ReactNode } from "react";

import {
  CinematicHero,
  Hero,
  isCinematicHero,
  isShowcaseHero,
  ShowcaseHero,
} from "./render/hero";
import {
  AccordionSection,
  BrochureDownload,
  CallToAction,
  Certifications,
  Faq,
  FormSection,
  Gallery,
  HeadingText,
  IconCards,
  ImageText,
  ProcessSteps,
  RichTextSection,
  Statistics,
  TabsSection,
  Testimonials,
  Timeline,
  Video,
} from "./render/content";
import {
  ApplicationGrid,
  BrandGrid,
  CategoryGrid,
  Locations,
  LogoStrip,
  PostGrid,
  ProductGrid,
  SolutionGrid,
  SpecialtyGrid,
} from "./render/catalogue";
import { ImageCardsSection } from "./render/image-cards";
import {
  CategoryTiles,
  ImageBand,
  ProductBento,
  ProductFeature,
  SolutionTiles,
  StatementStats,
} from "./render/showcase";
import type { RendererProps } from "./render/shared";

export type { LocationGroup, RendererProps } from "./render/shared";

type Renderer = (props: RendererProps) => ReactNode;

/**
 * One renderer per section type.
 *
 * Every renderer reads its content defensively (missing fields are blank, not
 * errors) and every design option through the closed unions in
 * section-options, so content saved before a field or layout existed still
 * renders — in the layout it was designed in.
 */
export const SECTION_RENDERERS: Record<string, Renderer> = {
  HERO: (props) =>
    isCinematicHero(props)
      ? CinematicHero(props)
      : isShowcaseHero(props)
        ? ShowcaseHero(props)
        : Hero(props),
  HEADING_TEXT: HeadingText,
  RICH_TEXT: RichTextSection,
  IMAGE_TEXT: ImageText,
  STATISTICS: (props) =>
    props.design.layout === "bento" ? StatementStats(props) : Statistics(props),
  ICON_CARDS: IconCards,
  FAQ: Faq,
  CTA: (props) =>
    props.design.layout === "full" ? ImageBand(props) : CallToAction(props),
  PRODUCT_GRID: (props) =>
    props.design.layout === "bento"
      ? ProductBento(props)
      : props.design.layout === "editorial"
        ? ProductFeature(props)
        : ProductGrid(props),
  CATEGORY_GRID: (props) =>
    props.design.layout === "standard" && props.design.cardStyle !== "overlay"
      ? CategoryTiles(props)
      : CategoryGrid(props),
  SUBCATEGORY_GRID: CategoryGrid,
  BRAND_GRID: BrandGrid,
  SPECIALTY_GRID: SpecialtyGrid,
  SOLUTION_GRID: (props) =>
    props.design.layout === "bento" ? SolutionTiles(props) : SolutionGrid(props),
  APPLICATION_GRID: ApplicationGrid,
  POST_GRID: PostGrid,
  RELATED_LOCATIONS: Locations,
  LOGO_STRIP: LogoStrip,
  BROCHURE_DOWNLOAD: BrochureDownload,
  IMAGE_CARDS: ImageCardsSection,
  GALLERY: Gallery,
  VIDEO: Video,
  TESTIMONIALS: Testimonials,
  TRUST_CERTIFICATIONS: Certifications,
  TIMELINE: Timeline,
  PROCESS_STEPS: ProcessSteps,
  ACCORDION: AccordionSection,
  TABS: TabsSection,
  FORM: FormSection,
};

/**
 * Sections that draw their own full-bleed box instead of sitting inside the
 * shared Section wrapper.
 */
export function rendersOwnSection(type: string, props: RendererProps): boolean {
  return type === "HERO" && isCinematicHero(props);
}

