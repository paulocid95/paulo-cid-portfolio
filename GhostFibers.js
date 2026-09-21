/**
 * GhostFibers - Vanilla WebGL2 Implementation of React Bits GhostFibers
 * Ultra-smooth procedural cyber fibers & luminous ribbon field.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GhostFibers = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hexToRgb(hex) {
    const value = (hex || '').trim().replace(/^#/, '');
    const normalized = value.length === 3 ? value.replace(/./g, c => c + c) : value;
    const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    if (!match) return [1, 1, 1];
    return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
  }

  const VERTEX_SHADER = `#version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uRotation;
    uniform float uLayers;
    uniform float uWaveAmplitude;
    uniform float uWaveFrequency;
    uniform float uWaveSpeed;
    uniform float uLayerSpeed;
    uniform float uTwist;
    uniform float uTwistFrequency;
    uniform float uTwistSpeed;
    uniform float uLineFrequency;
    uniform float uLineSpacing;
    uniform float uLineSharpness;
    uniform float uGlowFalloff;
    uniform float uGlowIntensity;
    uniform float uBrightness;
    uniform float uBlueBoost;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uRotationSpeed;
    uniform float uLightMode;
    uniform vec3 uLineColor;
    uniform vec3 uGlowColor;

    out vec4 fragColor;

    #define MAX_LAYERS 10

    mat2 rotate2d(float angle) {
      float sine = sin(angle);
      float cosine = cos(angle);
      return mat2(cosine, -sine, sine, cosine);
    }

    float grainHash(vec2 point) {
      point = floor(point);
      float hash = 52.9829189 * fract(dot(point, vec2(0.065, 0.005)));
      return fract(hash);
    }

    float layeredGrain(vec2 fragmentPixel) {
      vec2 point = mod(fragmentPixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
      vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
      float grain = 0.0;
      grain += 0.40 * grainHash(rotated);
      grain += 0.25 * grainHash(rotated * 2.0 + 17.0);
      grain += 0.20 * grainHash(rotated * 4.0 + 47.0);
      grain += 0.10 * grainHash(rotated * 8.0 + 113.0);
      grain += 0.05 * grainHash(rotated * 16.0 + 191.0);
      return grain;
    }

    void main() {
      vec2 resolution = max(uResolution, vec2(1.0));
      vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
      float time = uTime * uSpeed;
      vec3 backdrop = mix(vec3(0.058824, 0.07451, 0.1098), vec3(1.0), step(0.5, uLightMode));
      vec3 centerTone = max(uLineColor * 0.85567 - uGlowColor * 0.06186, vec3(0.0));
      vec3 cloudTone = uLineColor * 0.19588 + uGlowColor * 0.2268;
      vec2 p = uv;
      p /= max(uScale, 0.05);
      p = rotate2d(radians(uRotation) + time * uRotationSpeed) * p;
      vec3 color = vec3(0.0);
      float fiberField = 0.0;

      for (int index = 0; index < MAX_LAYERS; index++) {
        float fi = float(index) + 1.0;
        if (fi > uLayers) break;

        p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));

        float radius = length(p);
        float polarAngle = atan(p.y, p.x);
        polarAngle += sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
        p = vec2(cos(polarAngle), sin(polarAngle)) * radius;

        float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
        lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
        fiberField += lines / fi;
        color += uLineColor * lines / fi;

        float glow = exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi)));
        color += uGlowColor * glow * uGlowIntensity / (fi * 2.0);
      }

      float center = exp(-2.2 * dot(uv, uv));
      color += centerTone * center;

      float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
      color += cloudTone * cloud;

      float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
      color *= mix(1.0 - uVignette, 1.0, vignette);
      color = 1.0 - exp(-color * uBrightness);
      color.b *= uBlueBoost;

      vec3 outputColor;
      if (uLightMode > 0.5) {
        float edgeFade = mix(1.0 - uVignette, 1.0, vignette);
        float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
        float atmosphere = (center * 0.025 + cloud * 0.015) * edgeFade;
        vec3 fiberInk = mix(backdrop, uLineColor, 0.52);
        vec3 airColor = mix(backdrop, uGlowColor, 0.16);

        outputColor = mix(backdrop, airColor, atmosphere);
        outputColor = mix(outputColor, fiberInk, fibers * 0.3);
      } else {
        outputColor = backdrop + color;
      }

      float noise = (layeredGrain(gl_FragCoord.xy) - 0.5) * uGrain;
      outputColor = clamp(outputColor + noise, 0.0, 1.0);
      fragColor = vec4(outputColor, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('GhostFibers shader error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function init(container, options = {}) {
    if (!container) return null;

    const config = {
      lineColor: options.lineColor || '#140E35',
      glowColor: options.glowColor || '#2c3282',
      speed: options.speed !== undefined ? options.speed : 0.18,
      scale: options.scale !== undefined ? options.scale : 2.0,
      rotation: options.rotation !== undefined ? options.rotation : 0,
      rotationSpeed: options.rotationSpeed !== undefined ? options.rotationSpeed : 0.2,
      layers: options.layers !== undefined ? options.layers : 4,
      waveAmplitude: options.waveAmplitude !== undefined ? options.waveAmplitude : 0.015,
      waveFrequency: options.waveFrequency !== undefined ? options.waveFrequency : 3,
      waveSpeed: options.waveSpeed !== undefined ? options.waveSpeed : 0.15,
      layerSpeed: options.layerSpeed !== undefined ? options.layerSpeed : 0.08,
      twist: options.twist !== undefined ? options.twist : 0.1,
      twistFrequency: options.twistFrequency !== undefined ? options.twistFrequency : 5,
      twistSpeed: options.twistSpeed !== undefined ? options.twistSpeed : 1.2,
      lineFrequency: options.lineFrequency !== undefined ? options.lineFrequency : 5,
      lineSpacing: options.lineSpacing !== undefined ? options.lineSpacing : 2,
      lineSharpness: options.lineSharpness !== undefined ? options.lineSharpness : 16,
      glowFalloff: options.glowFalloff !== undefined ? options.glowFalloff : 10,
      glowIntensity: options.glowIntensity !== undefined ? options.glowIntensity : 1.4,
      brightness: options.brightness !== undefined ? options.brightness : 1.7,
      blueBoost: options.blueBoost !== undefined ? options.blueBoost : 1.25,
      vignette: options.vignette !== undefined ? options.vignette : 0.85,
      grain: options.grain !== undefined ? options.grain : 0.04,
      lightMode: options.lightMode ? 1 : 0,
      dpr: Math.min(Math.max(options.dpr || 1, 0.5), 2),
      fps: options.fps || 60,
      paused: options.paused || false
    };

    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      container.appendChild(canvas);
    }
    canvas.setAttribute('aria-hidden', 'true');

    const gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) {
      console.warn('WebGL2 not supported for GhostFibers');
      return null;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('GhostFibers program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    // Full-screen triangle buffer
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uRotation = gl.getUniformLocation(program, 'uRotation');
    const uRotationSpeed = gl.getUniformLocation(program, 'uRotationSpeed');
    const uLayers = gl.getUniformLocation(program, 'uLayers');
    const uWaveAmplitude = gl.getUniformLocation(program, 'uWaveAmplitude');
    const uWaveFrequency = gl.getUniformLocation(program, 'uWaveFrequency');
    const uWaveSpeed = gl.getUniformLocation(program, 'uWaveSpeed');
    const uLayerSpeed = gl.getUniformLocation(program, 'uLayerSpeed');
    const uTwist = gl.getUniformLocation(program, 'uTwist');
    const uTwistFrequency = gl.getUniformLocation(program, 'uTwistFrequency');
    const uTwistSpeed = gl.getUniformLocation(program, 'uTwistSpeed');
    const uLineFrequency = gl.getUniformLocation(program, 'uLineFrequency');
    const uLineSpacing = gl.getUniformLocation(program, 'uLineSpacing');
    const uLineSharpness = gl.getUniformLocation(program, 'uLineSharpness');
    const uGlowFalloff = gl.getUniformLocation(program, 'uGlowFalloff');
    const uGlowIntensity = gl.getUniformLocation(program, 'uGlowIntensity');
    const uBrightness = gl.getUniformLocation(program, 'uBrightness');
    const uBlueBoost = gl.getUniformLocation(program, 'uBlueBoost');
    const uVignette = gl.getUniformLocation(program, 'uVignette');
    const uGrain = gl.getUniformLocation(program, 'uGrain');
    const uLightMode = gl.getUniformLocation(program, 'uLightMode');
    const uLineColor = gl.getUniformLocation(program, 'uLineColor');
    const uGlowColor = gl.getUniformLocation(program, 'uGlowColor');

    let frameId = 0;
    let elapsed = 0;
    let previousTime = performance.now();
    let lastRenderTime = 0;
    let isPaused = config.paused;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    let destroyed = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      const w = container.clientWidth || window.innerWidth || 1;
      const h = container.clientHeight || window.innerHeight || 1;
      canvas.width = Math.max(1, Math.floor(w * config.dpr));
      canvas.height = Math.max(1, Math.floor(h * config.dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const render = () => {
      gl.useProgram(program);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uSpeed, config.speed);
      gl.uniform1f(uScale, config.scale);
      gl.uniform1f(uRotation, config.rotation);
      gl.uniform1f(uRotationSpeed, config.rotationSpeed);
      gl.uniform1f(uLayers, Math.min(Math.max(Math.round(config.layers), 1), 10));
      gl.uniform1f(uWaveAmplitude, config.waveAmplitude);
      gl.uniform1f(uWaveFrequency, config.waveFrequency);
      gl.uniform1f(uWaveSpeed, config.waveSpeed);
      gl.uniform1f(uLayerSpeed, config.layerSpeed);
      gl.uniform1f(uTwist, config.twist);
      gl.uniform1f(uTwistFrequency, config.twistFrequency);
      gl.uniform1f(uTwistSpeed, config.twistSpeed);
      gl.uniform1f(uLineFrequency, config.lineFrequency);
      gl.uniform1f(uLineSpacing, config.lineSpacing);
      gl.uniform1f(uLineSharpness, config.lineSharpness);
      gl.uniform1f(uGlowFalloff, config.glowFalloff);
      gl.uniform1f(uGlowIntensity, config.glowIntensity);
      gl.uniform1f(uBrightness, config.brightness);
      gl.uniform1f(uBlueBoost, config.blueBoost);
      gl.uniform1f(uVignette, config.vignette);
      gl.uniform1f(uGrain, config.grain);
      gl.uniform1f(uLightMode, config.lightMode);

      const lc = hexToRgb(config.lineColor);
      const gc = hexToRgb(config.glowColor);
      gl.uniform3f(uLineColor, lc[0], lc[1], lc[2]);
      gl.uniform3f(uGlowColor, gc[0], gc[1], gc[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const canAnimate = () => isVisible && isPageVisible && !isPaused && !reducedMotion.matches;

    const loop = now => {
      frameId = 0;
      if (destroyed || !canAnimate()) return;

      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      elapsed += delta;

      if (now - lastRenderTime >= 1000 / config.fps - 0.5) {
        render();
        lastRenderTime = now;
      }

      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!canAnimate() || frameId !== 0) return;
      previousTime = performance.now();
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (frameId !== 0) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const handleVisibility = () => {
      isPageVisible = !document.hidden;
      if (canAnimate()) start();
      else stop();
    };

    const handleReducedMotion = () => {
      if (canAnimate()) start();
      else {
        stop();
        render();
      }
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion.addEventListener('change', handleReducedMotion);

    resize();
    render();
    start();

    return {
      destroy() {
        destroyed = true;
        stop();
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', handleVisibility);
        reducedMotion.removeEventListener('change', handleReducedMotion);
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
      setConfig(newConfig) {
        Object.assign(config, newConfig);
        render();
      },
      setPaused(paused) {
        isPaused = paused;
        if (canAnimate()) start();
        else stop();
      }
    };
  }

  return { init };
});
