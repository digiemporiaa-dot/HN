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
        "group border-line bg-surface relative flex h-full w-full flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]",
        "transition-[border-color,box-shadow,transform] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-card-hover)]",
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
          frameClassName="zoom-media aspect-[4/3] bg-pearl-100"
        />
        <span className="text-ink-muted absolute top-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase backdrop-blur-md">
          {product.categoryName}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
        {meta ? <p className="text-caption text-ink-subtle">{meta}</p> : null}
        <h3 className="text-h4 text-ink group-hover:text-primary text-safe transition-colors">
          <Link
            href={productPath(product.slug)}
            className="after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.shortDescription ? (
          <p className="text-body-sm text-ink-muted line-clamp-2">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="border-line mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t pt-4">
          <span className="text-body-sm text-primary inline-flex items-center gap-1.5 font-semibold whitespace-nowrap">
            View details
            <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
          </span>
          <AddToQuoteButton
            productId={product.id}
            productName={product.name}
            size="sm"
            compact
            className="relative z-[2]"
          />
        </div>
      </div>
    </Tag>
  );
}
