import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CardPaymentOverlay } from "./CardPaymentOverlay";
import { CashPaymentOverlay } from "./CashPaymentOverlay";

describe("checkout overlays", () => {
  it("sends the exact amount from the cash overlay", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<CashPaymentOverlay totalCents={450} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /exact/i }));
    expect(onConfirm).toHaveBeenCalledWith(450);
  });

  it("shows a plain-language failure message on card issues", () => {
    render(
      <CardPaymentOverlay
        totalCents={450}
        statusLabel="Waiting for reader…"
        failureMessage="Card reader unavailable"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/card reader unavailable/i)).toBeInTheDocument();
  });
});
