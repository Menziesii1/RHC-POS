import type { BootstrapResponse, CartInput, DraftOrder } from "@rhc-pos/shared";

import type { SyncConfig } from "./config.js";
import { HttpError } from "./lib/http-error.js";
import type { RemoteApiClient } from "./types.js";

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new HttpError(response.status, payload?.message ?? `Remote request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createRemoteApiClient(config: SyncConfig): RemoteApiClient {
  return {
    fetchBootstrap: () => request<BootstrapResponse>(config.REMOTE_API_BASE_URL, "/bootstrap"),
    verifyLockPin: (payload: unknown) =>
      request<{ ok: true }>(config.REMOTE_API_BASE_URL, "/verify-lock-pin", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    createOrder: (payload: CartInput) =>
      request<DraftOrder>(config.REMOTE_API_BASE_URL, "/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    payCash: (orderId: string, tenderedCents: number) =>
      request<DraftOrder>(config.REMOTE_API_BASE_URL, `/orders/${orderId}/pay-cash`, {
        method: "POST",
        body: JSON.stringify({ tenderedCents }),
      }),
  };
}
