/**
 * TouchRipple.js - Efeito Sci-Fi Touch Ripple para Telas Móveis e Dispositivos Touch
 * Dispara ondas de choque luminosas em neon ciano/azul nas coordenadas de toque.
 * Desativa-se em desktops com mouse hover para manter a separação total de plataformas.
 */
(function () {
  function isMobileOrTouch() {
    return window.matchMedia('(max-width: 768px), (hover: none), (pointer: coarse)').matches;
  }

  function createSciFiRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'scifi-touch-ripple';
    ripple.style.setProperty('--touch-x', Math.round(x) + 'px');
    ripple.style.setProperty('--touch-y', Math.round(y) + 'px');

    document.body.appendChild(ripple);

    function cleanup() {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }

    ripple.addEventListener('animationend', cleanup, { once: true });
    // Fallback de limpeza
    setTimeout(cleanup, 550);
  }

  // Escutar toques na tela (touchstart)
  window.addEventListener(
    'touchstart',
    function (e) {
      if (!isMobileOrTouch()) return;
      const touches = e.changedTouches || e.touches;
      if (!touches) return;

      for (let i = 0; i < touches.length; i++) {
        createSciFiRipple(touches[i].clientX, touches[i].clientY);
      }
    },
    { passive: true }
  );

  // Fallback para pointerdown em dispositivos com touch pointer
  window.addEventListener(
    'pointerdown',
    function (e) {
      if (e.pointerType === 'touch' && isMobileOrTouch()) {
        // Já capturado pelo touchstart se suportado, mas garante caso touchstart não dispare
        // Evita duplicidade se ambos dispararem no mesmo timestamp
      }
    },
    { passive: true }
  );
})();
