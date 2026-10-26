import React from 'react';
import AnimatedContent from './AnimatedContent';

export function AnimatedContentExample() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* 1. Basic Vertical Fade & Slide with Children Stagger */}
      <AnimatedContent
        distance={100}
        direction="vertical"
        duration={0.8}
        ease="power3.out"
        blur={0}
        stagger={0.08}
        threshold={0.1}
      >
        <h2>Ship it before lunch</h2>
        <p>Every child animates in turn.</p>
      </AnimatedContent>

      {/* 2. Horizontal Slide with 3D Tilt and Blur Reveal */}
      <AnimatedContent
        distance={80}
        direction="horizontal"
        duration={1.0}
        ease="expo.out"
        blur={8}
        tilt={15}
        threshold={0.15}
      >
        <div style={{ background: '#1c1f29', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}>
          <h3>Engineering Showcase</h3>
          <p>High performance visual computing and smooth telemetry transitions.</p>
        </div>
      </AnimatedContent>

      {/* 3. Wipe Reveal & Scale */}
      <AnimatedContent
        wipe="up"
        scale={0.9}
        duration={1.2}
        ease="power2.out"
        threshold={0.2}
      >
        <div style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)', padding: '1.5rem', borderRadius: '12px', color: '#ffffff' }}>
          <h3>Modern Cyberpunk Aesthetics</h3>
          <p>Revealed seamlessly behind soft moving wipe masks.</p>
        </div>
      </AnimatedContent>
    </div>
  );
}

export default AnimatedContentExample;
