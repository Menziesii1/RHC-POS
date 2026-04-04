import { formatCurrency, type BootstrapResponse, type Product } from "@rhc-pos/shared";
import { useMemo, useState } from "react";

interface AdminPanelProps {
  bootstrap: BootstrapResponse;
  adminPin: string;
  onClose: () => void;
  onProductSave: (productId: string, patch: Partial<Product>) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
}

export function AdminPanel({
  bootstrap,
  adminPin,
  onClose,
  onProductSave,
  onTaxSave,
}: AdminPanelProps) {
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
  const [drafts, setDrafts] = useState<Record<string, { priceCents: number; enabled: boolean }>>({});
  const visibleProducts = useMemo(() => bootstrap.products.slice().sort((a, b) => a.sortOrder - b.sortOrder), [bootstrap.products]);

  return (
    <div className="touch-card min-h-[720px] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-display text-4xl font-bold text-bark">Admin</div>
          <div className="text-sm text-bark/70">PIN unlocked for this session only.</div>
        </div>
        <button type="button" className="rounded-full bg-oat px-5 py-3 text-lg font-bold text-bark" onClick={onClose}>
          Back
        </button>
      </div>

      <div className="mb-6 rounded-[22px] bg-oat p-5">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-bark/60">Store Settings</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            step="0.01"
            className="rounded-[18px] border border-bark/15 bg-white px-4 py-3 text-lg"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-bark px-5 py-3 text-lg font-bold text-white"
            onClick={() => void onTaxSave(Math.round(Number(taxRate || "0") * 100))}
          >
            Save Tax Rate
          </button>
          <span className="text-sm text-bark/60">Admin PIN loaded: {adminPin.length > 0 ? "yes" : "no"}</span>
        </div>
      </div>

      <div className="space-y-3">
        {visibleProducts.map((product) => {
          const draft = drafts[product.id] ?? { priceCents: product.priceCents, enabled: product.enabled };
          return (
            <div key={product.id} className="rounded-[22px] bg-cream p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold text-bark">{product.name}</div>
                  <div className="text-sm text-bark/60">{product.id}</div>
                </div>
                <label className="flex items-center gap-2 text-lg font-semibold text-bark">
                  Enabled
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...draft, enabled: event.target.checked },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  className="rounded-[18px] border border-bark/15 bg-white px-4 py-3 text-lg"
                  value={(draft.priceCents / 100).toFixed(2)}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [product.id]: {
                        ...draft,
                        priceCents: Math.round(Number(event.target.value || "0") * 100),
                      },
                    }))
                  }
                />
                <div className="text-sm text-bark/60">Current: {formatCurrency(product.priceCents)}</div>
                <button
                  type="button"
                  className="rounded-full bg-roast px-5 py-3 text-lg font-bold text-white"
                  onClick={() => void onProductSave(product.id, draft)}
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
