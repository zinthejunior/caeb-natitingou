import React, { useState, useEffect } from 'react';

interface ApiImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageKey?: string; 
  src?: string;
  fallback?: string; 
}

export function ApiImage({ imageKey, src, fallback = '/avatar-1.jpg', alt, ...rest }: ApiImageProps) {
 
  const [url, setUrl] = useState<string | undefined>(() => {
    if (src) return src;
    
    return undefined;
  });

  useEffect(() => {
    if (src) setUrl(src);
   
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.src && img.src !== window.location.origin + fallback) {
      img.src = fallback;
    }
  };

  if (!url) return <img src={fallback} alt={alt} {...rest} onError={handleError} />;
  return <img src={url} alt={alt} {...rest} onError={handleError} />;
}

export default ApiImage;
