import { calculateLinePrice, calculateTax, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";

import type { CartLineState } from "../types/ui";

export function getProduct(bootstrap: BootstrapResponse | null, productId: string) {
  return bootstrap?.products.find((product) => product.id === productId);
}

export function getModifier(bootstrap: BootstrapResponse | null, modifierId: string) {
  return bootstrap?.modifiers.find((modifier) => modifier.id === modifierId);
}

export function getSizeOption(bootstrap: BootstrapResponse | null, sizeOptionId: string | null | undefined) {
  if (!sizeOptionId) {
    return null;
  }
  return bootstrap?.sizes.find((size) => size.id === sizeOptionId) ?? null;
}

export function buildCartView(bootstrap: BootstrapResponse | null, lines: CartLineState[]) {
  const enriched = lines
    .map((line) => {
      const product = getProduct(bootstrap, line.productId);
      if (!product) {
        return null;
      }

      const sizeOption = getSizeOption(bootstrap, line.sizeOptionId ?? product.defaultSizeOptionId);
      const sizeAdjustmentOverride = product.sizeOptionPrices?.find(
        (entry) => entry.sizeOptionId === sizeOption?.id,
      );
      const modifiers = line.modifierIds
        .map((modifierId) => getModifier(bootstrap, modifierId))
        .filter((modifier): modifier is NonNullable<typeof modifier> => Boolean(modifier));

      const sizeAdjustmentCents = sizeAdjustmentOverride?.priceDeltaCents ?? sizeOption?.priceDeltaCents ?? 0;
      const flavorAdjustmentCents = modifiers.reduce((sum, modifier) => sum + modifier.priceCents, 0);
      const unitPriceCents = calculateLinePrice({
        basePriceCents: product.priceCents,
        sizeAdjustmentCents,
        flavorAdjustmentCents,
        discountCents: product.discountCents,
      });

      return {
        ...line,
        product,
        sizeOption,
        modifiers,
        unitPriceCents,
        sizeAdjustmentCents,
        flavorAdjustmentCents,
        discountCents: product.discountCents,
        lineTotalCents: unitPriceCents * line.quantity,
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  const subtotalCents = enriched.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const taxCents = calculateTax(subtotalCents, bootstrap?.settings.taxRateBasisPoints ?? 0);

  return {
    lines: enriched,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    subtotalLabel: formatCurrency(subtotalCents),
    taxLabel: formatCurrency(taxCents),
    totalLabel: formatCurrency(subtotalCents + taxCents),
  };
}
