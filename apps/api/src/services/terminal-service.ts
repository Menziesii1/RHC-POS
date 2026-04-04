import Stripe from "stripe";
import type { DraftOrder, RegisterStatus } from "@rhc-pos/shared";

import type { AppConfig } from "../config.js";

export interface TerminalStartResult {
  mode: "mock" | "stripe";
  status: "pending" | "succeeded" | "failed";
  stripePaymentIntentId?: string;
  stripeReaderActionId?: string;
  stripeReaderId?: string;
  failureMessage?: string;
}

export interface TerminalWebhookResult {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  paymentIntentId?: string;
  status?: "succeeded" | "failed" | "canceled";
  failureMessage?: string;
}

export interface TerminalService {
  getStatus(lastWebhookAt: string | null): Promise<Pick<RegisterStatus, "reader" | "stripe" | "backend" | "internet" | "lastWebhookAt">>;
  startPayment(order: DraftOrder): Promise<TerminalStartResult>;
  cancelPayment(order: DraftOrder): Promise<void>;
  parseWebhook(signature: string | undefined, rawBody: string): TerminalWebhookResult | null;
}

type TerminalStatus = Pick<RegisterStatus, "reader" | "stripe" | "backend" | "internet" | "lastWebhookAt">;

export class MockTerminalService implements TerminalService {
  async getStatus(lastWebhookAt: string | null): Promise<TerminalStatus> {
    return {
      internet: "online" as const,
      backend: "online" as const,
      reader: "unconfigured" as const,
      stripe: "mock" as const,
      lastWebhookAt,
    };
  }

  async startPayment(order: DraftOrder): Promise<TerminalStartResult> {
    return {
      mode: "mock",
      status: "succeeded",
      stripePaymentIntentId: `mock_pi_${order.id}`,
      stripeReaderActionId: `mock_action_${order.id}`,
      stripeReaderId: "mock-reader",
    };
  }

  async cancelPayment(): Promise<void> {}

  parseWebhook(): TerminalWebhookResult | null {
    return null;
  }
}

export class StripeTerminalService implements TerminalService {
  private readonly stripe: Stripe;

  constructor(private readonly config: AppConfig) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });
  }

  async getStatus(lastWebhookAt: string | null): Promise<TerminalStatus> {
    try {
      if (!this.config.STRIPE_READER_ID) {
        return {
          internet: "online" as const,
          backend: "online" as const,
          reader: "unconfigured" as const,
          stripe: "connected" as const,
          lastWebhookAt,
        };
      }

      const reader = (await this.stripe.terminal.readers.retrieve(
        this.config.STRIPE_READER_ID,
      )) as unknown as { status?: string; action?: { status?: string } };
      const readerStatus: TerminalStatus["reader"] =
        reader.status === "online"
          ? reader.action?.status === "in_progress"
            ? "busy"
            : "ready"
          : "offline";

      return {
        internet: "online" as const,
        backend: "online" as const,
        reader: readerStatus,
        stripe: "connected" as const,
        lastWebhookAt,
      };
    } catch {
      return {
        internet: "online" as const,
        backend: "degraded" as const,
        reader: "offline" as const,
        stripe: "degraded" as const,
        lastWebhookAt,
      };
    }
  }

  async startPayment(order: DraftOrder): Promise<TerminalStartResult> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: order.totalCents,
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        registerId: this.config.REGISTER_ID,
      },
    });

    if (this.config.STRIPE_READER_ID) {
      const readerId = this.config.STRIPE_READER_ID;

      try {
        await (this.stripe.terminal.readers as any).setReaderDisplay(readerId, {
          type: "cart",
          cart: {
            currency: "usd",
            tax: order.taxCents,
            total: order.totalCents,
            line_items: order.lines.map((line) => ({
              description: `${line.quantity}x ${line.productName}`,
              amount: line.lineTotalCents,
              quantity: line.quantity,
            })),
          },
        });
      } catch {
        // Reader-display sync is optional.
      }

      const reader = await (this.stripe.terminal.readers as any).processPaymentIntent(readerId, {
        payment_intent: paymentIntent.id,
      });

      return {
        mode: "stripe",
        status: "pending",
        stripePaymentIntentId: paymentIntent.id,
        stripeReaderActionId: reader.action?.type ?? "process_payment_intent",
        stripeReaderId: readerId,
      };
    }

    return {
      mode: "stripe",
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
    };
  }

  async cancelPayment(order: DraftOrder): Promise<void> {
    if (order.payment.stripeReaderId) {
      await (this.stripe.terminal.readers as any).cancelAction(order.payment.stripeReaderId);
    }

    if (order.payment.stripePaymentIntentId) {
      await this.stripe.paymentIntents.cancel(order.payment.stripePaymentIntentId).catch(() => undefined);
    }
  }

  parseWebhook(signature: string | undefined, rawBody: string): TerminalWebhookResult | null {
    if (!signature || !this.config.STRIPE_WEBHOOK_SECRET) {
      return null;
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.config.STRIPE_WEBHOOK_SECRET);

    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
        paymentIntentId: paymentIntent.id,
        status:
          event.type === "payment_intent.succeeded"
            ? "succeeded"
            : event.type === "payment_intent.canceled"
              ? "canceled"
              : "failed",
        failureMessage: paymentIntent.last_payment_error?.message ?? undefined,
      };
    }

    if (event.type.startsWith("terminal.reader.")) {
      return {
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      };
    }

    return null;
  }
}

export function createTerminalService(config: AppConfig): TerminalService {
  if (!config.STRIPE_SECRET_KEY) {
    return new MockTerminalService();
  }
  return new StripeTerminalService(config);
}
