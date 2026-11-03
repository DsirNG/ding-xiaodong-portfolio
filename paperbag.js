/** Hero director: composited 3D icon sprites + scroll state. */
(() => {
  'use strict';
  const $ = s=>document.querySelector(s);
  const section=$('#hero'),stage=$('#bagScene'),bag=$('#bagRender');
  if(!section||!stage||!bag)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const objects=[...stage.querySelectorAll('.drop-object')];
  const objectLayer=objects[0]?.parentElement;
  const debris=$('#paperDebris');
  const ground=$('#bagGround'),hint=$('#bagHintText'),label=$('#bagStageLabel');
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const mix=(a,b,t)=>a+(b-a)*t;
  // One reversible scroll score shared by typography, cloth and contents.
  window.__dxHeroStateAt=p=>({
    progress:p,lift:smooth((p-.04)/.46),escape:smooth((p-.62)/.38),
    weight:smooth((p-.12)/.28)*(1-smooth((p-.49)/.15)),
    tear:smooth((p-.48)/.10),detach:clamp((p-.55)/.39)**2,
    fall:clamp((p-.55)/.45)
  });
  const targets={
    vite:[-.25,.53,-24],vue:[-.13,.46,15],react:[.00,.56,-11],java:[.13,.46,22],
    chatgpt:[.25,.53,13],cloudflare:[-.29,.42,16],webstorm:[-.17,.49,-15],
    idea:[.17,.44,19],chrome:[.29,.50,-17]
  };
  const insideSlots=[[-.20,-.10],[-.08,-.07],[.08,-.13],[.20,-.08],[.14,-.16],[-.19,-.06],[-.06,-.11],[.06,-.14],[.19,-.09]];
  const pieces=Array.from({length:12},(_,i)=>{
    const el=document.createElement('i');el.className='paper-piece';
    const a=i*2.39996;
    el.dataset.x=(Math.cos(a)*(.13+(i%4)*.075)).toFixed(4);
    el.dataset.y=(.42+Math.sin(a)*.15+(i%3)*.04).toFixed(4);
    el.dataset.rot=String((i*73)%260-130);debris.append(el);return el;
  });
  const states=objects.map(el=>({el,x:0,y:0,vx:0,vy:0,baseX:0,baseY:0,size:120}));
  let p=0,width=stage.clientWidth,height=stage.clientHeight,raf=0,physicsId=0;
  let releasePose=null;
  let pointer={x:-999,y:-999,inside:false},lastPhysics=performance.now();
  function measure(){width=stage.clientWidth;height=stage.clientHeight;states.forEach(s=>s.size=s.el.offsetWidth||100)}
  function progress(){const rect=section.getBoundingClientRect();return clamp(-rect.top/Math.max(1,section.offsetHeight-innerHeight))}
  function render(send=true){
    if(send!==false)raf=0;
    const requested=reduced?1:progress();
    if(send!==false){
      dispatchEvent(new CustomEvent('dx:bag-scroll',{detail:window.__dxHeroStateAt(requested)}));
      if(bag.classList.contains('webgl-ready')&&window.__dxBagPose)return;
    }
    p=reduced?1:(window.__dxBagPose?.progress??requested);
    const score=window.__dxHeroStateAt(p);
    const {lift,escape,weight,tear}=score;
    // Keep contents occluded by the intact bag; once the tear opens, bring
    // them in front of the detached flap so the paper cannot slice through them.
    if(objectLayer){
      // Both paper panels occlude the packed contents while the opening grows.
      objectLayer.style.zIndex=p<.72?'7':'9';
      const edge=window.__dxBagPose?.seamEdge;
      if(edge&&tear>0){
        const points=[[0,edge[0][1]],...edge,[width,edge.at(-1)[1]],[width,height*3],[0,height*3]];
        objectLayer.style.clipPath=`polygon(${points.map(([x,y])=>`${x}px ${y+1}px`).join(',')})`;
      }else objectLayer.style.clipPath=tear>0?'':'inset(100% 0 0 0)';
    }
    if(p<=.55||!releasePose)releasePose=window.__dxBagPose?{...window.__dxBagPose}:null;
    document.body.classList.toggle('bag-hero-active',section.getBoundingClientRect().bottom>innerHeight*.05);
    bag.style.setProperty('--fallback-lift',`${height*(lift*.33+escape*.51)}px`);
    bag.style.setProperty('--fallback-weight',weight.toFixed(3));
    bag.style.setProperty('--fallback-opacity',(1-tear).toFixed(3));
    ground.style.setProperty('--ground-alpha',String(.78-.72*lift));
    ground.style.setProperty('--ground-scale',String(1+lift*.45));
    stage.parentElement.style.setProperty('--hint-alpha',(1-smooth((p-.13)/.19)).toFixed(3));
    const english=window.siteLocale==='en';
    let phase=english?'CURIOUS THINGS AHEAD.<br>SCROLL SLOWLY ↓':'奇妙的灵感即将登场。<br>慢慢向下滚动 ↓';
    let message=english?'A BAG FULL OF IDEAS.<br>SCROLL TO UNPACK IT.':'满袋灵感。<br>向下滚动打开它。';
    if(p>.14){message=english?'SOMETHING IS MOVING...':'有什么正在移动……';phase=english?'THE WEIGHT OF IDEAS.<br>KEEP SCROLLING ↓':'灵感正在聚集。<br>继续向下滚动 ↓'}
    if(p>.38){message=english?'THIS BAG IS GETTING HEAVY...':'袋子快要装不下了……';phase=english?'TOO MANY IDEAS.<br>THE BOTTOM IS GIVING WAY.':'装得太重了。<br>袋底快要裂开。'}
    if(p>.48){message=english?'THE IDEAS ARE SPILLING OUT.':'灵感要掉出来了。';phase=english?'THE BAG HAS TORN.<br>EVERYTHING IS FALLING ↓':'袋底裂开了。<br>物件正在掉落 ↓'}
    if(p>.86){message=english?'EVERYTHING, EVERYWHERE.':'灵感，全部拆封。';phase=english?'FOLLOW THE OBJECTS BELOW ↓':'跟着物件进入下一屏 ↓'}
    if(label.innerHTML!==phase)label.innerHTML=phase;
    if(hint.innerHTML!==message)hint.innerHTML=message;
    const iconWidth=width;
    states.forEach((s,i)=>{
      const [tx,ty,angle]=targets[s.el.dataset.name];
      const [insideX,insideOffsetY]=insideSlots[i];
      const t=score.fall;
      const scale=.68+.35*smooth((t-.20)/.80);
      const pose=window.__dxBagPose;
      const bagWidth=pose?.width||width*.34;
      const bagCenterX=pose?.centerX??width*.5;
      const seamY=pose?.seamY??height*(.73-lift*.42-escape*.59);
      const origin=releasePose||pose;
      const insideOffsetX=(origin?.centerX??bagCenterX)-width*.5+insideX*bagWidth*.78;
      const insideScreenY=(origin?.seamY??seamY)+insideOffsetY*bagWidth-s.size*.40+weight*bagWidth*.05;
      const fall=t*t;
      const by=ty*height;
      const y=mix(insideScreenY,by,fall);
      // Keep the packed contents inside the bag's footprint until they have
      // cleared the falling bottom flap; only then let them fan out.
      const horizontalRelease=smooth((t-.30)/.70);
      const x=mix(insideOffsetX,tx*width,horizontalRelease);
      const bounce=0;
      const rot=mix(-70+i*15,angle,smooth(t));
      s.baseX=x;s.baseY=y-bounce;
      const alpha=p>=.48?1:0;
      s.el.style.opacity=alpha.toFixed(3);
      s.el.style.pointerEvents=t>.55&&Boolean(s.el.dataset.id)?'auto':'none';
      s.el.style.zIndex=y<seamY?'6':String(15+(i%3));
      s.el.style.transform=`translate3d(calc(-50% + ${x+s.x}px),${s.baseY+s.y}px,0) rotate(${rot}deg) scale(${scale})`;
    });
    pieces.forEach((el,i)=>{
      const t=clamp((p-(.55+i*.004))/.34);
      const x=width*1.15*Number(el.dataset.x)*t;
      const y=(height*.15+height*Number(el.dataset.y))*t*t;
      el.style.opacity=(Math.sin(Math.PI*t)*(.5+(i%3)*.18)).toFixed(3);
      el.style.transform=`translate3d(${x}px,${(releasePose?.seamY??height*.34)+y}px,0) rotate(${Number(el.dataset.rot)*t}deg) scale(${1-t*.45})`;
    });
    window.__dxBagProgress=p;
    const upper=section.querySelector('.hero-upper');
    const bottom=section.querySelector('.hero-bottom');
    if(upper)upper.style.opacity=String(1-smooth((p-.04)/.24));
    if(bottom){bottom.style.opacity=String(1-smooth((p-.35)/.28));bottom.style.translate=`0 ${-height*.045*smooth(p/.5)}px`;bottom.style.pointerEvents=p>.62?'none':'';}
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(render)}
  const onPointer=ev=>{
    const box=stage.getBoundingClientRect();
    pointer={x:ev.clientX-box.left,y:ev.clientY-box.top,inside:true};
    if(!physicsId)physicsId=requestAnimationFrame(physics);
  };
  stage.addEventListener('pointermove',onPointer,{passive:true});
  stage.addEventListener('pointerleave',()=>{pointer.inside=false;if(!physicsId)physicsId=requestAnimationFrame(physics)});
  function physics(ms){
    physicsId=0;
    const dt=Math.min(2,(ms-lastPhysics)/16.66||1);lastPhysics=ms;
    if(p<.99)return;
    let energy=0;
    for(const s of states){
      if(pointer.inside){
        const dx=(width*.5+s.baseX)-(pointer.x),dy=(s.baseY+s.size*.5)-(pointer.y);
        const d=Math.max(20,Math.hypot(dx,dy)),r=135;
        const force=clamp(1-d/r);
        if(force>0){s.vx+=dx/d*force*9*dt;s.vy+=dy/d*force*9*dt}
      }
      s.vx=(s.vx-s.x*.029*dt)*Math.pow(.78,dt);
      s.vy=(s.vy-s.y*.029*dt)*Math.pow(.78,dt);
      s.x=clamp(s.x+s.vx*dt,-64,64);
      s.y=clamp(s.y+s.vy*dt,-64,64);
      energy+=Math.abs(s.x)+Math.abs(s.y)+Math.abs(s.vx)+Math.abs(s.vy);
    }
    if(energy>.18){schedule();physicsId=requestAnimationFrame(physics)}
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('dx:bag-pose',()=>render(false));
  addEventListener('site:locale-change',schedule);
  addEventListener('resize',()=>{measure();schedule()},{passive:true});
  objects.filter(el=>el.dataset.id).forEach(el=>el.addEventListener('click',()=>{
    dispatchEvent(new CustomEvent('dx:open-project',{detail:{id:el.dataset.id}}));
  }));
  measure();render();
})();
