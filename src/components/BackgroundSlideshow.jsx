// src/components/BackgroundSlideshow.jsx
// Shared between AuthPage.jsx and ChangePassword.jsx

import { useState, useEffect } from 'react';

export default function BackgroundSlideshow({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => { setCurrent(0); }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const iv = setInterval(() => {
      setCurrent(p => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(iv);
  }, [slides.length]);

  return (
    <>
      {/* Base dark navy */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#001433' }} />

      {/*
        Sliding strip — overflow hidden on the clip wrapper,
        each slide is exactly 100vw × 100vh so cover works correctly.
      */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden',
      }}>
        <div
          style={{
            display: 'flex',
            width: `${slides.length * 100}vw`,
            height: '100%',
            transform: `translateX(-${current * 100}vw)`,
            transition: slides.length > 1
              ? 'transform 1.2s cubic-bezier(0.77, 0, 0.18, 1)'
              : 'none',
            willChange: 'transform',
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              style={{
                width: '100vw',
                height: '100%',
                flexShrink: 0,
                backgroundImage: `url(${slide.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 0.55,
              }}
            />
          ))}
        </div>
      </div>

      {/* Blue radial overlays */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(0,53,128,0.55) 0%, transparent 60%),
          radial-gradient(circle at 80% 20%, rgba(0,32,96,0.45) 0%, transparent 50%),
          radial-gradient(circle at 60% 80%, rgba(0,20,51,0.6) 0%, transparent 55%)
        `,
      }} />

      {/* Dot grid texture */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, opacity: 0.04,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
    </>
  );
}