(() => {
  'use strict';
  const doc = document;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menu: same persistent pill + big full-screen typographic navigation model.
  const menuButton = doc.querySelector('.menu-trigger');
  const menu = doc.getElementById('siteMenu');
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    doc.body.classList.toggle('menu-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-hidden', String(!open));
    doc.body.style.overflow = open ? 'hidden' : '';
  }
  menuButton?.addEventListener('click', () => setMenu(!menuOpen));
  menu?.querySelectorAll('a').forEach(el => el.addEventListener('click', () => setMenu(false)));

  doc.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => doc.querySelector(btn.dataset.scroll)?.scrollIntoView({behavior:reducedMotion?'instant':'smooth'}));
  });

  const projects = [
    {id:'dinqor', num:'01', title:{zh:'DinQorAI',en:'DinQorAI'}, tagline:{zh:'让灵感落地，让创作更自由。',en:'Where ideas take shape and creativity feels effortless.'}, description:{zh:'一个围绕多模态 AI 创作、工具与灵感建立的数字产品。它关注的是让普通人也能自由、自然地创作。',en:'A multimodal AI workspace for creators. It makes powerful creative tools feel clear, natural, and open to everyone.'}, tags:{zh:['产品','人工智能','全栈','交互'],en:['Product','AI','Full-Stack','Interaction']}},
    {id:'story', num:'02', title:{zh:'互动叙事',en:'Interactive Stories'}, tagline:{zh:'不只观看故事，也亲手写下转折。',en:'Don’t just watch the story. Change where it goes.'}, description:{zh:'一个使用节点流程和分叉影像设计的交互叙事编辑器。用户在剧情节点作出选择，连接到属于自己的下游故事。',en:'An interactive storytelling editor for branching video. Make a choice at each story beat and follow the path that becomes your own.'}, tags:{zh:['React Flow','叙事','视频','交互'],en:['React Flow','Storytelling','Video','Interaction']}},
    {id:'bio', num:'06', title:{zh:'关于我',en:'A Curious Human'}, tagline:{zh:'以开发为业，以创造为本能。',en:'Frontend developer by trade. A maker by instinct.'}, description:{zh:'我是丁晓东。对交互、产品、工程架构、AI 工具和视觉叙事充满好奇。喜欢把复杂的技术问题拆成可以被人理解、感受和使用的体验。',en:'I’m Ding Xiaodong, a frontend developer and creative technologist curious about interaction, product design, systems, AI tools, and visual storytelling. I turn complex technical ideas into experiences people can understand and use.'}, tags:{zh:['关于','设计','开发','好奇心'],en:['About','Design','Development','Curiosity']}},
  ];
  const overlay = doc.getElementById('projectOverlay');
  const closePanelBtn = doc.querySelector('.close-panel');
  let projectIndex = 0;
  function renderProjectContent(p) {
    const locale = window.siteLocale === 'en' ? 'en' : 'zh';
    doc.getElementById('modalTitle').textContent = p.title[locale];
    doc.getElementById('modalEn').textContent = p.tagline[locale];
    doc.getElementById('modalDesc').textContent = p.description[locale];
    doc.getElementById('modalTags').replaceChildren(...p.tags[locale].map(tag => {const el=doc.createElement('span');el.textContent=tag;return el;}));
  }
  function openProject(id) {
    const i = projects.findIndex(p => p.id === id);
    if (i < 0) return;
    projectIndex = i;
    const p = projects[i];
    doc.getElementById('modalId').textContent = p.num;
    renderProjectContent(p);
    overlay?.classList.add('open');
    overlay?.setAttribute('aria-hidden','false');
    doc.body.style.overflow = 'hidden';
    closePanelBtn?.focus();
  }
  window.addEventListener('dx:open-project', event => openProject(event.detail?.id));
  window.addEventListener('site:locale-change', () => {
    if (overlay?.classList.contains('open')) renderProjectContent(projects[projectIndex]);
  });
  function closeProject(){overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true');doc.body.style.overflow = menuOpen ? 'hidden' : '';}
  doc.querySelectorAll('[data-project]').forEach(el => {
    el.addEventListener('click', () => openProject(el.dataset.project));
    if (el.getAttribute('role')==='button') el.addEventListener('keydown', ev => {if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openProject(el.dataset.project)}});
  });
  closePanelBtn?.addEventListener('click',closeProject);
  overlay?.addEventListener('click',e=>{if(e.target===overlay)closeProject()});
  doc.getElementById('modalNext')?.addEventListener('click',()=>openProject(projects[(projectIndex+1)%2].id));
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'){if(overlay?.classList.contains('open'))closeProject();else if(menuOpen)setMenu(false)}});

  // Reveal elements as they enter the viewport.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});
    doc.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  } else doc.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  if (!reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // Hero object: layered cursor perspective, not a generic cursor trail.
    const hero = doc.getElementById('heroCollage');
    const heroHead = hero?.querySelector('.hero-head');
    let heroX = 0, heroY = 0, hx=0, hy=0;
    const floaters = Array.from(hero?.querySelectorAll('[data-float]')||[]);
    doc.querySelector('.hero')?.addEventListener('pointermove',ev=>{
      heroX = (ev.clientX/window.innerWidth-.5)*2;
      heroY = (ev.clientY/window.innerHeight-.5)*2;
    });
    doc.querySelector('.hero')?.addEventListener('pointerleave',()=>{heroX=0;heroY=0;});
    function heroFrame(){
      hx += (heroX-hx)*.055; hy += (heroY-hy)*.055;
      if (heroHead) heroHead.style.transform=`translate3d(${hx*10}px,${hy*8}px,0) rotate(${hx*1.1}deg)`;
      floaters.forEach((node,i)=>{
        const depth=Number(node.dataset.float),initial=['rotate(-14deg)','rotate(16deg)','rotate(12deg)'][i]||'';
        node.style.transform=`translate(${hx*depth*22}px,${hy*depth*15}px) ${initial}`;
      });
      requestAnimationFrame(heroFrame);
    }
    if (heroHead || floaters.length) requestAnimationFrame(heroFrame);

    // Collision-like hover: independent sprites shift out of pointer's way,
    // velocity is damped and objects spring back to their original positions.
    function createRepulsion(zoneSelector,itemSelector,options={}) {
      const zone=doc.querySelector(zoneSelector);if(!zone)return;
      const tiles=Array.from(zone.querySelectorAll(itemSelector));
      const states=tiles.map(el=>({el,x:0,y:0,vx:0,vy:0}));
      const pointer={x:0,y:0,active:false};
      const radius=options.radius||180;
      const spring=options.spring||.027;
      const drag=options.drag||.82;
      zone.addEventListener('pointermove',ev=>{const rect=zone.getBoundingClientRect();pointer.x=ev.clientX-rect.left;pointer.y=ev.clientY-rect.top;pointer.active=true;
        if(options.reticle){const r=zone.querySelector('.float-reticle');if(r){r.style.left=`${pointer.x}px`;r.style.top=`${pointer.y}px`;}}});
      zone.addEventListener('pointerleave',()=>pointer.active=false);
      let lastTime=performance.now(), running=false;
      function wake(){if(!running){running=true;requestAnimationFrame(tick)}}
      zone.addEventListener('pointerenter',wake);
      zone.addEventListener('pointermove',wake,{passive:true});
      zone.addEventListener('pointerleave',wake);
      if('IntersectionObserver' in window){
        const watch=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)wake()},{threshold:0});
        watch.observe(zone);
      }
      function tick(time){
        running=false;
        let moving=false;
        const dt=Math.min(2,(time-lastTime)/16.66||1);lastTime=time;
        const rect=zone.getBoundingClientRect();
        // Stop expensive computations while far outside the viewport.
        const visible=rect.bottom>-100&&rect.top<innerHeight+100;
        if(visible){states.forEach((s,i)=>{
          const box=s.el;
          if(pointer.active){
            const elRect=box.getBoundingClientRect();
            const midX=elRect.left-rect.left+elRect.width/2;
            const midY=elRect.top-rect.top+elRect.height/2;
            let dx=midX-pointer.x,dy=midY-pointer.y;
            const dist=Math.max(20,Math.hypot(dx,dy));
            const proximity=Math.max(0,1-dist/(radius+(elRect.width||100)*.25));
            if(proximity>0){const force=proximity*proximity*(options.force||8);s.vx+=(dx/dist)*force*dt;s.vy+=(dy/dist)*force*dt;}
          }
          s.vx=(-s.x*spring*dt+s.vx)*Math.pow(drag,dt);
          s.vy=(-s.y*spring*dt+s.vy)*Math.pow(drag,dt);
          s.x=Math.max(-95,Math.min(95,s.x+s.vx*dt));
          s.y=Math.max(-95,Math.min(95,s.y+s.vy*dt));
          if(Math.abs(s.x)+Math.abs(s.y)+Math.abs(s.vx)+Math.abs(s.vy)>.12)moving=true;
          if(itemSelector==='.media-tile'){
            box.style.setProperty('--x',`${s.x.toFixed(2)}px`);
            box.style.setProperty('--y',`${s.y.toFixed(2)}px`);
          } else {
            box.style.setProperty('--px',`${s.x.toFixed(2)}px`);
            box.style.setProperty('--py',`${s.y.toFixed(2)}px`);
          }
        });}
        if (visible && (pointer.active || moving))wake();
      }
      wake();
    }
    createRepulsion('#floatZone','.media-tile',{radius:225,force:12,spring:.025,drag:.79,reticle:true});
    createRepulsion('#labScene','.lab-object',{radius:195,force:13,spring:.024,drag:.81});
  }
})();
