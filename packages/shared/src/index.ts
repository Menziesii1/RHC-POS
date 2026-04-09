import { z } from "zod";

export const idSchema = z.string().min(1);

export const categorySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export const sizeOptionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  priceDeltaCents: z.number().int().default(0),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const productSizePriceSchema = z.object({
  sizeOptionId: idSchema,
  priceDeltaCents: z.number().int().default(0),
});

export const flavorCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const modifierSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  priceCents: z.number().int().default(0),
  discountFlavor: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  flavorCategoryId: idSchema.nullable().optional(),
});

export const productTypeSchema = z.enum(["drink", "food", "discount", "kids"]);

export const productSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  categoryId: idSchema,
  priceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().default(0),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  productType: productTypeSchema.default("drink"),
  modifierIds: z.array(idSchema).default([]),
  sizeOptionIds: z.array(idSchema).default([]),
  sizeOptionPrices: z.array(productSizePriceSchema).default([]),
  defaultSizeOptionId: idSchema.nullable().default(null),
});

export const cartItemInputSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().positive(),
  sizeOptionId: idSchema.nullable().optional(),
  modifierIds: z.array(idSchema).default([]),
  isIced: z.boolean().optional(),
});

export const cartInputSchema = z.object({
  items: z.array(cartItemInputSchema).min(1),
});

export const moneySummarySchema = z.object({
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export const orderLineSchema = z.object({
  id: idSchema,
  productId: idSchema,
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  sizeOptionId: idSchema.nullable().optional(),
  sizeOptionName: z.string().min(1).nullable().optional(),
  sizeAdjustmentCents: z.number().int().default(0),
  modifierIds: z.array(idSchema),
  modifierSummary: z.array(
    z.object({
      id: idSchema,
      name: z.string().min(1),
      priceCents: z.number().int(),
      discountFlavor: z.boolean().default(false),
    }),
  ),
  isIced: z.boolean().nullable().optional(),
  flavorAdjustmentCents: z.number().int().default(0),
  discountCents: z.number().int().default(0),
  lineTotalCents: z.number().int().nonnegative(),
});

export const paymentStateSchema = z.enum([
  "idle",
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
]);

export const tenderTypeSchema = z.enum(["cash", "card", "split"]);

export const orderStatusSchema = z.enum([
  "draft",
  "awaiting_payment",
  "paid",
  "canceled",
]);

export const paymentSnapshotSchema = z.object({
  status: paymentStateSchema,
  tenderType: tenderTypeSchema.optional(),
  stripePaymentIntentId: z.string().optional(),
  stripeReaderActionId: z.string().optional(),
  stripeReaderId: z.string().optional(),
  failureMessage: z.string().optional(),
  tenderedCents: z.number().int().nonnegative().optional(),
  changeDueCents: z.number().int().nonnegative().optional(),
  splitCardCents: z.number().int().nonnegative().optional(),
  splitCashCents: z.number().int().nonnegative().optional(),
  paidCents: z.number().int().nonnegative().optional(),
});

export const draftOrderSchema = z.object({
  id: idSchema,
  orderNumber: z.string().min(1),
  status: orderStatusSchema,
  cashierId: idSchema,
  cashierName: z.string().min(1),
  lines: z.array(orderLineSchema),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  payment: paymentSnapshotSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const registerStatusSchema = z.object({
  internet: z.enum(["online", "offline"]),
  backend: z.enum(["online", "offline", "degraded"]),
  reader: z.enum(["ready", "busy", "offline", "unconfigured"]),
  stripe: z.enum(["connected", "degraded", "offline", "mock"]),
  lastWebhookAt: z.string().datetime().nullable(),
});

export const appSettingsSchema = z.object({
  locationId: idSchema,
  locationName: z.string().min(1),
  registerId: idSchema,
  registerName: z.string().min(1),
  taxRateBasisPoints: z.number().int().min(0).max(10000),
  recoveryTtlSeconds: z.number().int().positive(),
  adminPinConfigured: z.boolean(),
  lockScreenPinConfigured: z.boolean(),
});

export const salesBreakdownItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export const analyticsDailySeriesPointSchema = z.object({
  date: z.string(),
  totalSalesCents: z.number().int().nonnegative(),
  cashSalesCents: z.number().int().nonnegative(),
  cardSalesCents: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
});

export const analyticsProductSeriesPointSchema = z.object({
  date: z.string(),
  quantity: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export const analyticsProductSeriesSchema = z.object({
  productId: idSchema,
  productName: z.string().min(1),
  totalQuantity: z.number().int().nonnegative(),
  totalSalesCents: z.number().int().nonnegative(),
  daily: z.array(analyticsProductSeriesPointSchema),
});

export const analyticsRangeResponseSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().int().positive(),
  salesSeries: z.array(analyticsDailySeriesPointSchema),
  productSeries: z.array(analyticsProductSeriesSchema),
});

export const summaryResponseSchema = z.object({
  salesDate: z.string(),
  totalSalesCents: z.number().int().nonnegative(),
  cashSalesCents: z.number().int().nonnegative(),
  cardSalesCents: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  itemCounts: z.array(
    z.object({
      productId: idSchema,
      productName: z.string().min(1),
      quantity: z.number().int().nonnegative(),
    }),
  ),
  salesByCategory: z.array(salesBreakdownItemSchema).default([]),
  sizeBreakdown: z.array(salesBreakdownItemSchema).default([]),
  flavorBreakdown: z.array(
    salesBreakdownItemSchema.extend({
      adjustmentCents: z.number().int(),
      discountFlavor: z.boolean().default(false),
    }),
  ).default([]),
  topItems: z.array(
    z.object({
      productId: idSchema,
      productName: z.string().min(1),
      quantity: z.number().int().nonnegative(),
      totalCents: z.number().int().nonnegative(),
    }),
  ).default([]),
});

export const bootstrapResponseSchema = z.object({
  settings: appSettingsSchema,
  status: registerStatusSchema,
  categories: z.array(categorySchema),
  products: z.array(productSchema),
  modifiers: z.array(modifierSchema),
  sizes: z.array(sizeOptionSchema),
  flavorCategories: z.array(flavorCategorySchema).default([]),
});

export const adminPinSchema = z.object({
  pin: z.string().min(4).max(12),
});

export const upsertCategorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export const upsertSizeOptionSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  priceDeltaCents: z.number().int().default(0),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const upsertModifierSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  priceCents: z.number().int().default(0),
  discountFlavor: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  flavorCategoryId: idSchema.nullable().optional(),
});

export const upsertFlavorCategorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const upsertProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  categoryId: idSchema,
  priceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().default(0),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  productType: productTypeSchema.default("drink"),
  modifierIds: z.array(idSchema).default([]),
  sizeOptionIds: z.array(idSchema).default([]),
  sizeOptionPrices: z.array(productSizePriceSchema).default([]),
  defaultSizeOptionId: idSchema.nullable().default(null),
});

