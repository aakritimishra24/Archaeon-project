import React, { useState } from 'react';
import { Landmark } from 'lucide-react';

interface ArtifactImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackLabel?: string;
}

export const ArtifactImage: React.FC<ArtifactImageProps> = ({
  src,
  alt,
  className = '',
  style,
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1C2420] border border-[#39443D] text-[#A9ADA3] p-6 text-center ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <Landmark className="w-8 h-8 text-[#C9A66B]/60 mb-2" strokeWidth={1.5} />
        <span className="text-xs font-mono text-[#A9ADA3] max-w-[200px] truncate">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      style={style}
    />
  );
};
