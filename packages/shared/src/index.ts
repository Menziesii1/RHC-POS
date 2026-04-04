import { z } from "zod";

export const idSchema = z.string().min(1);

export const modifierSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  enabled: z.boolean(),
  sortOrder: z.number().int().default(0),
});

export const categorySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const productSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  categoryId: idSchema,
  priceCents: z.number().int().nonnegative(),
  enabled: z.boolean(),
  sortOrder: z.number().int().default(0),
  modifierIds: z.array(idSchema).default([]),
});

export const staffProfileSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  active: z.boolean(),
});

export const cartItemInputSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().positive(),
  modifierIds: z.array(idSchema).default([]),
});

export const cartInputSchema = z.object({
  cashierId: idSchema,
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
  modifierIds: z.array(idSchema),
  modifierSummary: z.array(
    z.object({
      id: idSchema,
      name: z.string().min(1),
      priceCents: z.number().int().nonnegative(),
    }),
  ),
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

export const tenderTypeSchema = z.enum(["cash", "card"]);

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
});

export const bootstrapResponseSchema = z.object({
  settings: appSettingsSchema,
  status: registerStatusSchema,
  categories: z.array(categorySchema),
  products: z.array(productSchema),
  modifiers: z.array(modifierSchema),
  cashiers: z.array(staffProfileSchema),
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
});

export const adminPinSchema = z.object({
  pin: z.string().min(4).max(12),
});

export const upsertProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  categoryId: idSchema,
  priceCents: z.number().int().nonnegative(),
  enabled: z.boolean(),
  sortOrder: z.number().int().default(0),
  modifierIds: z.array(idSchema).default([]),
});

export const patchSettingsSchema = z.object({
  taxRateBasisPoints: z.number().int().min(0).max(10000).optional(),
  locationName: z.string().min(1).optional(),
  registerName: z.string().min(1).optional(),
});

export type Modifier = z.infer<typeof modifierSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type StaffProfile = z.infer<typeof staffProfileSchema>;
export type CartInput = z.infer<typeof cartInputSchema>;
export type DraftOrder = z.infer<typeof draftOrderSchema>;
export type RegisterStatus = z.infer<typeof registerStatusSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
export type UpsertProductInput = z.infer<typeof upsertProductSchema>;
export type PatchSettingsInput = z.infer<typeof patchSettingsSchema>;

export function calculateTax(subtotalCents: number, taxRateBasisPoints: number): number {
  return Math.round((subtotalCents * taxRateBasisPoints) / 10000);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
