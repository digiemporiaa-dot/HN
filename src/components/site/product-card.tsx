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
        "group relative flex h-full w-full flex-col gap-4",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-[var(--color-ring)] rounded-xl",
      )}
    >
      {/* The equipment takes most of the card; the words sit below it. */}
      <div className="bg-surface-panel relative overflow-hidden rounded-xl transition-colors duration-[var(--duration-base)] group-hover:bg-steel-200/60">
        <RecordImage
          kind="product"
          name={`${product.name} ${product.categoryName}`}
          image={product.image}
          sizes={sizes}
          priority={priority}
          fit="contain"
          frameClassName="zoom-media aspect-square bg-transparent [&>img]:p-[11%]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-0.5">
        <p className="eyebrow">{product.categoryName}</p>
        <h3 className="text-body text-ink text-safe leading-snug font-semibold">
          <Link
            href={productPath(product.slug)}
            className="after:absolute after:inset-0 after:z-[1] after:rounded-xl focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.shortDescription ? (
          <p className="text-ink-muted line-clamp-2 text-[0.8125rem] leading-relaxed">
            {product.shortDescription}
          </p>
        ) : null}
        {meta ? <p className="text-ink-subtle text-[0.75rem]">{meta}</p> : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="text-ink group-hover:text-primary inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors">
            View product
            <ArrowRight aria-hidden="true" className="arrow-nudge size-3.5" />
          </span>
          <AddToQuoteButton
            productId={product.id}
            productName={product.name}
            variant="quiet"
            compact
            className="relative z-[2]"
          />
        </div>
      </div>
    </Tag>
  );
}
