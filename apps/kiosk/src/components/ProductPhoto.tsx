import { useState, type ReactNode } from "react";
import { getProductImage } from "../lib/product-images";

export function ProductPhoto({ name, imageId, className, fallback = null }: {
  name: string;
  imageId?: string | null;
  className: string;
  fallback?: ReactNode;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const selected = getProductImage(name, imageId);
  const photo = selected && failedSources.includes(selected.src) ? getProductImage(name) : selected;
  if (!photo || failedSources.includes(photo.src)) return <>{fallback}</>;
  return <img src={photo.src} alt={name} className={className} draggable={false}
    style={photo.scale !== 1 ? { transform: `scale(${photo.scale})` } : undefined}
    onError={() => setFailedSources((sources) => [...sources, photo.src])} />;
}
