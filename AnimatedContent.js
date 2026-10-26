/**
 * AnimatedContent - Vanilla JS + GSAP Implementation of React Bits AnimatedContent
 * High performance scroll-triggered and mount-triggered element animations.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AnimatedContent = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WIPES = {
    up: 'linear-gradient(to top, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    down: 'linear-gradient(to bottom, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    left: 'linear-gradient(to left, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    right: 'linear-gradient(to right, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    center:
      'radial-gradient(farthest-corner at 50% 50%, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))'
  };

  /**
   * Initializes AnimatedContent on a DOM element or selector.
   * @param {string|HTMLElement} target - The DOM element or selector.
   * @param {Object} options - Configuration options.
   * @returns {Object} Control methods including kill, play, reverse.
   */
  function init(target, options = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    const {
      container = null,
      distance = 100,
      direction = 'vertical',
      reverse = false,
      duration = 0.8,
      ease = 'power3.out',
      initialOpacity = 0,
      animateOpacity = true,
      scale = 1,
      blur = 0,
      rotate = 0,
      tilt = 0,
      wipe = 'none',
      threshold = 0.1,
      delay = 0,
      stagger = 0,
      staggerFrom = 'start',
      trigger = 'scroll',
      once = true,
      scrub = false,
      disappearAfter = 0,
      disappearDuration = 0.5,
      disappearEase = 'power3.in',
      onStart,
      onComplete,
      onDisappearanceComplete
    } = options;

    if (typeof gsap === 'undefined') {
      console.warn('AnimatedContent requires GSAP to be loaded.');
      el.style.visibility = 'visible';
      return null;
    }

    if (typeof ScrollTrigger !== 'undefined' && gsap.registerPlugin) {
      gsap.registerPlugin(ScrollTrigger);
    }

    let scroller = container || document.getElementById('snap-main-container') || null;
    if (typeof scroller === 'string') scroller = document.querySelector(scroller);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const targets = stagger > 0 && el.children.length ? Array.from(el.children) : [el];
    const horizontal = direction === 'horizontal';
    const axis = horizontal ? 'x' : 'y';
    const sign = reverse ? -1 : 1;
    const mask = WIPES[wipe];

    gsap.set(el, { visibility: 'visible' });

    if (reduce) {
      if (typeof onComplete === 'function') onComplete();
      return {
        kill: () => {},
        play: () => {},
        reverse: () => {}
      };
    }

    const from = {
      [axis]: distance * sign,
      scale,
      opacity: animateOpacity ? initialOpacity : 1
    };
    const to = {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration,
      ease
    };

    if (blur > 0) {
      from.filter = `blur(${blur}px)`;
      to.filter = 'blur(0px)';
    }
    if (rotate) {
      from.rotation = rotate * sign;
      to.rotation = 0;
    }
    if (tilt) {
      const tiltAxis = horizontal ? 'rotationY' : 'rotationX';
      from[tiltAxis] = horizontal ? -tilt * sign : tilt * sign;
      to[tiltAxis] = 0;
      from.transformPerspective = 900;
      to.transformPerspective = 900;
    }
    if (mask) {
      gsap.set(targets, { maskImage: mask, webkitMaskImage: mask });
      from['--ac-wipe'] = 0;
      to['--ac-wipe'] = 1;
    }
    if (stagger > 0) to.stagger = { each: stagger, from: staggerFrom };

    const settle = () => {
      if (scrub) return;
      gsap.set(targets, { clearProps: mask ? 'filter,transform,maskImage,webkitMaskImage' : 'filter,transform' });
    };

    const disappear = () => {
      if (disappearAfter <= 0) return;
      const out = {
        [axis]: -distance * sign,
        scale: 0.8,
        opacity: animateOpacity ? initialOpacity : 0,
        delay: disappearAfter,
        duration: disappearDuration,
        ease: disappearEase,
        onComplete: () => {
          if (typeof onDisappearanceComplete === 'function') onDisappearanceComplete();
        }
      };
      if (blur > 0) out.filter = `blur(${blur}px)`;
      if (stagger > 0) out.stagger = { each: stagger, from: staggerFrom };
      gsap.to(targets, out);
    };

    const tl = gsap.timeline({
      paused: true,
      onStart: () => {
        if (typeof onStart === 'function') onStart();
      },
      onComplete: () => {
        if (typeof onComplete === 'function') onComplete();
        settle();
        if (once && !scrub) disappear();
      }
    });

    tl.fromTo(targets, from, to, scrub ? 0 : Math.max(delay, 0));

    let scrollTriggerInstance = null;

    if (trigger === 'mount') {
      tl.play();
    } else if (typeof ScrollTrigger !== 'undefined') {
      const start = `top ${(1 - threshold) * 100}%`;

      if (scrub) {
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: el,
          scroller,
          start,
          end: `top ${Math.max((1 - threshold) * 100 - 45, 5)}%`,
          scrub: scrub === true ? true : Math.max(Number(scrub) || 0, 0.01),
          animation: tl
        });
      } else {
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: el,
          scroller,
          start,
          once,
          onEnter: () => tl.play(),
          onLeaveBack: once
            ? undefined
            : () => {
                if (mask) gsap.set(targets, { maskImage: mask, webkitMaskImage: mask });
                tl.reverse();
              }
        });
      }
    } else {
      // Fallback if ScrollTrigger is not loaded
      tl.play();
    }

    return {
      timeline: tl,
      scrollTrigger: scrollTriggerInstance,
      play: () => tl.play(),
      reverse: () => tl.reverse(),
      kill: () => {
        if (scrollTriggerInstance) scrollTriggerInstance.kill();
        tl.kill();
      }
    };
  }

  /**
   * Automatically initializes all elements with data-animated-content attributes.
   * If a splash screen is currently active, waits for dismissal so animations don't play invisibly behind it.
   */
  function autoInit() {
    const isSplashActive = () => {
      const splash = document.getElementById('splash-screen');
      const hasClass =
        document.documentElement.classList.contains('splash-active') ||
        document.body.classList.contains('splash-active');
      return Boolean(hasClass && splash && getComputedStyle(splash).display !== 'none');
    };

    const runInit = () => {
      const elements = document.querySelectorAll('[data-animated-content]');
      elements.forEach(el => {
        if (el.__animatedContentInit) return;
        el.__animatedContentInit = true;
        try {
          const rawOptions = el.getAttribute('data-animated-content');
          const opts = rawOptions ? JSON.parse(rawOptions) : {};
          init(el, opts);
        } catch (err) {
          console.warn('AnimatedContent parse error:', err);
          init(el);
        }
      });

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    };

    if (isSplashActive()) {
      let triggered = false;
      const onSplashExit = () => {
        if (triggered) return;
        triggered = true;
        // Wait slightly for splash fade-out to reveal the main viewport
        setTimeout(() => {
          runInit();
        }, 350);
      };

      window.addEventListener('splash:dismissed', onSplashExit, { once: true });

      const splashBtn = document.getElementById('splash-enter-btn');
      if (splashBtn) {
        splashBtn.addEventListener('click', () => {
          setTimeout(onSplashExit, 350);
        }, { once: true });
      }

      // Safety MutationObserver: observe when splash-active class is removed
      const observer = new MutationObserver(() => {
        if (!isSplashActive()) {
          observer.disconnect();
          onSplashExit();
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

      // Fallback timer: if splash was somehow already dismissed
      setTimeout(() => {
        if (!triggered && !isSplashActive()) {
          onSplashExit();
        }
      }, 3000);
    } else {
      runInit();
    }
  }

  return {
    init,
    autoInit
  };
});
