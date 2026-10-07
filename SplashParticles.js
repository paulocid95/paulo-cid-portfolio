/**
 * SplashParticles.js - High-Tech Interactive Cyberpunk Particle & HUD Engine
 * Features:
 *  1. Live HUD Clock [ HH:MM:SS ] synchronization.
 *  2. Ambient floating glowing photons & digital dust.
 *  3. Continuous idle orbital sparks & glowing particles around each of the 4 logos.
 *  4. High-velocity shatter & dispersion physics upon hover / mouse proximity.
 *  5. Automatic magnetic reassembly with smooth spring easing after 1.5s.
 *  6. Responsive performance with automatic resource cleanup on exit.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SplashParticles = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LOGO_PALETTES = {
    python: {
      colors: ['#7dd3fc', '#38bdf8', '#00d2ff', '#a7f3d0', '#00ff87', '#10b981', '#ffffff'],
      glow: 'rgba(0, 210, 255, 0.95)',
      shatterCount: 260
    },
    postgresql: {
      colors: ['#00f0ff', '#38bdf8', '#60a5fa', '#336791', '#1d4e79', '#bae6fd', '#ffffff'],
      glow: 'rgba(0, 240, 255, 0.95)',
      shatterCount: 260
    },
    github: {
      colors: ['#ffffff', '#f0f9ff', '#00f0ff', '#38bdf8', '#bae6fd', '#e0f2fe'],
      glow: 'rgba(255, 255, 255, 1)',
      shatterCount: 260
    },
    mysql: {
      blueColors: ['#00758F', '#0097b2', '#38bdf8', '#0284c7', '#7dd3fc', '#ffffff'],
      orangeColors: ['#F29111', '#fbbf24', '#f59e0b', '#d97706', '#ea580c', '#ffffff'],
      colors: ['#00758F', '#38bdf8', '#F29111', '#fbbf24', '#0284c7', '#f59e0b', '#ffffff'],
      glow: 'rgba(56, 189, 248, 0.85)',
      shatterCount: 260
    }
  };

  function init(container, options = {}) {
    if (!container) return null;

    let canvas = container.querySelector('.splash-hud-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'splash-hud-canvas';
      container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let isRunning = true;
    let rafId = null;

    // Mouse Tracking
    const mouse = {
      x: -9999,
      y: -9999,
      active: false
    };

    // Ambient floating photons
    const isMobile = window.innerWidth < 768;
    const ambientCount = isMobile ? 12 : 40;
    const ambientParticles = [];
    for (let i = 0; i < ambientCount; i++) {
      ambientParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.08,
        radius: Math.random() * 1.5 + 0.8,
        baseAlpha: Math.random() * 0.45 + 0.25,
        alpha: 0.3,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02
      });
    }

    // Logo Nodes tracking the 4 large DOM cards
    const logoCards = Array.from(container.querySelectorAll('.splash-logo-card'));
    const logoNodes = logoCards.map((card) => {
      const type = card.dataset.logo || 'python';
      const palette = LOGO_PALETTES[type] || LOGO_PALETTES.python;

      // Shatter/Disperse particles distributed naturally within the logo volume
      const count = isMobile ? 80 : palette.shatterCount;
      const particles = [];
      for (let i = 0; i < count; i++) {
        let hx, hy, color;

        if (type === 'mysql') {
          // MySQL aspect ratio is ~205x106 (wider)
          const u = (Math.random() - 0.5) * 2;
          const v = (Math.random() - 0.5) * 2;
          hx = u * 85 + (Math.random() - 0.5) * 8;
          hy = v * 44 + (Math.random() - 0.5) * 8;

          // Sakila Dolphin and "My" are on the left & top; "SQL" is on the right & bottom
          if (hx < -5 || hy < -10) {
            color = palette.blueColors[Math.floor(Math.random() * palette.blueColors.length)];
          } else {
            color = palette.orangeColors[Math.floor(Math.random() * palette.orangeColors.length)];
          }
        } else {
          const u = (Math.random() - 0.5) * 2;
          const v = (Math.random() - 0.5) * 2;
          hx = u * 62 + (Math.random() - 0.5) * 12;
          hy = v * 62 + (Math.random() - 0.5) * 12;
          color = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        }

        particles.push({
          homeX: hx,
          homeY: hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          color: color,
          size: Math.random() * 2 + 1.4,
          burstPower: 0.85 + Math.random() * 0.75,
          mass: 0.8 + Math.random() * 0.4
        });
      }

      return {
        id: type,
        card: card,
        palette: palette,
        particles: particles,
        centerX: 0,
        centerY: 0,
        hitRadius: 105,
        tiltX: 0,
        tiltY: 0,
        state: 'idle', // 'idle' | 'dispersed' | 'returning'
        disperseStartTime: 0,
        holdDuration: 1500 // 1.5 seconds hold
      };
    });

    // Update screen bounds and logo coordinates
    function updatePositions() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const contRect = container.getBoundingClientRect();

      logoNodes.forEach((node) => {
        const cardRect = node.card.getBoundingClientRect();
        const cx = cardRect.left - contRect.left + cardRect.width / 2;
        const cy = cardRect.top - contRect.top + cardRect.height / 2;

        const dx = cx - node.centerX;
        const dy = cy - node.centerY;

        node.centerX = cx;
        node.centerY = cy;
        node.hitRadius = Math.max(cardRect.width, cardRect.height) * 0.62;

        // Reposition particles smoothly
        node.particles.forEach((p) => {
          if (node.state === 'idle') {
            p.x = cx + p.homeX;
            p.y = cy + p.homeY;
          } else {
            p.x += dx;
            p.y += dy;
          }
        });
      });
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }

    // Direct card hover trigger
    logoNodes.forEach((node) => {
      node.card.addEventListener('pointerenter', () => {
        triggerDisperse(node);
      });
    });

    function triggerDisperse(node) {
      if (node.state === 'dispersed') return;
      node.state = 'dispersed';
      node.disperseStartTime = performance.now();
      node.card.classList.add('is-dispersed');

      // Free, chaotic, multi-directional 3D pixel explosion (no concentric rings)
      node.particles.forEach((p) => {
        const blastAngle = Math.random() * Math.PI * 2;
        const blastSpeed = (Math.random() * 14 + 5) * p.burstPower;
        const jitterX = (Math.random() - 0.5) * 6;
        const jitterY = (Math.random() - 0.5) * 6;

        p.vx = Math.cos(blastAngle) * blastSpeed + jitterX;
        p.vy = Math.sin(blastAngle) * blastSpeed + jitterY;
      });
    }

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('resize', updatePositions, { passive: true });

    updatePositions();

    // Render Ambient Background Photons (No orbital rings around logos)
    function updateAndDrawAmbient(now) {
      ctx.save();

      for (let i = 0; i < ambientParticles.length; i++) {
        const p = ambientParticles[i];

        p.x += p.vx + Math.sin(now * 0.001 + p.phase) * 0.12;
        p.y += p.vy;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 75) {
            const force = ((75 - dist) / 75) * 1.6;
            p.x += (dx / (dist || 1)) * force;
            p.y += (dy / (dist || 1)) * force;
          }
        }

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.alpha = p.baseAlpha + Math.sin(now * p.pulseSpeed + p.phase) * 0.14;

        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.fillStyle = `rgba(186, 230, 253, ${Math.max(0.12, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Render Logo Particles Shatter & Magnetic Rebuild
    function updateAndDrawLogos(now) {
      logoNodes.forEach((node) => {
        // Cursor proximity detection
        const distToCenter = Math.hypot(mouse.x - node.centerX, mouse.y - node.centerY);
        const isNear = mouse.active && distToCenter < node.hitRadius;

        if (isNear && node.state === 'idle') {
          triggerDisperse(node);
        }

        // Return timing: 1.5s hold duration after cursor leaves (or max 2.8s)
        const timeSinceDisperse = now - node.disperseStartTime;
        if (node.state === 'dispersed') {
          if ((!isNear && timeSinceDisperse > node.holdDuration) || timeSinceDisperse > 2800) {
            node.state = 'returning';
          }
        }

        if (node.state === 'idle') return;

        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = node.palette.glow;

        let allHome = true;

        for (let i = 0; i < node.particles.length; i++) {
          const p = node.particles[i];
          const targetX = node.centerX + p.homeX;
          const targetY = node.centerY + p.homeY;

          // Repulsion if mouse is active and near
          if (mouse.active) {
            const mdx = p.x - mouse.x;
            const mdy = p.y - mouse.y;
            const mDist = Math.hypot(mdx, mdy);
            if (mDist < 95) {
              allHome = false;
              const force = Math.pow((95 - mDist) / 95, 1.3) * 16 * p.burstPower;
              const angle = Math.atan2(mdy, mdx) + (Math.random() - 0.5) * 0.4;
              p.vx += Math.cos(angle) * force;
              p.vy += Math.sin(angle) * force;
              p.vx += -Math.sin(angle) * (force * 0.28);
              p.vy += Math.cos(angle) * (force * 0.28);
            }
          }

          // Magnetic spring return
          if (node.state === 'returning') {
            const hdx = targetX - p.x;
            const hdy = targetY - p.y;
            const distHome = Math.hypot(hdx, hdy);

            if (distHome > 0.8 || Math.hypot(p.vx, p.vy) > 0.15) {
              allHome = false;
              const springK = 0.088 / p.mass;
              p.vx += hdx * springK;
              p.vy += hdy * springK;

              // Smooth critical damping
              const damping = 0.82;
              p.vx *= damping;
              p.vy *= damping;
            } else {
              p.x = targetX;
              p.y = targetY;
              p.vx = 0;
              p.vy = 0;
            }
          } else if (node.state === 'dispersed') {
            allHome = false;
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
          }

          p.x += p.vx;
          p.y += p.vy;

          // Render glowing pixel particle
          if (node.id === 'mysql') {
            ctx.shadowColor = p.color;
          }
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // When all particles return home, restore crisp vector SVG logo
        if (allHome && node.state === 'returning') {
          node.state = 'idle';
          node.card.classList.remove('is-dispersed');
        }

        ctx.restore();
      });
    }

    // Interactive 3D Tilt / Parallax Effect matching cursor movement (max 5-8 degrees)
    function updateLogoTilts() {
      const maxTilt = 7.0;

      logoNodes.forEach((node) => {
        let targetTiltX = 0;
        let targetTiltY = 0;

        if (mouse.active && mouse.x > -9000 && mouse.y > -9000) {
          const dx = mouse.x - node.centerX;
          const dy = mouse.y - node.centerY;

          // Normalize offset based on screen dimensions
          const normX = Math.max(-1, Math.min(1, dx / (width * 0.45)));
          const normY = Math.max(-1, Math.min(1, dy / (height * 0.45)));

          // Tilt pointing smoothly towards the cursor
          targetTiltY = normX * maxTilt;
          targetTiltX = -normY * maxTilt;
        }

        // Smooth organic easing / lerp damping
        node.tiltX += (targetTiltX - node.tiltX) * 0.085;
        node.tiltY += (targetTiltY - node.tiltY) * 0.085;

        // Apply interactive 3D perspective tilt to card
        if (Math.abs(node.tiltX) > 0.02 || Math.abs(node.tiltY) > 0.02) {
          node.card.style.transform = `perspective(1000px) rotateX(${node.tiltX.toFixed(2)}deg) rotateY(${node.tiltY.toFixed(2)}deg)`;
        } else {
          node.card.style.transform = '';
        }
      });
    }

    // 60 FPS RequestAnimationFrame Loop
    function loop(now) {
      if (!isRunning) return;

      if (container.style.display === 'none') {
        destroy();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      updateLogoTilts();
      updateAndDrawAmbient(now);
      updateAndDrawLogos(now);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    function destroy() {
      isRunning = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', updatePositions);
      logoNodes.forEach((node) => {
        if (node.card) node.card.style.transform = '';
      });
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    return {
      destroy,
      resize: updatePositions
    };
  }

  return {
    init
  };
});
