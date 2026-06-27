'use client';

import React, { useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Star {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  baseSpeedY: number;
  deflectionX: number;
  deflectionY: number;
}

export default function FallingStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname.startsWith('/dashboard')) return null;

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];
    const starCount = 80;

    // Track mouse
    const mouse = { x: -1000, y: -1000, active: false };

    // Track scroll
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Init stars
    for (let i = 0; i < starCount; i++) {
      const size = Math.random() * 1.5 + 0.5;
      const speedY = Math.random() * 1.2 + 0.6;
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size,
        speedY,
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.35 + 0.15,
        baseSpeedY: speedY,
        deflectionX: 0,
        deflectionY: 0,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      scrollVelocity = (currentScrollY - lastScrollY) * 0.18;
      lastScrollY = currentScrollY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Main animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Decay scroll speed back to 0
      scrollVelocity *= 0.94;

      stars.forEach((star) => {
        // Star movement with base speed + scroll velocity influence
        const targetSpeedY = star.baseSpeedY + scrollVelocity;
        
        // Deflection by mouse proximity
        if (mouse.active) {
          const dx = star.x - mouse.x;
          const dy = star.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const pushRadius = 130;

          if (distance < pushRadius) {
            const force = (pushRadius - distance) / pushRadius;
            // Calculate push vectors
            const pushX = (dx / distance) * force * 4.5;
            const pushY = (dy / distance) * force * 4.5;

            // Apply smooth deflection drift
            star.deflectionX += (pushX - star.deflectionX) * 0.15;
            star.deflectionY += (pushY - star.deflectionY) * 0.15;
          } else {
            // Restore deflection back to 0
            star.deflectionX *= 0.92;
            star.deflectionY *= 0.92;
          }
        } else {
          star.deflectionX *= 0.92;
          star.deflectionY *= 0.92;
        }

        // Apply velocities
        star.y += targetSpeedY + star.deflectionY;
        star.x += star.speedX + star.deflectionX;

        // Reset stars when they fall off boundaries
        if (star.y > canvas.height) {
          star.y = -20;
          star.x = Math.random() * canvas.width;
          star.deflectionX = 0;
          star.deflectionY = 0;
        } else if (star.y < -30) {
          star.y = canvas.height + 10;
          star.x = Math.random() * canvas.width;
          star.deflectionX = 0;
          star.deflectionY = 0;
        }

        if (star.x > canvas.width) {
          star.x = 0;
        } else if (star.x < 0) {
          star.x = canvas.width;
        }

        // Draw light streak representing falling star
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        // Streak lines flow in direction of movement
        const streakX = star.speedX + star.deflectionX;
        const streakY = targetSpeedY + star.deflectionY;
        ctx.lineTo(star.x - streakX * 3.5, star.y - streakY * 3.5);
        ctx.strokeStyle = `rgba(165, 180, 252, ${star.opacity})`;
        ctx.lineWidth = star.size;
        ctx.stroke();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
}
