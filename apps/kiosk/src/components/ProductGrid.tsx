import { Coffee, UtensilsCrossed, CupSoda, IceCreamCone, Tag, Wheat, Candy, Soup, Sandwich } from "lucide-react";
import type { BootstrapResponse } from "@rhc-pos/shared";
import { formatCurrency } from "@rhc-pos/shared";
import { getProductImage } from "../lib/product-images";
import logoUrl from "../../assets/River Hills Logo without text Colored.svg?url";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  drink: Coffee,
  hot: Coffee,
  cold: CupSoda,
  food: UtensilsCrossed,
  kids: IceCreamCone,
  discount: Tag,
  pastry: Wheat,
  sweet: Candy,
  soup: Soup,
  sandwich: Sandwich,
};

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Coffee;
}

interface ProductGridProps {
  bootstrap: BootstrapResponse;
  selectedCategoryId: string;
  onSelectProduct: (productId: string) => void;
}

export function ProductGrid({ bootstrap, selectedCategoryId, onSelectProduct }: ProductGridProps) {
  const allCategories = bootstrap.categories.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  const visibleProducts = bootstrap.products
    .filter((p) => p.enabled && (selectedCategoryId === "all" || p.categoryId === selectedCategoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-grid)]">

      {/* Product grid — logo watermark behind cards */}
      <div className="relative flex-1 overflow-y-auto bg-[var(--bg-grid-inner)] p-4">
        {/* Watermark */}
        <img
          src={logoUrl}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-[70%] w-[70%] object-contain opacity-[0.04]"
          draggable={false}
        />

        {visibleProducts.length === 0 ? (
          <div className="relative flex h-full flex-col items-center justify-center gap-2 text-[var(--text-dimmest)]">
            <Coffee size={36} strokeWidth={1.5} />
            <span className="text-sm">No items here</span>
          </div>
        ) : (
          <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const category = allCategories.find((c) => c.id === product.categoryId);
              const ItemIcon = category ? getCategoryIcon(category.name) : Coffee;
              const photo = getProductImage(product.name);

              return (
                <button
                  key={product.id}
                  type="button"
                  className="group flex flex-col overflow-hidden rounded-xl bg-[var(--bg-card)] text-left shadow-md transition active:scale-[0.97] hover:bg-[var(--bg-card-hover)]"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {/* Photo or icon area */}
                  <div className="flex h-32 w-full items-center justify-center overflow-hidden bg-[var(--bg-surface)]">
                    {photo ? (
                      <img
                        src={photo.src}
                        alt={product.name}
                        className="h-full w-full object-contain p-3 transition group-hover:scale-105 drop-shadow-lg"
                        style={photo.scale !== 1 ? { transform: `scale(${photo.scale})` } : undefined}
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1be4db]/10 transition group-hover:bg-[#1be4db]/15">
                        <ItemIcon size={24} className="text-[#1be4db]" />
                      </div>
                    )}
                  </div>
                  {/* Text area */}
                  <div className="px-2.5 py-2 text-center bg-[var(--bg-card)]">
                    <div className="text-sm font-semibold leading-tight text-[var(--text-primary)]">{product.name}</div>
                    <div className="mt-0.5 text-sm font-bold text-[#0a8f89]">{formatCurrency(product.priceCents)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
