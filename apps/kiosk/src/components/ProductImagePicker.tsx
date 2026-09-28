import { MAX_PRODUCT_IMAGE_BYTES, type ProductImage } from "@rhc-pos/shared";
import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { productImageUrl } from "../lib/product-images";
import { ProductPhoto } from "./ProductPhoto";

export function ProductImagePicker({ adminPin, productName, imageId, disabled, onChange, onBusyChange }: {
  adminPin: string;
  productName: string;
  imageId?: string | null;
  disabled: boolean;
  onChange: (id: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    api.listProductImages(adminPin).then((items) => {
      if (!canceled) setImages(items);
    }).catch((err) => {
      if (!canceled) setError(err instanceof Error ? err.message : "Could not load images.");
    }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [adminPin, reload]);

  const upload = async (file: File) => {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (!file.size || file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError("Choose an image no larger than 5 MB.");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    try {
      const image = await api.uploadProductImage(adminPin, file);
      if (!active.current) return;
      setImages((current) => [image, ...current.filter((item) => item.id !== image.id)]);
      setSearch("");
      onChange(image.id);
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      if (active.current) { setUploading(false); onBusyChange(false); }
    }
  };

  const selected = images.find((image) => image.id === imageId);
  return (
    <section className="grid gap-3 rounded-xl bg-[var(--overlay-soft)] p-4" aria-label="Product image">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface)]">
          <ProductPhoto name={productName || "Product preview"} imageId={imageId} className="h-full w-full object-contain p-2"
            fallback={<span className="text-xs text-[var(--text-muted)]">No image</span>} />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Product image</h3>
          <p className="break-words text-xs text-[var(--text-muted)]">{imageId ? selected?.name ?? "Selected image" : "Default image"}</p>
          <p className="text-xs text-[var(--text-muted)]">Upload a photo or choose a saved image. Transparent backgrounds are supported.</p>
        </div>
      </div>
      <label className="grid gap-1.5 text-sm text-[var(--text-primary)]">
        <span className="font-semibold">{uploading ? "Uploading image…" : "Upload image"}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || uploading || loading}
          className="block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#1be4db] file:px-3 file:py-2 file:font-semibold file:text-[#262626]"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }} />
        <span className="text-xs text-[var(--text-muted)]">PNG, JPEG or WebP · Up to 5 MB</span>
      </label>
      <button type="button" className="touch-button justify-self-start" disabled={disabled || uploading || !imageId}
        onClick={() => onChange(null)}>Use default image</button>
      {loading ? <p role="status" className="text-sm text-[var(--text-muted)]">Loading image library…</p> : (
        <>
          {images.length > 0 ? <input className="brand-input" aria-label="Search saved images" placeholder="Search saved images" value={search} onChange={(e) => setSearch(e.target.value)} /> : null}
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-auto sm:grid-cols-4" aria-label="Saved images">
            {images.filter((image) => image.name.toLowerCase().includes(search.toLowerCase())).map((image) => (
              <button type="button" key={image.id} aria-label={`Select ${image.name}`} aria-pressed={imageId === image.id}
                disabled={disabled || uploading} onClick={() => onChange(image.id)}
                className={`rounded-xl border-2 p-2 text-xs text-[var(--text-primary)] ${imageId === image.id ? "border-[#1be4db] bg-[#1be4db]/10" : "border-transparent bg-[var(--bg-surface)]"}`}>
                <img src={productImageUrl(image.id)} alt="" className="h-20 w-full object-contain" loading="lazy" />
                <span className="mt-1 block truncate">{image.name}</span>
              </button>
            ))}
          </div>
          {!images.length && !error ? <p className="text-xs text-[var(--text-muted)]">Your uploaded images will appear here for reuse.</p> : null}
        </>
      )}
      {error ? <div role="alert" className="text-sm text-rose-500">{error} <button type="button" className="underline" disabled={uploading} onClick={() => setReload((n) => n + 1)}>Reload library</button></div> : null}
      <p className="text-xs text-[var(--text-muted)]">Save the product to apply your selection. Uploads stay in the library if you cancel.</p>
    </section>
  );
}
