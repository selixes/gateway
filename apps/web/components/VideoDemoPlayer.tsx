'use client';

import React, { useRef, useState, useEffect } from 'react';
import SectionCanvas from './SectionCanvas';

interface Chapter {
  id: string;
  name: string;
  desc: string;
  startTime: number;
  endTime: number;
  timeLabel: string;
}

const chapters: Chapter[] = [
  {
    id: 'hero',
    name: '01. Overview Console & Cost Advisor',
    desc: 'Deep-dive organizational dashboard. Audits weekly transits, saved token fees, and provides active arbitrage recommendations.',
    startTime: 0,
    endTime: 20,
    timeLabel: '0:00 - 0:20'
  },
  {
    id: 'timeline',
    name: '02. Resiliency & Outage Heal Stream',
    desc: 'Real-time telemetry showing live transits and autonomic circuit breakers rerouting timeout spikes in under 15ms.',
    startTime: 20,
    endTime: 40,
    timeLabel: '0:20 - 0:40'
  },
  {
    id: 'trace',
    name: '03. Multi-Model Trace Ingest Details',
    desc: 'Granular step-level audits. Tracks exact prompt snapshots, latencies, and token spending margins for all agent runs.',
    startTime: 40,
    endTime: 60,
    timeLabel: '0:40 - 1:00'
  },
  {
    id: 'continuity',
    name: '04. Continuity local Ollama Boot',
    desc: 'Visual trace details highlighting local Ollama edge recovery during global cloud blackout at $0.00 in token fees.',
    startTime: 60,
    endTime: 85,
    timeLabel: '1:00 - 1:25'
  }
];

export default function VideoDemoPlayer({ isMobile }: { isMobile: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showCenterPlay, setShowCenterPlay] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      
      // Update active chapter based on time
      const currentIdx = chapters.findIndex(
        (chap) => time >= chap.startTime && time < chap.endTime
      );
      if (currentIdx !== -1) {
        setActiveChapterIndex(currentIdx);
      } else if (chapters.length > 0 && time >= chapters[chapters.length - 1]!.endTime) {
        setActiveChapterIndex(chapters.length - 1);
      }
    };
    const onDurationChange = () => setDuration(video.duration);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => console.log('Video play error:', err));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    }
  };

  const handleChapterClick = (index: number) => {
    const video = videoRef.current;
    if (!video) return;
    const chapter = chapters[index];
    if (!chapter) return;
    const targetTime = chapter.startTime;
    video.currentTime = targetTime;
    setActiveChapterIndex(index);
    if (!isPlaying) {
      video.play().catch((err) => console.log('Video play error:', err));
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = progressContainerRef.current;
    const video = videoRef.current;
    if (!container || !video || duration === 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    video.currentTime = percentage * duration;
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <SectionCanvas>
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', marginBottom: '0.5rem' }}>
            Interactive Demo Walkthrough
          </span>
          <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
            Sovereign Intelligence in Action
          </h2>
          <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
            Watch the complete Selixes platform workflow showing real-time cost analytics, autonomic failovers, and vertical tracing.
          </p>
        </div>

        {/* Video Player + Chapter List Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
          gap: '2rem',
          background: 'rgba(15,15,20,0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid #1f1f2c',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
        }}>
          
          {/* Chapter Navigation Sidebar */}
          <div style={{
            background: 'rgba(18,18,25,0.7)',
            padding: '2rem 1.25rem',
            borderRight: isMobile ? 'none' : '1px solid #1f1f2c',
            borderBottom: isMobile ? '1px solid #1f1f2c' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: isMobile ? 'auto' : '520px',
            overflowY: 'auto',
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', paddingLeft: '8px' }}>
              Demo Chapters
            </span>

            {chapters.map((chap, index) => {
              const isActive = activeChapterIndex === index;
              return (
                <button
                  key={chap.id}
                  onClick={() => handleChapterClick(index)}
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(99,102,241,0.3)' : 'transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'block',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: isActive ? 'var(--accent-hover)' : '#fff',
                      transition: 'color 0.2s'
                    }}>
                      {chap.name}
                    </span>
                    <span style={{
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: isActive ? '#a5b4fc' : '#8e8e9e',
                      fontSize: '0.625rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}>
                      {chap.timeLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: '#8e8e9e', lineHeight: 1.4, display: 'block' }}>
                    {chap.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Video Player Canvas */}
          <div 
            style={{
              position: 'relative',
              background: '#040406',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: isMobile ? '280px' : '480px',
            }}
            onMouseEnter={() => setShowCenterPlay(true)}
          >
            {/* The Video Element */}
            <video
              ref={videoRef}
              src="/demo/api_shield_complete_platform_demo.mp4"
              playsInline
              preload="metadata"
              muted={isMuted}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
              }}
              onClick={togglePlay}
            />

            {/* Large Glowing Center Play Button (Shown when paused) */}
            {!isPlaying && showCenterPlay && (
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
                onClick={togglePlay}
              >
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.9)',
                  border: '2px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 0 30px rgba(99, 102, 241, 0.6), inset 0 0 12px rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.background = '#818cf8';
                  e.currentTarget.style.boxShadow = '0 0 45px rgba(99, 102, 241, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.6), inset 0 0 12px rgba(255, 255, 255, 0.3)';
                }}
                >
                  <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
                    <path d="M4 25.5V2.5L22 14L4 25.5Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Custom Control Overlay Bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(5,5,8,0.95) 0%, rgba(5,5,8,0.4) 70%, transparent 100%)',
              padding: '1.5rem 1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              zIndex: 3,
              opacity: isPlaying ? 0 : 1,
              transition: 'opacity 0.3s',
            }}
            className="video-controls"
            >
              {/* Timeline Track */}
              <div 
                ref={progressContainerRef}
                onClick={handleProgressBarClick}
                style={{
                  height: '6px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'height 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.height = '8px';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.height = '6px';
                }}
              >
                {/* Active Progress */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--accent) 0%, #818cf8 100%)',
                  borderRadius: '3px',
                  boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                }} />
              </div>

              {/* Control Buttons & Timestamp */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Play/Pause Button */}
                  <button 
                    onClick={togglePlay}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                  >
                    {isPlaying ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="4" height="16" rx="1" />
                        <rect x="16" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Volume/Mute Button */}
                  <button 
                    onClick={toggleMute}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                  >
                    {isMuted ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    )}
                  </button>

                  {/* Time indicator */}
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Fullscreen Button */}
                <button 
                  onClick={handleFullscreen}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add CSS hover styles for controls */}
      <style>{`
        .video-controls {
          opacity: 0;
          pointer-events: none;
        }
        div:hover > .video-controls {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </SectionCanvas>
  );
}
