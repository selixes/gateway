'use client';

import React, { useRef, useState, useEffect } from 'react';

interface InteractiveGlowCardProps {
  children: React.ReactNode;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function InteractiveGlowCard({
  children,
  borderRadius = '12px',
  style = {},
  className = '',
}: InteractiveGlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  useEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    cardEl.addEventListener('mousemove', handleMouseMove);
    cardEl.addEventListener('mouseenter', handleMouseEnter);
    cardEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cardEl.removeEventListener('mousemove', handleMouseMove);
      cardEl.removeEventListener('mouseenter', handleMouseEnter);
      cardEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`rgb-flow-card ${className}`}
      style={{
        position: 'relative',
        borderRadius,
        padding: '1px',
        overflow: 'hidden',
        background: isHovered ? 'rgba(99, 102, 241, 0.25)' : 'rgba(31, 31, 44, 0.4)',
        transition: 'background 0.3s ease',
        '--mouse-x': `${coords.x}px`,
        '--mouse-y': `${coords.y}px`,
        '--border-radius': borderRadius,
        ...style,
      } as React.CSSProperties}
    >
      <div className="rgb-flow-card-bg-flow" />
      <div className="rgb-flow-card-mouse-glow" />
      <div
        className="rgb-flow-card-inner"
        style={{
          borderRadius: `calc(${borderRadius} - 1px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
