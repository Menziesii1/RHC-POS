import type { BootstrapResponse } from "@rhc-pos/shared";

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
    <section className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f8]">
      {/* ── Scrollable product grid ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {visibleProducts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#263362]/40">
            No items in this category.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="flex min-h-[100px] flex-col justify-between border border-[#dde2ea] bg-white p-4 text-left transition duration-100 hover:border-[#5190E6] hover:bg-[#f7f9fd] active:bg-[#eef4fd]"
                style={{ borderRadius: 4 }}
                onClick={() => onSelectProduct(product.id)}
              >
                <span className="font-display text-[1.1rem] font-bold leading-snug text-[#263362]">
                  {product.name}
                </span>
                <span className="mt-2 text-base font-extrabold text-[#5190E6]">
                  ${(product.priceCents / 100).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Category tab bar ── */}
      <div className="flex shrink-0 border-t border-[#dde2ea] bg-white">
        <button
          type="button"
          className={`flex-1 border-r border-[#dde2ea] py-4 text-sm font-bold uppercase tracking-wider transition ${
            selectedCategoryId === "all"
              ? "bg-[#263362] text-white"
              : "text-[#263362]/60 hover:bg-[#f7f9fd] hover:text-[#263362]"
          }`}
          onClick={() => onSelectCategory("all")}
        >
          All
        </button>
        {allCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`flex-1 border-r border-[#dde2ea] py-4 text-sm font-bold uppercase tracking-wider transition last:border-r-0 ${
              selectedCategoryId === category.id
                ? "bg-[#263362] text-white"
                : "text-[#263362]/60 hover:bg-[#f7f9fd] hover:text-[#263362]"
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </section>
  );
}
