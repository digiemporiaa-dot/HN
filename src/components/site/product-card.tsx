import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { productPath } from "@/server/products/service";
import type { ProductCardData } from "@/server/products/public";
import { AddToQuoteButton } from "./quote-basket";
import { RecordImage } from "./media";

/**
 * One product in a listing.
 *
 * The same card everywhere a product appears in a list, so a product looks the
 * same on the index, on a category page and in a related-products row. It
 * carries no price, because the catalogue has none to carry — it reads as a
 * technology product sheet rather than a shop listing.
 *
 * The title link is stretched over the card; the quotation button sits above
 * it, so the two never nest and a click meant for one never triggers the other.
 */
export function ProductCard({
  product,
  as: Tag = "li",
  sizes = "(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 92vw",
  priority,
}: {
  product: ProductCardData;
  as?: "li" | "div";
  sizes?: string;
  priority?: boolean;
}) {
  const meta = [product.brandName, product.modelNumber].filter(Boolean).join(" · ");

  return (
    <Tag
      className={cn(
        "group bg-surface-panel relative flex h-full w-full flex-col overflow-hidden rounded-2xl p-2",
        "transition-[background-color] duration-[var(--duration-base)] ease-[var(--ease-out-quart)] hover:bg-steel-200/60",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--color-ring)]",
      )}
    >
      <div className="relative">
        <RecordImage
          kind="product"
          name={`${product.name} ${product.categoryName}`}
          image={product.image}
          sizes={sizes}
          priority={priority}
          fit="contain"
          frameClassName="zoom-media aspect-[4/3] rounded-xl bg-transparent [&>img]:p-[7%]"
        />
        <span className="text-ink-muted absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-white/90 px-2 py-1 text-[0.6875rem] font-medium tracking-[0.06em] uppercase">
          {product.categoryName}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2 pb-3">
        <h3 className="text-body text-ink text-safe leading-snug font-semibold">
          <Link
            href={productPath(product.slug)}
            className="after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {meta ? <p className="text-ink-subtle text-[0.75rem]">{meta}</p> : null}
        {product.shortDescription ? (
          <p className="text-ink-muted line-clamp-2 text-[0.8125rem] leading-relaxed">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <span className="text-ink group-hover:text-primary inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors">
            View product
            <ArrowRight aria-hidden="true" className="arrow-nudge size-3.5" />
          </span>
          <AddToQuoteButton
            productId={product.id}
            productName={product.name}
            size="sm"
            compact
            className="relative z-[2] bg-white"
          />
        </div>
      </div>
    </Tag>
  );
}
