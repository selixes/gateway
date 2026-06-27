'use client';

import React, { useEffect, useRef } from 'react';

export default function TelemetryWave() {
  const containerRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const path3Ref = useRef<SVGPathElement>(null);
  const path4Ref = useRef<SVGPathElement>(null);
  const path5Ref = useRef<SVGPathElement>(null);
  const path6Ref = useRef<SVGPathElement>(null);

  // Track mouse coordinates and active state
  const mouseRef = useRef({ x: 0, y: 0, active: false, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ current: 0, target: 0, velocity: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      mouseRef.current.targetX = relativeX;
      mouseRef.current.targetY = relativeY;
      mouseRef.current.active = true;

      // Update CSS variables for the radial background spotlight
      container.style.setProperty('--mouse-x', `${relativeX}px`);
      container.style.setProperty('--mouse-y', `${relativeY}px`);
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Track scroll position for velocity calculations
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      scrollRef.current.target = currentScroll;
      const diff = currentScroll - lastScrollY;
      scrollRef.current.velocity = diff * 0.12; // scale scroll velocity
      lastScrollY = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Animation loop variables
    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.008; // Slower continuous flow speed (inspired by Verteal's visual elegance)

      // Smooth mouse coordinates (lerp)
      const mouse = mouseRef.current;
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      }

      // Decay scroll velocity back to 0
      const scroll = scrollRef.current;
      scroll.current += (scroll.target - scroll.current) * 0.1;
      scroll.velocity *= 0.94; // damp velocity

      const width = container.clientWidth || 1200;
      const height = container.clientHeight || 144;
      const centerY = height / 2;

      // Define spindle split boundaries (middle 55% of the screen width)
      const splitStart = width * 0.225;
      const splitEnd = width * 0.775;
      const spindleWidth = splitEnd - splitStart;

      // We will compute 180 points across the width of the wave for maximum smoothness
      const pointsCount = 180;
      
      const pathsData = ['', '', '', '', '', ''];
      const pathRefs = [path1Ref, path2Ref, path3Ref, path4Ref, path5Ref, path6Ref];

      // Scroll speed shifts wave frequency and speed
      const scrollSpeedMultiplier = 1 + Math.abs(scroll.velocity) * 0.35;
      const baseAmplitude = 34 + Math.abs(scroll.velocity) * 1.5;
      const scrollPhase = scroll.current * 0.0065; // Scroll physically drives wave horizontal phase shifting

      for (let i = 0; i <= pointsCount; i++) {
        const x = (i / pointsCount) * width;
        
        // Calculate spindle envelope function (sine-squared to taper very smoothly to 0 at the split boundaries)
        let envelope = 0;
        if (x >= splitStart && x <= splitEnd) {
          const progress = (x - splitStart) / spindleWidth;
          envelope = Math.pow(Math.sin(progress * Math.PI), 1.6);
        }

        // Generate 6 strands
        for (let k = 0; k < 6; k++) {
          let y = centerY;

          if (envelope > 0) {
            const progress = (x - splitStart) / spindleWidth;
            // Angle based on progress across the spindle + flowing time + phase offset per strand + scroll phase shift
            const angle = progress * (2.2 * Math.PI * 2) * scrollSpeedMultiplier - time * 1.4 - scrollPhase + (k * Math.PI) / 3;
            
            // Standard amplitude for this strand
            const amp = baseAmplitude * envelope;
            
            // Generate basic sine wave position
            y = centerY + Math.sin(angle) * amp;
          }

          // Apply mouse interaction distortion
          if (mouse.active) {
            const dx = mouse.x - x;
            const dy = mouse.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = 140; // slightly tighter interaction field for cleaner aesthetics

            if (dist < interactionRadius) {
              const force = Math.pow(1 - dist / interactionRadius, 2.2);
              
              // 1. Magnetic bubble repulsion (vertical push away from cursor Y)
              const repelY = y - mouse.y;
              const pushDirection = repelY >= 0 ? 1 : -1;
              y += pushDirection * (interactionRadius - dist) * 0.38 * force;

              // 2. High-frequency plasma shimmer ripple
              const shimmer = Math.sin(time * 12 + x * 0.1 + (k * Math.PI) / 3) * 5 * force;
              y += shimmer;
            }
          }

          // Build SVG path commands
          const cmd = i === 0 ? 'M' : 'L';
          pathsData[k] += `${cmd} ${x.toFixed(1)} ${y.toFixed(1)} `;
        }
      }

      for (let k = 0; k < 6; k++) {
        const ref = pathRefs[k];
        const d = pathsData[k];
        if (ref && ref.current && d !== undefined) {
          ref.current.setAttribute('d', d);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-36 mt-4 mb-2 relative overflow-hidden cursor-default select-none group"
      style={{
        background: 'linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.1) 50%, rgba(11,11,14,0) 100%)'
      }}
    >
      {/* Background glowing aura centered around the mouse */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(99, 102, 241, 0.05) 0%, transparent 80%)'
        }}
      />

      <svg className="w-full h-full block" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradient-telemetry-spindle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
            <stop offset="10%" stopColor="rgba(99, 102, 241, 0.15)" />
            <stop offset="25%" stopColor="rgba(59, 130, 246, 0.85)" />
            <stop offset="50%" stopColor="rgba(6, 182, 212, 1)" />
            <stop offset="75%" stopColor="rgba(139, 92, 246, 0.85)" />
            <stop offset="90%" stopColor="rgba(139, 92, 246, 0.15)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </linearGradient>

          {/* Glowing neon filters */}
          <filter id="glow-spindle-neon" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 6 overlapping paths that form a single line on the sides and split in the center */}
        <path ref={path6Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="1.25" opacity="0.35" />
        <path ref={path5Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="1.75" opacity="0.6" />
        <path ref={path4Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="2" filter="url(#glow-spindle-neon)" opacity="0.75" />
        <path ref={path3Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="2" filter="url(#glow-spindle-neon)" opacity="0.75" />
        <path ref={path2Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="1.75" opacity="0.6" />
        <path ref={path1Ref} fill="none" stroke="url(#gradient-telemetry-spindle)" strokeWidth="1.25" opacity="0.35" />
      </svg>
    </div>
  );
}
