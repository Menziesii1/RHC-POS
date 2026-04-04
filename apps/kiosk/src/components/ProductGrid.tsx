import type { BootstrapResponse } from "@rhc-pos/shared";

interface ProductGridProps {
  bootstrap: BootstrapResponse;
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export function ProductGrid({
  bootstrap,
  selectedCategoryId,
  onSelectCategory,
  onSelectProduct,
}: ProductGridProps) {
  const visibleProducts = bootstrap.products.filter(
    (product) =>
      product.enabled && (selectedCategoryId === "all" || product.categoryId === selectedCategoryId),
  );

  return (
    <section className="touch-card flex min-h-[560px] flex-col gap-5 p-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={`touch-button min-w-[120px] ${
            selectedCategoryId === "all" ? "bg-bark text-cream" : "bg-oat text-bark"
          }`}
          onClick={() => onSelectCategory("all")}
        >
          All
        </button>
        {bootstrap.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`touch-button min-w-[120px] ${
              selectedCategoryId === category.id ? "bg-bark text-cream" : "bg-oat text-bark"
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 xl:grid-cols-3">
        {visibleProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            className="touch-button flex min-h-[120px] flex-col justify-between bg-cream text-bark hover:bg-white"
            onClick={() => onSelectProduct(product.id)}
          >
            <span className="font-display text-2xl font-bold">{product.name}</span>
            <span className="text-xl font-bold">${(product.priceCents / 100).toFixed(2)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
