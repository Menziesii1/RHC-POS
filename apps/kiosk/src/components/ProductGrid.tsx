import { Coffee, UtensilsCrossed, CupSoda, IceCreamCone, Tag, Wheat, Candy, Soup, Sandwich } from "lucide-react";
import type { BootstrapResponse } from "@rhc-pos/shared";
import { formatCurrency } from "@rhc-pos/shared";
import { getProductImage } from "../lib/product-images";

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
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export function ProductGrid({ bootstrap, selectedCategoryId, onSelectCategory, onSelectProduct }: ProductGridProps) {
  const allCategories = bootstrap.categories.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  const visibleProducts = bootstrap.products
    .filter((p) => p.enabled && (selectedCategoryId === "all" || p.categoryId === selectedCategoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0c1520]">
      {/* Category tabs — horizontal, top */}
      <div className="shrink-0 flex overflow-x-auto bg-[#0c1520] px-4 pt-4 gap-1">
        <button
          type="button"
          className={`shrink-0 rounded-t-xl px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition ${
            selectedCategoryId === "all"
              ? "bg-[#162231] text-[#1be4db]"
              : "text-white/35 hover:text-white/55"
          }`}
          onClick={() => onSelectCategory("all")}
        >
          All
        </button>
        {allCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`shrink-0 rounded-t-xl px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition ${
              selectedCategoryId === category.id
                ? "bg-[#162231] text-[#1be4db]"
                : "text-white/35 hover:text-white/55"
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto bg-[#162231] p-4">
        {visibleProducts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/25">
            <Coffee size={36} strokeWidth={1.5} />
            <span className="text-sm">No items here</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const category = allCategories.find((c) => c.id === product.categoryId);
              const ItemIcon = category ? getCategoryIcon(category.name) : Coffee;
              const photo = getProductImage(product.name);

              return (
                <button
                  key={product.id}
                  type="button"
                  className="group flex flex-col overflow-hidden rounded-xl bg-[#0f1923] text-left transition active:scale-[0.97] hover:bg-[#0c1520]"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {/* Photo or icon area — fixed height so all cards are uniform */}
                  <div className="flex h-44 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1be4db]/10 to-[#5191e5]/10">
                    {photo ? (
                      <img
                        src={photo}
                        alt={product.name}
                        className="h-full w-full object-contain p-4 transition group-hover:scale-105 drop-shadow-lg"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1be4db]/20 to-[#5191e5]/20 transition group-hover:from-[#1be4db]/30 group-hover:to-[#5191e5]/30">
                        <ItemIcon size={32} className="text-[#1be4db]" />
                      </div>
                    )}
                  </div>
                  {/* Text area */}
                  <div className="px-3 py-3">
                    <div className="text-sm font-semibold leading-tight text-white">{product.name}</div>
                    <div className="mt-1 text-base font-bold text-[#1be4db]">{formatCurrency(product.priceCents)}</div>
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
