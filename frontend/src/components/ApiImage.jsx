import { useState, useEffect } from "react";
export function ApiImage({ imageKey, src, fallback = "/avatar-1.jpg", alt, ...rest }) {
  const [url, setUrl] = useState(() => {
    if (src) {
      if (src.startsWith("/media/") || src.startsWith("/static/")) {
        return `http://localhost:8000${src}`;
      }
      return src;
    }
    return void 0;
  });
  useEffect(() => {
    if (src) {
      if (src.startsWith("/media/") || src.startsWith("/static/")) {
        setUrl(`http://localhost:8000${src}`);
      } else {
        setUrl(src);
      }
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
