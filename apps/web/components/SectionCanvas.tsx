'use client';

import React from 'react';

interface SectionCanvasProps {
  children: React.ReactNode;
}

export default function SectionCanvas({ children }: SectionCanvasProps) {
  return (
    <div className="w-full h-auto overflow-hidden relative">
      {children}
    </div>
  );
}
