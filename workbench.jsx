import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const imageModules = import.meta.glob('./assets/*.png', { eager: true, query: '?url', import: 'default' });
const objectImage = key => imageModules[`./assets/${key}.png`];

const objects = [
  ['vite', 'Vite'], ['vue', 'Vue'], ['react', 'React'],
  ['java', 'Java'], ['chatgpt', 'ChatGPT'], ['cloudflare', 'Cloudflare'],
  ['webstorm', 'WebStorm'], ['idea', 'IntelliJ IDEA'], ['chrome', 'Chrome'],
];
const projects = { react: 'story', chatgpt: 'dinqor' };
const heroAngles = { vite:-24, vue:15, react:-11, java:22, chatgpt:13, cloudflare:16, webstorm:-15, idea:19, chrome:-17 };
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };

function Workbench() {
  const [locale, setLocale] = useState(window.siteLocale === 'en' ? 'en' : 'zh');
  useEffect(() => {
    const onLocale = () => setLocale(window.siteLocale === 'en' ? 'en' : 'zh');
    window.addEventListener('site:locale-change', onLocale);
    return () => window.removeEventListener('site:locale-change', onLocale);
  }, []);

  useEffect(() => {
    const section = document.querySelector('#ideas');
    const flight = document.querySelector('#object-flight');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!section || !flight) return;
    let frame = 0;
    const render = () => {
      frame = 0;
      const top = section.getBoundingClientRect().top;
      const p = clamp((innerHeight - top) / innerHeight);
      const active = !reduced && p > 0 && p < 1;
      flight.style.display = active ? 'block' : 'none';
      const arrival = reduced ? 1 : ease((p - .9) / .1);
      section.style.setProperty('--object-arrival', String(arrival));
      section.style.setProperty('--intro-arrival', String(reduced ? 1 : ease((p - .68) / .3)));
      document.querySelectorAll('#fallingObjects .drop-object').forEach(el => {
        el.style.visibility = active ? 'hidden' : '';
      });
      section.querySelectorAll('.bench-object.is-project').forEach(el => {
        el.style.pointerEvents = p >= .98 ? 'auto' : 'none';
      });
      if (!active) return;
      // Continue travelling as soon as the second scene enters the viewport.
      const t = p;
      objects.forEach(([key]) => {
        const source = document.querySelector(`#fallingObjects [data-name="${key}"]`);
        const target = section.querySelector(`[data-bench-name="${key}"]`);
        const clone = flight.querySelector(`[data-flight-name="${key}"]`);
        if (!source || !target || !clone) return;
        // Once the sticky hero ends, its DOM scrolls up. Reconstruct its final
        // viewport pose so scrolling back traces precisely the same flight.
        const a = source.getBoundingClientRect();
        const b = target.querySelector('img').getBoundingClientRect();
        const travel = innerHeight - top;
        const startSize = a.width / (Math.abs(Math.cos(heroAngles[key]*Math.PI/180))+Math.abs(Math.sin(heroAngles[key]*Math.PI/180)));
        const endSize = target.querySelector('img').offsetWidth;
        const size = startSize + (endSize - startSize) * t;
        const startX = a.left + a.width / 2;
        const startY = a.top + a.height / 2 + travel;
        const endX = b.left + b.width / 2;
        const endY = b.top + b.height / 2;
        const x = startX + (endX - startX) * t - size / 2;
        const y = startY + (endY - startY) * t - size / 2 + Math.sin(t * Math.PI) * 22;
        const endAngle = Number.parseFloat(getComputedStyle(target).getPropertyValue('--rot')) || 0;
        const angle = heroAngles[key] + (endAngle - heroAngles[key]) * t;
        clone.style.width = `${size}px`;
        clone.style.height = `${size}px`;
        clone.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle}deg)`;
        clone.style.opacity = String(1 - arrival);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('dx:bag-scroll', schedule);
    window.addEventListener('dx:bag-pose', schedule);
    render();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('dx:bag-scroll', schedule);
      window.removeEventListener('dx:bag-pose', schedule);
      document.querySelectorAll('#fallingObjects .drop-object').forEach(el => { el.style.visibility = ''; });
    };
  }, []);

  const en = locale === 'en';
  const open = id => window.dispatchEvent(new CustomEvent('dx:open-project', { detail: { id } }));
  return <>
    <div className="bench-intro">
      <span className="marker">01 — {en ? 'UNPACKED' : '拆封之后'}</span>
      <h2>{en ? <>The bag is empty.<br/><em>The ideas aren't.</em></> : <>袋子空了，<br/><em>想法才开始。</em></>}</h2>
      <p>{en ? 'Nine things fell out. Two have stories you can step into.' : '九件东西散落一地。其中两件，已经有了可以走进去的故事。'}</p>
      <span className="bench-instruction">{en ? 'KEEP SCROLLING ↓' : '继续往下看 ↓'}</span>
    </div>
    <div className="bench-surface" aria-label={en ? 'Objects from the paper bag' : '从纸袋掉落的物件'}>
      <div className="bench-surface-head"><span>DX / {en ? 'UNPACKED' : '散落现场'}</span><span>09 / 02</span></div>
      <div className="bench-grid">
        {objects.map(([key, label], i) => {
          const id = projects[key];
          const content = <><img src={objectImage(key)} alt="" draggable="false"/><span>{label}</span>{id && <b>{en ? 'OPEN STORY ↗' : '打开作品 ↗'}</b>}</>;
          return id
            ? <button className={`bench-object bench-object-${key} is-project`} data-bench-name={key} key={key} onClick={() => open(id)} aria-label={`${label}，${en ? 'open project' : '打开作品'}`}>{content}</button>
            : <div className={`bench-object bench-object-${key}`} data-bench-name={key} key={key} aria-label={label}>{content}</div>;
        })}
      </div>
      <div className="bench-surface-foot"><span>{en ? 'PICK UP A STORY ↗' : '有故事的物件，可以点开 ↗'}</span><span>✳</span></div>
    </div>
    <div className="bench-stories">
      <button onClick={() => open('dinqor')}><small>01 / AI</small><strong>DinQorAI</strong><span>{en ? 'A space for creating with AI' : '与 AI 一起创作的空间'}</span><b>↗</b></button>
      <button onClick={() => open('story')}><small>02 / STORY</small><strong>{en ? 'Interactive Stories' : '互动叙事'}</strong><span>{en ? 'Stories shaped by your choices' : '由你的选择改变走向的故事'}</span><b>↗</b></button>
    </div>
  </>;
}

const root = document.getElementById('workbench-root');
if (root) {
  createRoot(root).render(<Workbench />);
  const flight = document.createElement('div');
  flight.id = 'object-flight';
  flight.setAttribute('aria-hidden', 'true');
  objects.forEach(([key]) => {
    const image = document.createElement('img');
    image.src = objectImage(key);
    image.dataset.flightName = key;
    image.alt = '';
    flight.append(image);
  });
  document.body.append(flight);
}
