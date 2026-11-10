import React from 'react';

export const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-64 items-center justify-center rounded-xl bg-canvas px-4 text-center text-sm font-medium text-slate-500">{text}</div>
);
