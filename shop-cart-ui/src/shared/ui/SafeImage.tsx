import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export const SafeImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({
  className = '',
  alt = '',
  onError,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [rest.src]);

  if (!rest.src || failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300 ${className}`}
      >
        <ImageOff className="h-1/3 w-1/3 max-h-10 max-w-10" />
      </div>
    );
  }

  return (
    <img
      {...rest}
      alt={alt}
      className={className}
      onError={e => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
};
