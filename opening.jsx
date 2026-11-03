import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const TOTAL_MS = 2300;
const CURTAIN_START = 800;
const CURTAIN_DURATION = 850;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function OpeningCurtain() {
  const curtainRef = useRef(null);

  useEffect(() => {
    const curtain = curtainRef.current;
    if (!curtain) return undefined;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let frame = 0;
    let startAt = 0;
    let timelineStartedAt = 0;
    let lastProgress = 0;
    let skipRequested = false;
    let revealStarted = false;
    const revealHero=()=>{
      if(window.__dxHeroRevealed)return;
      window.__dxHeroRevealed=true;
      window.dispatchEvent(new CustomEvent('dx:hero-reveal'));
    };
    let loadTimer = 0;
    let cleanupIntent = () => {};
    const body = document.body;

    const finish = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      cleanupIntent();
      body.classList.remove('opening-running');
      body.classList.add('opening-ready');
      revealHero();
      curtain.classList.add('opening-curtain-done');
      window.setTimeout(() => {
        if (!disposed) curtain.remove();
      }, 700);
    };

    if (reducedMotion) {
      finish();
      return () => { disposed = true; };
    }

    function tick(now) {
      if (disposed) return;
      const elapsed = now - timelineStartedAt;
      const curtainProgress = clamp((elapsed - CURTAIN_START) / CURTAIN_DURATION);
      const eased = curtainProgress * curtainProgress * (3 - 2 * curtainProgress);
      if(curtainProgress>=.92)revealHero();
      const dt = Math.max(1, now - (startAt || now));
      const velocity = (eased - lastProgress) / dt * 1000;
      startAt = now;
      lastProgress = eased;
      if (!revealStarted && elapsed >= CURTAIN_START) {
        revealStarted = true;
        body.classList.add('opening-revealing');
      }

      // A normalized speed signal from the moving curtain drives the bag's
      // spring mesh while the reveal crosses the hero.
      window.__dxCurtainWind = curtainProgress > 0 && curtainProgress < 1
        ? clamp(velocity * 1.8, 0, 1)
        : 0;
      window.dispatchEvent(new CustomEvent('dx:opening-motion', {
        detail: { progress: curtainProgress, velocity: window.__dxCurtainWind },
      }));

      if (skipRequested || elapsed >= TOTAL_MS) {
        window.__dxCurtainWind = 0;
        window.dispatchEvent(new CustomEvent('dx:opening-motion', {
          detail: { progress: 1, velocity: 0 },
        }));
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    const start = () => {
      if (disposed || frame) return;
      timelineStartedAt = performance.now();
      body.classList.add('opening-running');
      frame = requestAnimationFrame(tick);
    };

    const onFirstIntent = () => {
      if (timelineStartedAt) {
        skipRequested = true;
        if (!revealStarted) {
          revealStarted = true;
          body.classList.add('opening-revealing');
        }
      }
    };
    const onKeyIntent = event => {
      if ([' ', 'ArrowDown', 'PageDown'].includes(event.key)) onFirstIntent();
    };
    window.addEventListener('wheel', onFirstIntent, { passive: true });
    window.addEventListener('touchstart', onFirstIntent, { passive: true });
    window.addEventListener('keydown', onKeyIntent);
    cleanupIntent = () => {
      window.removeEventListener('wheel', onFirstIntent);
      window.removeEventListener('touchstart', onFirstIntent);
      window.removeEventListener('keydown', onKeyIntent);
    };

    const waitForLoad = () => { loadTimer = window.setTimeout(start, 120); };
    if (document.readyState === 'complete') waitForLoad();
    else window.addEventListener('load', waitForLoad, { once: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(loadTimer);
      cleanupIntent();
      window.removeEventListener('load', waitForLoad);
    };
  }, []);

  return (
    <div className="opening-curtain" ref={curtainRef} aria-label="D/X 开场">
      <div className="opening-mark-wrap" aria-hidden="true">
        <span className="opening-mark">D<span>/</span>X</span>
        <span className="opening-rule"><i /></span>
      </div>
      <span className="opening-caption">OPENING A LITTLE WINDOW INTO MY MIND...</span>
    </div>
  );
}

const root = document.getElementById('opening-root');
if (root) createRoot(root).render(<OpeningCurtain />);