export const patchSettingsSchema = z.object({
  taxRateBasisPoints: z.number().int().min(0).max(10000).optional(),
  locationName: z.string().min(1).optional(),
  registerName: z.string().min(1).optional(),
  lockScreenPin: z.string().min(4).max(12).nullable().optional(),
});

export type Category = z.infer<typeof categorySchema>;
export type SizeOption = z.infer<typeof sizeOptionSchema>;
export type ProductSizePrice = z.infer<typeof productSizePriceSchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type Product = z.infer<typeof productSchema>;
export type CartInput = z.infer<typeof cartInputSchema>;
export type DraftOrder = z.infer<typeof draftOrderSchema>;
export type RegisterStatus = z.infer<typeof registerStatusSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
export type AnalyticsRangeResponse = z.infer<typeof analyticsRangeResponseSchema>;
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>;
export type UpsertSizeOptionInput = z.infer<typeof upsertSizeOptionSchema>;
export type FlavorCategory = z.infer<typeof flavorCategorySchema>;
export type UpsertModifierInput = z.infer<typeof upsertModifierSchema>;
export type UpsertFlavorCategoryInput = z.infer<typeof upsertFlavorCategorySchema>;
export type UpsertProductInput = z.infer<typeof upsertProductSchema>;
export type PatchSettingsInput = z.infer<typeof patchSettingsSchema>;

export interface LinePricingInput {
  basePriceCents: number;
  sizeAdjustmentCents?: number;
  flavorAdjustmentCents?: number;
  discountCents?: number;
}

/** Max discount from discount-flagged syrups, regardless of how many are selected. */
const MAX_DISCOUNT_SYRUP_CENTS = -100;

export function calculateFlavorAdjustment(
  modifiers: ReadonlyArray<{ priceCents: number; discountFlavor: boolean }>,
): number {
  const addOns = modifiers
    .filter((m) => !m.discountFlavor)
    .reduce((sum, m) => sum + m.priceCents, 0);

  const rawDiscount = modifiers
    .filter((m) => m.discountFlavor)
    .reduce((sum, m) => sum + m.priceCents, 0);

  const cappedDiscount = Math.max(rawDiscount, MAX_DISCOUNT_SYRUP_CENTS);

  return addOns + cappedDiscount;
}

export function calculateTax(subtotalCents: number, taxRateBasisPoints: number): number {
  return Math.round((subtotalCents * taxRateBasisPoints) / 10000);
}

export function calculateLinePrice(input: LinePricingInput): number {
  return Math.max(
    0,
    input.basePriceCents +
      (input.sizeAdjustmentCents ?? 0) +
      (input.flavorAdjustmentCents ?? 0) -
      (input.discountCents ?? 0),
  );
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
