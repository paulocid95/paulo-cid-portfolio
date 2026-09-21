/**
 * GlowCursor - Vanilla WebGL Implementation of React Bits GlowCursor
 * Zero external dependencies, high performance, hardware-accelerated.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlowCursor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_POINTS = 64;

  const VERTEX_SHADER = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = (position + 1.0) * 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;
    #define MAX_POINTS 64

    uniform vec2 uResolution;
    uniform vec2 uPoints[MAX_POINTS];
    uniform float uPointCount;
    uniform vec3 uColor;
    uniform vec3 uSecondaryColor;
    uniform float uTrailWidth;
    uniform float uTaper;
    uniform float uGlowIntensity;
    uniform float uGlowSpread;
    uniform float uHotspot;
    uniform float uBrightness;
    uniform float uOpacity;
    uniform float uPulseSpeed;
    uniform float uNoiseStrength;
    uniform float uNormalBlend;
    uniform float uTime;
    uniform float uFade;

    varying vec2 vUv;

    float sRGB(float x) {
      if (x <= 0.00031308) return 12.92 * x;
      return 1.055 * pow(x, 1.0 / 2.4) - 0.055;
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float filmGrain(vec2 p, float time) {
      float frame = time * 18.0;
      float frameIndex = mod(floor(frame), 256.0);
      float nextFrameIndex = mod(frameIndex + 1.0, 256.0);
      float blend = fract(frame);
      blend = blend * blend * (3.0 - 2.0 * blend);
      vec2 pixel = floor(p);
      float current = hash(pixel + vec2(frameIndex * 17.0, frameIndex * 31.0));
      float next = hash(pixel + vec2(nextFrameIndex * 17.0, nextFrameIndex * 31.0));
      return mix(current, next, blend) * 2.0 - 1.0;
    }

    void main() {
      vec2 pixel = vUv * uResolution;
      float denominator = max(uPointCount - 1.0, 1.0);
      float strongest = 0.0;
      float strongestCore = 0.0;
      float colorWeight = 0.0;
      vec3 colorSum = vec3(0.0);

      for (int i = 0; i < MAX_POINTS - 1; i++) {
        float index = float(i);
        float active = 1.0 - step(uPointCount - 1.0, index);
        vec2 start = uPoints[i];
        vec2 end = uPoints[i + 1];
        vec2 toPixel = pixel - start;
        vec2 segment = end - start;
        float along = clamp(dot(toPixel, segment) / max(dot(segment, segment), 0.0001), 0.0, 1.0);
        float progress = clamp((index + along) / denominator, 0.0, 1.0);
        float life = pow(max(1.0 - progress, 0.0), mix(0.55, 1.25, uTaper));
        float width = uTrailWidth * mix(1.0, 0.25, pow(progress, mix(0.55, 1.6, uTaper)));
        float distanceToTrail = length(toPixel - segment * along);
        float falloff = max(width * (0.8 + uGlowSpread * 1.4), 0.5);
        float beam = min(1.0, (falloff * falloff) / (distanceToTrail * distanceToTrail + falloff * falloff));
        float core = exp(-pow(distanceToTrail / max(width, 0.5), 2.0) * 2.5);
        float pulseAmount = min(abs(uPulseSpeed), 1.0);
        float pulse = 1.0 + sin(uTime * uPulseSpeed * 3.0 - progress * 11.0) * 0.16 * pulseAmount;
        float intensity = (core + beam * uGlowIntensity * 0.55) * life * pulse * active;
        vec3 segmentColor = mix(uColor, uSecondaryColor, progress);

        strongest = max(strongest, intensity);
        strongestCore = max(strongestCore, core * life * active);
        colorSum += segmentColor * intensity;
        colorWeight += intensity;
      }

      float grain = filmGrain(pixel, uTime);
      float noiseAmount = (1.0 - exp(-uNoiseStrength * 2.2)) * 0.4;
      float alpha = clamp(strongest * uOpacity * uFade, 0.0, 1.0);
      if (alpha < 0.0005) discard;

      vec3 color = colorSum / max(colorWeight, 0.0001);
      color = mix(color, vec3(1.0), smoothstep(0.25, 0.95, strongestCore) * uHotspot);
      float luminance = sRGB(clamp(strongest * uBrightness, 0.0, 1.0));
      luminance *= 1.0 + grain * noiseAmount;
      vec3 additiveColor = color * luminance;
      float normalAlpha = clamp(strongest * uBrightness * uOpacity * uFade, 0.0, 1.0);
      vec3 normalColor = mix(color, vec3(1.0), smoothstep(0.45, 1.0, strongestCore) * uHotspot * 0.35);
      gl_FragColor = vec4(mix(additiveColor, normalColor, uNormalBlend), mix(alpha, normalAlpha, uNormalBlend));
    }
  `;

  function hexToRgb(hex) {
    let value = (hex || '').replace('#', '').trim();
    if (value.length === 3) {
      value = value.split('').map(c => c + c).join('');
    }
    const parsed = parseInt(value || '000000', 16);
    return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('GlowCursor shader error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function init(container, options = {}) {
    if (!container) return null;

    const config = {
      color: options.color || '#38bdf8',
      secondaryColor: options.secondaryColor || '#a78bfa',
      trailLength: options.trailLength !== undefined ? options.trailLength : 32,
      trailWidth: options.trailWidth !== undefined ? options.trailWidth : 5,
      trailTaper: options.trailTaper !== undefined ? options.trailTaper : 0.85,
      followSpeed: options.followSpeed !== undefined ? options.followSpeed : 0.16,
      glowIntensity: options.glowIntensity !== undefined ? options.glowIntensity : 0.75,
      glowSpread: options.glowSpread !== undefined ? options.glowSpread : 0.55,
      hotspot: options.hotspot !== undefined ? options.hotspot : 0.2,
      brightness: options.brightness !== undefined ? options.brightness : 0.8,
      opacity: options.opacity !== undefined ? options.opacity : 0.65,
      pulseSpeed: options.pulseSpeed !== undefined ? options.pulseSpeed : 0.6,
      noiseStrength: options.noiseStrength !== undefined ? options.noiseStrength : 0.02,
      idleFade: options.idleFade !== undefined ? options.idleFade : true,
      idleTimeout: options.idleTimeout !== undefined ? options.idleTimeout : 500,
      fadeDuration: options.fadeDuration !== undefined ? options.fadeDuration : 600,
      blendMode: options.blendMode || 'screen',
      maxDevicePixelRatio: options.maxDevicePixelRatio || 1.5,
      enabled: options.enabled !== undefined ? options.enabled : true
    };

    let canvas = container.querySelector('canvas.glow-cursor__canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'glow-cursor__canvas';
      container.appendChild(canvas);
    }
    canvas.style.mixBlendMode = config.blendMode;

    const gl = canvas.getContext('webgl', { alpha: true, depth: false, antialias: false });
    if (!gl) {
      console.warn('WebGL not supported for GlowCursor');
      return null;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('GlowCursor link error:', gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    // Full-screen triangle covering [-1, -1] to [3, -1], [-1, 3]
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uPoints = gl.getUniformLocation(program, 'uPoints[0]');
    const uPointCount = gl.getUniformLocation(program, 'uPointCount');
    const uColor = gl.getUniformLocation(program, 'uColor');
    const uSecondaryColor = gl.getUniformLocation(program, 'uSecondaryColor');
    const uTrailWidth = gl.getUniformLocation(program, 'uTrailWidth');
    const uTaper = gl.getUniformLocation(program, 'uTaper');
    const uGlowIntensity = gl.getUniformLocation(program, 'uGlowIntensity');
    const uGlowSpread = gl.getUniformLocation(program, 'uGlowSpread');
    const uHotspot = gl.getUniformLocation(program, 'uHotspot');
    const uBrightness = gl.getUniformLocation(program, 'uBrightness');
    const uOpacity = gl.getUniformLocation(program, 'uOpacity');
    const uPulseSpeed = gl.getUniformLocation(program, 'uPulseSpeed');
    const uNoiseStrength = gl.getUniformLocation(program, 'uNoiseStrength');
    const uNormalBlend = gl.getUniformLocation(program, 'uNormalBlend');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uFade = gl.getUniformLocation(program, 'uFade');

    const pointData = new Float32Array(MAX_POINTS * 2);
    const points = Array.from({ length: MAX_POINTS }, () => ({ x: 0, y: 0 }));
    const target = { x: 0, y: 0 };
    const head = { x: 0, y: 0 };

    let width = 1;
    let height = 1;
    let initialized = false;
    let pointerInside = false;
    let fade = 0;
    let lastInputTime = performance.now();
    let lastFrameTime = performance.now();
    let raf = 0;
    let destroyed = false;

    const dpr = Math.min(window.devicePixelRatio || 1, config.maxDevicePixelRatio);

    const resize = () => {
      width = container.clientWidth || window.innerWidth || 1;
      height = container.clientHeight || window.innerHeight || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const initializeTrail = (x, y) => {
      target.x = x; target.y = y;
      head.x = x; head.y = y;
      for (let i = 0; i < MAX_POINTS; i++) {
        points[i].x = x;
        points[i].y = y;
      }
      initialized = true;
      fade = 1;
    };

    const updatePointer = event => {
      const rect = container.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, rect.width) * dpr;
      const y = clamp(rect.height - (event.clientY - rect.top), 0, rect.height) * dpr;
      if (!initialized) initializeTrail(x, y);
      target.x = x;
      target.y = y;
      pointerInside = true;
      lastInputTime = performance.now();
    };

    const onPointerLeave = () => {
      pointerInside = false;
      lastInputTime = performance.now();
    };

    const render = now => {
      if (destroyed) return;
      const delta = Math.min((now - lastFrameTime) / 16.667, 3);
      lastFrameTime = now;

      if (initialized) {
        const headEase = 1 - Math.pow(1 - clamp(config.followSpeed, 0.01, 0.99), delta);
        const chainBase = clamp(0.28 + config.followSpeed * 0.35, 0.08, 0.92);
        const chainEase = 1 - Math.pow(1 - chainBase, delta);
        head.x += (target.x - head.x) * headEase;
        head.y += (target.y - head.y) * headEase;
        points[0].x = head.x;
        points[0].y = head.y;

        for (let i = 1; i < MAX_POINTS; i++) {
          points[i].x += (points[i - 1].x - points[i].x) * chainEase;
          points[i].y += (points[i - 1].y - points[i].y) * chainEase;
        }

        for (let i = 0; i < MAX_POINTS; i++) {
          pointData[i * 2] = points[i].x;
          pointData[i * 2 + 1] = points[i].y;
        }
      }

      const idleFor = now - lastInputTime;
      const shouldFade = config.idleFade && (!pointerInside || idleFor > config.idleTimeout);
      const fadeStep = (16.667 * delta) / Math.max(config.fadeDuration, 16);
      const fadeTarget = initialized && config.enabled && !shouldFade ? 1 : 0;
      fade += (fadeTarget - fade) * Math.min(1, fadeStep * 7);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (fade > 0.001) {
        gl.useProgram(program);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform2fv(uPoints, pointData);
        gl.uniform1f(uPointCount, clamp(Math.round(config.trailLength), 2, MAX_POINTS));
        gl.uniform3fv(uColor, hexToRgb(config.color));
        gl.uniform3fv(uSecondaryColor, hexToRgb(config.secondaryColor));
        gl.uniform1f(uTrailWidth, Math.max(config.trailWidth * dpr, 0.1));
        gl.uniform1f(uTaper, clamp(config.trailTaper, 0, 1));
        gl.uniform1f(uGlowIntensity, Math.max(config.glowIntensity, 0));
        gl.uniform1f(uGlowSpread, Math.max(config.glowSpread, 0));
        gl.uniform1f(uHotspot, clamp(config.hotspot, 0, 1));
        gl.uniform1f(uBrightness, Math.max(config.brightness, 0));
        gl.uniform1f(uOpacity, clamp(config.opacity, 0, 1));
        gl.uniform1f(uPulseSpeed, config.pulseSpeed);
        gl.uniform1f(uNoiseStrength, clamp(config.noiseStrength, 0, 1));
        gl.uniform1f(uNormalBlend, config.blendMode === 'normal' ? 1 : 0);
        gl.uniform1f(uTime, now * 0.001);
        gl.uniform1f(uFade, fade);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      raf = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', updatePointer);
    window.addEventListener('pointerenter', updatePointer);
    window.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('mouseleave', onPointerLeave);

    resize();
    raf = requestAnimationFrame(render);

    return {
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', updatePointer);
        window.removeEventListener('pointerenter', updatePointer);
        window.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('mouseleave', onPointerLeave);
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      },
      setConfig(newConfig) {
        Object.assign(config, newConfig);
        if (newConfig.blendMode) canvas.style.mixBlendMode = newConfig.blendMode;
      }
    };
  }

  return { init };
});
