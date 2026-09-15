import Link from "next/link";

import { Card, CardContent } from "@/components/ui";
import { productPath } from "@/server/products/service";
import type { ProductCardData } from "@/server/products/public";

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

/**
 * One product in a listing.
 *
 * The same card everywhere a product appears in a list, so a product looks the
 * same on the index, on a category page and in a related-products row. It
 * carries no price, because the catalogue has none to carry.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Card as="li" interactive>
      <Link
        href={productPath(product.slug)}
        className="group flex h-full flex-col gap-3"
      >
        {product.image ? (
          <img
            src={product.image.url}
            alt={product.image.alt}
            loading="lazy"
            className="bg-surface-muted aspect-4/3 w-full rounded-md object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-surface-muted aspect-4/3 w-full rounded-md"
          />
        )}

        <CardContent className="flex flex-1 flex-col gap-1.5 p-0">
          <span className="text-caption text-ink-subtle">
            {[product.brandName, product.modelNumber]
              .filter(Boolean)
              .join(" · ") || product.categoryName}
          </span>
          <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
            {product.name}
          </span>
          {product.shortDescription ? (
            <span className="text-body-sm text-ink-muted line-clamp-3">
              {product.shortDescription}
            </span>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}

/* eslint-enable @next/next/no-img-element */
