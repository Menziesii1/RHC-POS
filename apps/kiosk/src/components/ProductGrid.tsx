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
    <section className="touch-card flex min-h-[560px] flex-col gap-5 p-5">
      <div>
        <div className="font-display text-3xl font-extrabold text-[#263362]">Register</div>
        <div className="brand-kicker mt-1">Tap an item, then customize flavors if needed.</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          className={`touch-button min-w-[120px] uppercase tracking-[0.16em] ${
            selectedCategoryId === "all" ? "bg-[#263362] text-white" : "bg-[#f7fbff] text-[#263362]"
          }`}
          onClick={() => onSelectCategory("all")}
        >
          All
        </button>
        {bootstrap.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`touch-button min-w-[120px] uppercase tracking-[0.16em] ${
              selectedCategoryId === category.id ? "bg-[#5190E6] text-white" : "bg-[#f7fbff] text-[#263362]"
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="brand-divider" />

      <div className="grid flex-1 grid-cols-2 gap-4 overflow-auto pr-1 xl:grid-cols-3">
        {visibleProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            className="touch-button flex min-h-[120px] flex-col justify-between border-[#cfddee] bg-white p-5 text-[#263362]"
            onClick={() => onSelectProduct(product.id)}
          >
            <span className="font-display text-2xl font-extrabold tracking-tight">{product.name}</span>
            <span className="self-start border border-[#1CE4DB]/20 bg-[#1CE4DB]/10 px-3 py-1 text-xl font-bold text-[#263362]">
              ${(product.priceCents / 100).toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
