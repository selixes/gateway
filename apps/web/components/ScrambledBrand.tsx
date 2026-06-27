'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ScrambledBrand() {
  const [displayText, setDisplayText] = useState('SELIXES');
  const [isScrambling, setIsScrambling] = useState(false);
  const target = 'SELIXES';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+?<>0123456789';
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerScramble = () => {
    if (isScrambling) return;
    setIsScrambling(true);
    let iteration = 0;
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setDisplayText(() => {
        return target
          .split('')
          .map((char, index) => {
            if (index < Math.floor(iteration)) {
              return target[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
      });

      if (iteration >= target.length) {
        setIsScrambling(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
      iteration += 1 / 3;
    }, 30);
  };

  useEffect(() => {
    triggerScramble();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <span
      onMouseEnter={triggerScramble}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        userSelect: 'none',
      }}
    >
      {displayText.split('').map((char, idx) => {
        if (idx === 4) {
          return (
            <span key={idx} className="brand-x">
              {char}
            </span>
          );
        }
        return <span key={idx}>{char}</span>;
      })}
    </span>
  );
}
