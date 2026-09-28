import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductImagePicker } from "./ProductImagePicker";
import { ProductPhoto } from "./ProductPhoto";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { api } from "../services/api";

vi.mock("../services/api", () => ({ API_BASE_URL: "/v1", api: { listProductImages: vi.fn(), uploadProductImage: vi.fn() } }));
const image = { id: "640cb0c8-3367-444c-9d5c-f6ea867458d7", name: "Cookie.png", contentType: "image/webp", width: 500, height: 500, byteSize: 1000, createdAt: "2026-09-28T00:00:00.000Z" };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.listProductImages).mockResolvedValue([image]); });
afterEach(cleanup);

describe("product image controls", () => {
  it("selects saved images and returns to the default without deleting a library image", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProductImagePicker adminPin="2468" productName="Cookie" imageId={image.id} disabled={false} onChange={onChange} onBusyChange={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Select Cookie.png" }));
    expect(onChange).toHaveBeenCalledWith(image.id);
    await user.click(screen.getByRole("button", { name: "Use default image" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Select Cookie.png" })).toBeInTheDocument();
  });

  it("uploads then selects the image and reports busy state so saving waits", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onBusyChange = vi.fn();
    vi.mocked(api.uploadProductImage).mockResolvedValue(image);
    render(<ProductImagePicker adminPin="2468" productName="Cookie" disabled={false} onChange={onChange} onBusyChange={onBusyChange} />);
    await screen.findByRole("button", { name: "Select Cookie.png" });
    const file = new File(["png"], "Cookie.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/Upload image/), file);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(image.id));
    expect(api.uploadProductImage).toHaveBeenCalledWith("2468", file);
    expect(onBusyChange.mock.calls.map(([value]) => value)).toEqual([true, false]);
  });

  it("keeps the current selection on upload failure and displays a useful error", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(api.uploadProductImage).mockRejectedValue(new Error("Upload connection failed."));
    render(<ProductImagePicker adminPin="2468" productName="Cookie" imageId={image.id} disabled={false} onChange={onChange} onBusyChange={vi.fn()} />);
    await screen.findByRole("button", { name: "Select Cookie.png" });
    await user.upload(screen.getByLabelText(/Upload image/), new File(["png"], "Cookie.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload connection failed.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back when a remote photo cannot load without retrying endlessly", () => {
    render(<ProductPhoto name="Cookie" imageId={image.id} className="photo" fallback={<span>No picture</span>} />);
    const photo = screen.getByAltText("Cookie");
    expect(photo).toHaveAttribute("src", `/v1/product-images/${image.id}`);
    fireEvent.error(photo);
    expect(photo.getAttribute("src")).toContain("Cookie.png");
    fireEvent.error(photo);
    expect(screen.queryByAltText("Cookie")).not.toBeInTheDocument();
    expect(screen.getByText("No picture")).toBeInTheDocument();
  });

  it("does not open the touch keyboard for the image file picker", () => {
    render(<><VirtualKeyboard /><input type="file" aria-label="Choose image" /></>);
    fireEvent.focusIn(screen.getByLabelText("Choose image"));
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });
});
