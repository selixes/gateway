'use client';

import { useEffect, useState } from 'react';

interface SparklineProps {
  data?: number[];
  color?: string;
  height?: number;
  width?: number;
  label?: string;
}

export function Sparkline({ data: initialData, color = '#6366f1', height = 40, width = 160, label }: SparklineProps) {
  const [data, setData] = useState<number[]>(initialData || Array.from({ length: 20 }, () => 100 + Math.random() * 200));

  // Simulate live data updates
  useEffect(() => {
    if (initialData) return;
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev.slice(1), 60 + Math.random() * 280];
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [initialData]);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  // Gradient fill area
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  const latest = data[data.length - 1] ?? 0;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      {label && (
        <span style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={areaPoints}
            fill={`url(#sparkGrad-${color.replace('#', '')})`}
          />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Latest point dot */}
          {data.length > 0 && (() => {
            const lastX = width;
            const lastY = height - ((latest - min) / range) * (height - 4) - 2;
            return (
              <circle
                cx={lastX}
                cy={lastY}
                r="3"
                fill={color}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
              />
            );
          })()}
        </svg>
        <span style={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          minWidth: '40px',
          textAlign: 'right',
        }}>
          {Math.round(latest)}ms
        </span>
      </div>
    </div>
  );
}

interface MetricSparkCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  sparkData?: number[];
  icon?: string;
}

export function MetricSparkCard({ label, value, sub, color, sparkData, icon }: MetricSparkCardProps) {
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(99, 102, 241, 0.12)',
      borderRadius: '14px',
      padding: '1.25rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}44`;
        e.currentTarget.style.boxShadow = `0 0 24px ${color}11, inset 0 1px 0 ${color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.12)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Subtle glow orb */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}15, transparent)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {icon && <span style={{ fontSize: '0.875rem' }}>{icon}</span>}
        <span style={{
          fontSize: '0.6875rem',
          color: '#6b7280',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span style={{
            fontSize: '1.875rem',
            fontWeight: 800,
            color: '#f2f2f7',
            letterSpacing: '-0.03em',
            display: 'block',
            lineHeight: 1.1,
          }}>
            {value}
          </span>
          {sub && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
              {sub}
            </span>
          )}
        </div>
        {sparkData && <Sparkline data={sparkData} color={color} height={36} width={100} />}
      </div>
    </div>
  );
}
