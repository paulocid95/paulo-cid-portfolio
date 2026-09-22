/**
 * WarpText - Vanilla WebGL2 Implementation of React Bits WarpText
 * Features: Ambient glass distortion, liquid pointer lensing, chromatic refraction, ripple wave.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WarpText = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERTEX_SHADER = `#version 300 es
    in vec2 position;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform sampler2D uTextTexture;
    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uPointerActive;
    uniform float uTime;
    uniform float uWarpStrength;
    uniform float uWarpScale;
    uniform float uSpeed;
    uniform float uPointerInfluence;
    uniform float uPointerStrength;
    uniform float uRefraction;
    uniform float uRipple;
    uniform float uMotion;

    in vec2 vUv;
    out vec4 fragColor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.02;
        amplitude *= 0.5;
      }
      return value;
    }

    vec4 sampleText(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4(0.0);
      }
      return texture(uTextTexture, uv);
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      float time = uTime * uSpeed;
      float scale = max(uWarpScale, 0.001);

      vec2 drift = vec2(time * 0.055, -time * 0.045);
      float n1 = fbm(uv * scale * 3.1 + drift);
      float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
      vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

      vec2 pointerDelta = uv - uPointer;
      vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
      float dist = length(aspectDelta);
      float radius = max(uPointerInfluence, 0.001);
      float t = clamp(dist / radius, 0.0, 1.0);
      float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
      float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
      vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

      float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
      float rippleRing = (rippleWave - 0.5) * uRipple;
      vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
      pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

      vec2 displaced = uv + ambient + pointerWarp;
      vec2 splitDir = ambient + pointerWarp;
      float splitLen = length(splitDir);
      splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
      vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

      vec4 base = sampleText(displaced);
      float r = sampleText(displaced + split).r;
      float g = base.g;
      float b = sampleText(displaced - split).b;
      float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

      vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
      fragColor = vec4(color, a);
    }
  `;

  const getFontValue = value => (typeof value === 'number' ? `${value}px` : value);

  const measureLine = (ctx, line, letterSpacing) => {
    const chars = Array.from(line);
    const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
    return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
  };

  const drawLine = (ctx, line, x, y, letterSpacing) => {
    const chars = Array.from(line);
    let cursor = x - measureLine(ctx, line, letterSpacing) / 2;

    chars.forEach((char, index) => {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
    });
  };

  const buildTextCanvas = ({ container, width, height, dpr, props }) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const probe = document.createElement('span');
    probe.textContent = props.text;
    Object.assign(probe.style, {
      position: 'absolute',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      inset: '0 auto auto 0',
      fontFamily: props.fontFamily,
      fontSize: getFontValue(props.fontSize),
      fontWeight: String(props.fontWeight),
      letterSpacing: getFontValue(props.letterSpacing),
      lineHeight: typeof props.lineHeight === 'number' ? String(props.lineHeight) : props.lineHeight
    });
    container.appendChild(probe);
    const computed = window.getComputedStyle(probe);
    let fontSizePx = parseFloat(computed.fontSize) || 96;
    const fontFamily = computed.fontFamily || 'sans-serif';
    const fontWeight = computed.fontWeight || String(props.fontWeight);
    let letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
    let lineHeight = parseFloat(computed.lineHeight);
    if (!Number.isFinite(lineHeight)) {
      lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.92);
    }
    probe.remove();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = props.color;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const lines = String(props.text || '').split('\n');
    const applyFont = () => {
      ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    };
    applyFont();

    const maxWidth = width * 0.92;
    const maxHeight = height * 0.85;
    const widest = Math.max(...lines.map(line => measureLine(ctx, line, letterSpacing)), 1);
    const blockHeight = Math.max(lineHeight * lines.length, 1);
    const fit = Math.min(1, maxWidth / widest, maxHeight / blockHeight);

    if (fit < 1) {
      fontSizePx *= fit;
      letterSpacing *= fit;
      lineHeight *= fit;
      applyFont();
    }

    const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
    lines.forEach((line, index) => drawLine(ctx, line, width / 2, startY + index * lineHeight, letterSpacing));

    return canvas;
  };

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('WarpText Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('WarpText Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function init(container, userOptions) {
    if (!container) return null;

    const options = Object.assign({
      text: 'Paulo Cid',
      color: '#f8f5ff',
      warpStrength: 0.08,
      warpScale: 1.7,
      speed: 0.55,
      pointerInfluence: 0.42,
      pointerStrength: 0.38,
      refraction: 0.018,
      ripple: true,
      fontSize: 'clamp(2.5rem, 8vw, 6.5rem)',
      fontWeight: 800,
      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      letterSpacing: '-0.04em',
      lineHeight: 0.95
    }, userOptions || {});

    let canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let gl;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true
      });
    } catch (e) {
      console.warn('WarpText: WebGL2 not supported', e);
      return null;
    }

    if (!gl) {
      console.warn('WarpText: WebGL2 could not be initialized.');
      return null;
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return null;

    // Full screen triangle geometry
    // Pos: [-1, -1], [3, -1], [-1, 3]
    // UV:  [ 0,  0], [2,  0], [ 0,  2]
    const positions = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3
    ]);
    const uvs = new Float32Array([
      0, 0,
      2, 0,
      0, 2
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // Text texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Uniform locations
    const uLocs = {
      uTextTexture: gl.getUniformLocation(program, 'uTextTexture'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uPointer: gl.getUniformLocation(program, 'uPointer'),
      uPointerActive: gl.getUniformLocation(program, 'uPointerActive'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uWarpStrength: gl.getUniformLocation(program, 'uWarpStrength'),
      uWarpScale: gl.getUniformLocation(program, 'uWarpScale'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uPointerInfluence: gl.getUniformLocation(program, 'uPointerInfluence'),
      uPointerStrength: gl.getUniformLocation(program, 'uPointerStrength'),
      uRefraction: gl.getUniformLocation(program, 'uRefraction'),
      uRipple: gl.getUniformLocation(program, 'uRipple'),
      uMotion: gl.getUniformLocation(program, 'uMotion')
    };

    let disposed = false;
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const startTime = performance.now();
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    let reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    function rasterize() {
      if (disposed) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const textCanvas = buildTextCanvas({
        container,
        width: rect.width,
        height: rect.height,
        dpr,
        props: options
      });

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    }

    function resize() {
      if (disposed) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      gl.viewport(0, 0, w, h);
      rasterize();
    }

    const onPointerMove = event => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointer.activeTarget = 1;
    };

    const onPointerLeave = () => {
      pointer.activeTarget = 0;
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) rasterize();
      });
    }

    resize();

    function render(now) {
      if (disposed) return;

      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget > 0 ? pointer.tx : idleX;
      const targetY = pointer.activeTarget > 0 ? pointer.ty : idleY;
      const damping = pointer.activeTarget > 0 ? 0.12 : 0.035;

      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget > 0 ? 1 : 0.18) - pointer.active) * 0.06;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uLocs.uTextTexture, 0);

      gl.uniform2f(uLocs.uResolution, canvas.width, canvas.height);
      gl.uniform2f(uLocs.uPointer, pointer.x, pointer.y);
      gl.uniform1f(uLocs.uPointerActive, reduceMotion ? pointer.active * 0.35 : pointer.active);
      gl.uniform1f(uLocs.uTime, reduceMotion ? 0 : elapsed);
      gl.uniform1f(uLocs.uWarpStrength, options.warpStrength);
      gl.uniform1f(uLocs.uWarpScale, options.warpScale);
      gl.uniform1f(uLocs.uSpeed, options.speed);
      gl.uniform1f(uLocs.uPointerInfluence, options.pointerInfluence);
      gl.uniform1f(uLocs.uPointerStrength, options.pointerStrength);
      gl.uniform1f(uLocs.uRefraction, options.refraction);
      gl.uniform1f(uLocs.uRipple, options.ripple ? 1 : 0);
      gl.uniform1f(uLocs.uMotion, reduceMotion ? 0 : 1);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);

    return {
      destroy: function () {
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        if (canvas.parentNode === container) {
          container.removeChild(canvas);
        }
        try {
          gl.deleteTexture(texture);
          gl.deleteBuffer(posBuffer);
          gl.deleteBuffer(uvBuffer);
          gl.deleteProgram(program);
        } catch (e) {}
      },
      updateText: function (newText) {
        options.text = newText;
        rasterize();
      }
    };
  }

  return { init: init };
});
