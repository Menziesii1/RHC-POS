import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BootstrapResponse } from "@rhc-pos/shared";
import { ConfirmProvider } from "../lib/confirm";
import { InventoryControlPage } from "./InventoryControlPage";

const imageId = "640cb0c8-3367-444c-9d5c-f6ea867458d7";
vi.mock("./ProductImagePicker", () => ({ ProductImagePicker: ({ onChange }: { onChange: (id: string) => void }) =>
  <button onClick={() => onChange("640cb0c8-3367-444c-9d5c-f6ea867458d7")}>Choose saved photo</button>,
}));
const product = { id: "mocha", name: "Mocha", categoryId: "drink", priceCents: 450, discountCents: 25, enabled: true,
  sortOrder: 1, productType: "drink" as const, modifierIds: ["vanilla"], sizeOptionIds: ["regular"],
  sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 50 }], defaultSizeOptionId: "regular", customizable: true };
const bootstrap: BootstrapResponse = {
  settings: { locationId: "main-location", locationName: "Coffee", registerId: "register", registerName: "Register", taxRateBasisPoints: 0, recoveryTtlSeconds: 300, adminPinConfigured: true, lockScreenPinConfigured: false },
  status: { internet: "online", backend: "online", reader: "unconfigured", stripe: "mock", lastWebhookAt: null },
  products: [product], categories: [{ id: "drink", name: "Drink", enabled: true, sortOrder: 1 }], sizes: [], modifiers: [], flavorCategories: [],
};
function setup() {
  const props = {
    adminPin: "2468", bootstrap, analytics: null, onClose: vi.fn(), onNavigateAnalytics: vi.fn(), onNavigateTransactions: vi.fn(),
    onCategorySave: vi.fn(), onCategoryDelete: vi.fn(), onProductSave: vi.fn().mockResolvedValue(undefined), onProductDelete: vi.fn(),
    onCreateProduct: vi.fn().mockResolvedValue(undefined), onSizeSave: vi.fn(), onSizeDelete: vi.fn(), onFlavorSave: vi.fn(), onFlavorDelete: vi.fn(),
    onCreateCategory: vi.fn(), onCreateFlavor: vi.fn(), onCreateSize: vi.fn(), onTaxSave: vi.fn(), onCreateFlavorCategory: vi.fn(),
    onFlavorCategorySave: vi.fn(), onFlavorCategoryDelete: vi.fn(), onLockPinSave: vi.fn(),
  };
  render(<ConfirmProvider><InventoryControlPage {...props} /></ConfirmProvider>);
  return props;
}
afterEach(cleanup);

describe("product create and edit", () => {
  it("saves image and customization changes while retaining pricing and option assignments", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /Products Add, edit/ }));
    await user.click(screen.getByText("Mocha", { exact: true }));
    await user.click(screen.getByRole("switch", { name: "Customizable" }));
    await user.click(screen.getByRole("button", { name: "Choose saved photo" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(props.onProductSave).toHaveBeenCalledWith("mocha", expect.objectContaining({
      imageId, customizable: false, priceCents: 450, discountCents: 25, modifierIds: ["vanilla"], sizeOptionIds: ["regular"],
      sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 50 }], defaultSizeOptionId: "regular",
    })));
  });

  it("offers both controls when creating a product", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /Products Add, edit/ }));
    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Name", { exact: true }), "Cookie");
    await user.click(screen.getByRole("switch", { name: "Customizable" }));
    await user.click(screen.getByRole("button", { name: "Choose saved photo" }));
    await user.click(screen.getByRole("button", { name: "Create Product" }));
    await waitFor(() => expect(props.onCreateProduct).toHaveBeenCalledWith(expect.objectContaining({ name: "Cookie", imageId, customizable: false })));
  });
});
