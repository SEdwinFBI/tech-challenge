import React from 'react';

export type IllustrationName = 'cart' | 'box' | 'heart' | 'search' | 'lock' | 'compass' | 'success' | 'wifi';

const Frame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <svg viewBox="0 0 160 120" role="img" aria-hidden="true" className={`h-auto w-40 ${className}`} fill="none">
    <ellipse cx="80" cy="108" rx="46" ry="6" fill="#e7e5e4" />
    {children}
  </svg>
);

export const Illustration: React.FC<{ name: IllustrationName; className?: string }> = ({ name, className }) => {
  switch (name) {
    case 'cart':
      return (
        <Frame className={className}>
          <path d="M34 34h14l9 40h50l8-30H52" stroke="#0e7c66" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="60" y="48" width="14" height="14" rx="3" fill="#ffc233" />
          <rect x="78" y="42" width="14" height="20" rx="3" fill="#72d5b8" />
          <circle cx="66" cy="90" r="7" fill="#08503f" />
          <circle cx="104" cy="90" r="7" fill="#08503f" />
          <path d="M120 26l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#ffc233" />
        </Frame>
      );
    case 'box':
      return (
        <Frame className={className}>
          <path d="M42 50l38-18 38 18v36L80 104 42 86z" fill="#d2f4e8" stroke="#0e7c66" strokeWidth="4" strokeLinejoin="round" />
          <path d="M42 50l38 18 38-18M80 68v36" stroke="#0e7c66" strokeWidth="4" strokeLinejoin="round" />
          <path d="M62 41l38 18v10" stroke="#ffc233" strokeWidth="5" strokeLinecap="round" />
        </Frame>
      );
    case 'heart':
      return (
        <Frame className={className}>
          <path d="M80 94S42 72 42 46c0-12 9-20 20-20 8 0 14 4 18 11 4-7 10-11 18-11 11 0 20 8 20 20 0 26-38 48-38 48z" fill="#fdecee" stroke="#d7263d" strokeWidth="4" strokeLinejoin="round" />
          <path d="M112 24l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc233" />
        </Frame>
      );
    case 'search':
      return (
        <Frame className={className}>
          <circle cx="72" cy="54" r="24" fill="#ecfbf6" stroke="#0e7c66" strokeWidth="5" />
          <path d="M90 72l22 22" stroke="#0e7c66" strokeWidth="7" strokeLinecap="round" />
          <path d="M62 54h20M72 44v20" stroke="#ffc233" strokeWidth="5" strokeLinecap="round" />
        </Frame>
      );
    case 'lock':
      return (
        <Frame className={className}>
          <rect x="52" y="52" width="56" height="42" rx="8" fill="#fdecee" stroke="#d7263d" strokeWidth="4" />
          <path d="M62 52V42a18 18 0 0136 0v10" stroke="#d7263d" strokeWidth="5" strokeLinecap="round" />
          <circle cx="80" cy="72" r="5" fill="#d7263d" />
        </Frame>
      );
    case 'compass':
      return (
        <Frame className={className}>
          <circle cx="80" cy="58" r="34" fill="#ecfbf6" stroke="#0e7c66" strokeWidth="5" />
          <path d="M66 72l8-22 22-8-8 22z" fill="#ffc233" stroke="#08503f" strokeWidth="3" strokeLinejoin="round" />
        </Frame>
      );
    case 'success':
      return (
        <Frame className={className}>
          <circle cx="80" cy="58" r="36" fill="#d2f4e8" />
          <circle cx="80" cy="58" r="28" fill="#0e7c66" />
          <path d="M66 59l10 10 18-20" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M122 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc233" />
          <circle cx="36" cy="40" r="3" fill="#ffc233" />
          <circle cx="128" cy="86" r="3" fill="#72d5b8" />
        </Frame>
      );
    case 'wifi':
      return (
        <Frame className={className}>
          <path d="M40 54a60 60 0 0180 0M52 68a42 42 0 0156 0M64 82a24 24 0 0132 0" stroke="#a8a29e" strokeWidth="6" strokeLinecap="round" />
          <circle cx="80" cy="94" r="5" fill="#d7263d" />
        </Frame>
      );
  }
};
