import type {
  BootstrapResponse,
  DraftOrder,
  PatchSettingsInput,
  Product,
  SummaryResponse,
  UpsertProductInput,
} from "@rhc-pos/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getBootstrap: () => request<BootstrapResponse>("/bootstrap"),
  createOrder: (payload: { cashierId: string; items: Array<{ productId: string; quantity: number; modifierIds: string[] }> }) =>
    request<DraftOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOrder: (orderId: string) => request<DraftOrder>(`/orders/${orderId}`),
  payCash: (orderId: string, tenderedCents: number) =>
    request<DraftOrder>(`/orders/${orderId}/pay-cash`, {
      method: "POST",
      body: JSON.stringify({ tenderedCents }),
    }),
  startCard: (orderId: string) =>
    request<DraftOrder>(`/orders/${orderId}/pay-card/start`, {
      method: "POST",
    }),
  cancelCard: (orderId: string) =>
    request<DraftOrder>(`/orders/${orderId}/pay-card/cancel`, {
      method: "POST",
    }),
  getSummary: () => request<SummaryResponse>("/summary/today"),
  verifyAdminPin: (pin: string) =>
    request<{ ok: true }>("/admin/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
  listProducts: () => request<Product[]>("/admin/products"),
  createProduct: (pin: string, payload: UpsertProductInput) =>
    request<Product>("/admin/products", {
      method: "POST",
      headers: { "x-admin-pin": pin },
      body: JSON.stringify(payload),
    }),
  updateProduct: (pin: string, productId: string, payload: Partial<UpsertProductInput>) =>
    request<Product>(`/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "x-admin-pin": pin },
      body: JSON.stringify(payload),
    }),
  patchSettings: (pin: string, payload: PatchSettingsInput) =>
    request<BootstrapResponse["settings"]>("/admin/settings", {
      method: "PATCH",
      headers: { "x-admin-pin": pin },
      body: JSON.stringify(payload),
    }),
};
