import { useState, useEffect } from "react";
import { buildMediaUrl } from "@/lib/config";

export function ApiImage({ imageKey, src, fallback = "/avatar-1.jpg", alt, ...rest }) {
  const [url, setUrl] = useState(() => (src ? buildMediaUrl(src) : void 0));
  useEffect(() => {
    if (src) {
      setUrl(buildMediaUrl(src));
    }
  }, [src]);
  const handleError = (e) => {
    const img = e.currentTarget;
    if (img.src && img.src !== window.location.origin + fallback) {
      img.src = fallback;
    }
  };
  if (!url) return <img src={fallback} alt={alt} {...rest} onError={handleError} />;
  return <img src={url} alt={alt} {...rest} onError={handleError} />;
}
export default ApiImage;
