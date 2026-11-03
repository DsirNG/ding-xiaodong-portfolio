/**
 * Three.js deformable paper bag: a low-resolution mass-spring surface.
 * The photographic paper texture is mapped to two SEPARATE meshes.
 * Breakable lower seam: the lower panel detaches and falls; scrolling back
 * restores the spring targets and rejoins the edge deterministically.
 *
 * This is an efficient interactive soft-body approximation, NOT full FEM,
 * volumetric self-collision, or a destructible rigid-body solver.
 */
import * as THREE from 'three';

const host = document.getElementById('bagRender');
const hero = document.getElementById('hero');
if (host && hero) {
  const mobile = matchMedia('(max-width:680px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clamp = (x, a=0, b=1) => Math.min(b, Math.max(a, x));
  const ease = x => {x=clamp(x);return x*x*(3-2*x)};
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth01 = (p,a,b) => ease((p-a)/(b-a));
  const cameraViewHeight=mobile?5.25:5.5;
  const bagRestOffset=-.45;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:!mobile,powerPreference:'low-power',stencil:false,depth:true});
  } catch (err) {
    console.warn('[D/X] WebGL unavailable; the static paper bag remains visible.',err);
  }
  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4,4,3,-3,.1,100);
    camera.position.set(0,.02,12);camera.lookAt(0,0,0);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.1:1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000,0);
    host.prepend(renderer.domElement);
    host.classList.add('webgl-ready');
    const model = new THREE.Group();scene.add(model);
    const light = new THREE.DirectionalLight(0xffefd9,2.3);light.position.set(-2.5,3,6);scene.add(light);
    const rimLight = new THREE.DirectionalLight(0xa9c5ff,.8);rimLight.position.set(3,1,2);scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0xffffff,.85));

    const texture = new THREE.TextureLoader().load(new URL('./assets/bag.png', import.meta.url).href,()=>schedule());
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=true;
    const faceMaterial = new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.018,roughness:.92,metalness:0,color:0xd6c4ad,transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.035});
    const darkMaterial = new THREE.MeshBasicMaterial({map:texture,color:0x816650,side:THREE.DoubleSide,transparent:true,opacity:.28,alphaTest:.035,depthWrite:false});
    const topY=1.48,baseY=-1.46,seamBase=-.81,W=2.89;
    const seamFn=u=>seamBase + Math.sin(u*12.6)*.033 + Math.cos(u*25.1)*.015;

    /** A lattice of point masses held together by shear/stretch constraints. */
    function makeCloth(name, rows, cols, upper, front=true) {
      const count=(cols+1)*(rows+1), ref=new Float32Array(count*3), positions=new Float32Array(count*3);
      const velocities=new Float32Array(count*3),uvs=new Float32Array(count*2), indices=[],links=[];
      const z=front?.08:-.17;
      for(let r=0;r<=rows;r++) for(let c=0;c<=cols;c++) {
        const i=r*(cols+1)+c,u=c/cols,v=r/rows;
        const x=(u-.5)*W;
        const seam=seamFn(u);
        const y=upper?mix(seam,topY,v):mix(baseY,seam,v);
        const wrinkle=Math.sin(u*38+v*17)*.009+Math.sin(v*39-u*13)*.011;
        const q=i*3, t=i*2;
        ref[q]=positions[q]=x;ref[q+1]=positions[q+1]=y;
        ref[q+2]=positions[q+2]=z+wrinkle+Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*.16;
        uvs[t]=u;uvs[t+1]=clamp((y-baseY)/(topY-baseY));
        if(c<cols && r<rows) {
          const a=i,b=i+1,d=i+cols+1,e=d+1;
          indices.push(a,b,d,b,e,d);
        }
      }
      // Preserve both length and shear (mass-spring sheet, not a flat CSS transform).
      for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
        const a=r*(cols+1)+c;
        if(c<cols)links.push([a,a+1]);
        if(r<rows)links.push([a,a+cols+1]);
        if(c<cols&&r<rows){links.push([a,a+cols+2]);links.push([a+1,a+cols+1]);}
      }
      const rest = new Float32Array(links.length);
      links.forEach(([a,b],k)=>{
        const i=a*3,j=b*3;
        rest[k]=Math.hypot(ref[i]-ref[j],ref[i+1]-ref[j+1],ref[i+2]-ref[j+2]);
      });
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geo.setIndex(indices);
      geo.computeVertexNormals();
      // Geometry has TWO physical pieces sharing a seam only until rupture.
      const mat=front?(upper?faceMaterial:faceMaterial.clone()):darkMaterial;
      const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;
      mesh.name=name;
      model.add(mesh);
      const panel={mesh,geo,positions,ref,velocities,links,rest,rows,cols,upper,front};
      return panel;
    }
    const upper=makeCloth('upper-front',19,26,true,true);
    const lower=makeCloth('detachable-bottom',8,26,false,true);
    // Real z-depth inside the bag: back surface + side gussets (low polygon).
    const back=makeCloth('rear-paper',13,18,true,false);
    back.mesh.position.z=-.19;back.mesh.material=darkMaterial;
    let progress=0, targetProgress=0, pointerX=0, pointerY=0, pointerInside=false;
    let liftPosition=0,liftVelocity=0,openingWind=0;
    let entranceAt=reduced||window.__dxHeroRevealed||document.body.classList.contains('opening-ready')?performance.now()+180:null;
    window.addEventListener('dx:hero-reveal',()=>{if(entranceAt===null)entranceAt=performance.now()+180;schedule();},{once:true});
    let lastMs=0, active=true, running=false, isVisible=true;
    let tickCount=0, lastActivity=0;
    const FPS = mobile?30:45;
    const msInterval=1000/FPS;
    const heroObserver=new IntersectionObserver(entries=>{
      isVisible=entries[0]?.isIntersecting??false;
      if(isVisible)schedule();
    },{rootMargin:'100px'});
    heroObserver.observe(hero);
    let hostStageLeft=0,hostStageTop=0;
    function resize(){
      const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      const hostRect=host.getBoundingClientRect(),stageRect=host.parentElement.getBoundingClientRect();
      hostStageLeft=hostRect.left-stageRect.left;
      hostStageTop=hostRect.top-stageRect.top;
      renderer.setSize(w,h,false);
      const aspect=w/h;
      // Original reference uses one clear hero object occupying ~55% viewport height.
      camera.top=cameraViewHeight/2;camera.bottom=-cameraViewHeight/2;
      camera.left=-cameraViewHeight*aspect/2;camera.right=cameraViewHeight*aspect/2;
      camera.updateProjectionMatrix();
      const scale = mobile? Math.min(1.05,(w/h)*1.55):1.12;
      model.scale.setScalar(scale);
      schedule();
    }
    const ro=new ResizeObserver(resize);ro.observe(host);
    hero.addEventListener('pointermove',ev=>{
      const r=host.getBoundingClientRect();
      pointerX=(ev.clientX-r.left)/r.width-.5;
      pointerY=(ev.clientY-r.top)/r.height-.5;
      const localX=pointerX*cameraViewHeight*(r.width/r.height)/model.scale.x;
      const localY=-pointerY*cameraViewHeight/model.scale.y-model.position.y/model.scale.y;
      pointerInside=Math.abs(localX)<W*.60&&localY>baseY-.2&&localY<topY+.2;schedule();
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{pointerInside=false;schedule()});
    window.addEventListener('dx:bag-scroll',ev=>{
      targetProgress=ev.detail.progress;
      if(reduced)progress=targetProgress;
      schedule();
    });
    window.addEventListener('dx:opening-motion',ev=>{
      openingWind=clamp(ev.detail?.velocity||0);
      schedule();
    });
    const initialSection=hero.getBoundingClientRect();
    targetProgress=clamp(-initialSection.top/Math.max(1,hero.offsetHeight-innerHeight));
    progress=targetProgress;
    liftPosition=window.__dxHeroStateAt(progress).lift*2.05+window.__dxHeroStateAt(progress).escape*1.45;
    function requestFrame(){if(!running&&isVisible){running=true;requestAnimationFrame(frame)}}
    function schedule(){lastActivity=performance.now();requestFrame()}
    function simulate(panel,weight,tear,dt,wind=0){
      const {positions,ref,velocities,rows,cols,upper:isTop,front,links,rest}=panel;
      const strength=1-Math.min(1,tear)*.12;
      const count=positions.length/3;
      // Soft paper is a spring lattice: pressure deforms the lower side and
      // neighboring vertices resist stretches while damping kills jitter.
      for(let i=0;i<count;i++){
        const q=i*3,u=(i%(cols+1))/cols,v=Math.floor(i/(cols+1))/rows;
        const x=ref[q],y=ref[q+1],z=ref[q+2];
        const lowerBias=isTop?(1-v):1;
        const bell=(1-Math.pow(u*2-1,2));
        const pressure=weight*lowerBias*lowerBias;
        const dx=Math.sign(x)*pressure*.14*bell + Math.sin(v*21+u*39)*pressure*.008;
        const dy=-pressure*.07*bell;
        const dz=pressure*(.31*bell+.06*Math.sin(u*18+v*17));
        const pinch= (isTop?1-v:v)*tear*.03;
        const tx=x+dx+(u-.5)*pinch;
        const ty=y+dy;
        const mouseLocalX=pointerX*cameraViewHeight*(host.clientWidth/host.clientHeight)/model.scale.x;
        const mouseLocalY=-pointerY*cameraViewHeight/model.scale.y-model.position.y;
        const dent=pointerInside&&!reduced?Math.exp(-((x-mouseLocalX)**2+(y-mouseLocalY)**2)/.28)*.38*(isTop?v<.94:1):0;
        const tz=z+dz-dent;
        // The curtain's passing speed briefly lifts the free paper just below
        // the anchored mouth. The spring lattice carries that impulse into a
        // small delayed body rebound after the visual force has passed.
        if(isTop&&wind>0){
          const rim=smooth01(v,.40,.76)*(1-smooth01(v,.91,.99))*Math.sin(Math.PI*u);
          velocities[q+1]+=wind*1.05*rim*dt;
          velocities[q+2]+=wind*.55*rim*dt;
        }
        const spring=isTop && v>.94?68:47;
        for(let axis=0;axis<3;axis++){
          const target=axis===0?tx:axis===1?ty:tz;
          let vel=velocities[q+axis];
          vel=(vel+(target-positions[q+axis])*spring*dt)*Math.exp(-8.6*dt);
          velocities[q+axis]=vel;
          positions[q+axis]+=vel*dt;
        }
      }
      // Two cheap positional-constraint passes; all vertices remain in GPU buffers.
      for(let it=0;it<2;it++)for(let k=0;k<links.length;k++){
        const [a,b]=links[k],i=a*3,j=b*3;
        const dx=positions[j]-positions[i],dy=positions[j+1]-positions[i+1],dz=positions[j+2]-positions[i+2];
        const dist=Math.hypot(dx,dy,dz)||1;
        const desired=rest[k]*(1+Math.min(.09,weight*.07));
        // Only constrain near overstretch to retain wrinkles and pressure bulges.
        const delta=(dist-desired)*.095*strength/dist;
        const ix=dx*delta,iy=dy*delta,iz=dz*delta;
        const fixedA=isTop&&Math.floor(a/(cols+1))===rows;
        const fixedB=isTop&&Math.floor(b/(cols+1))===rows;
        if(!fixedA){positions[i]+=ix;positions[i+1]+=iy;positions[i+2]+=iz}
        if(!fixedB){positions[j]-=ix;positions[j+1]-=iy;positions[j+2]-=iz}
      }
      panel.geo.attributes.position.needsUpdate=true;
      if(tickCount%3===0)panel.geo.computeVertexNormals();
    }
    function frame(ms){
      running=false;
      if(!isVisible)return;
      if(lastMs && ms-lastMs < msInterval){running=true;requestAnimationFrame(frame);return}
      const dt=clamp((ms-(lastMs||ms))/1000,.001,.033);
      lastMs=ms;tickCount++;
      // Strong damping: no infinite physics loop when the hero is motionless.
      progress+=(targetProgress-progress)*(reduced?1:Math.min(1,dt*13));
      const p=progress;
      const score=window.__dxHeroStateAt(p);
      const weight=score.weight,rip=score.tear,detach=score.detach;
      const lift=score.lift*2.05+score.escape*1.45;
      if(reduced){liftPosition=lift;liftVelocity=0}
      else{
        const acceleration=(lift-liftPosition)*64-liftVelocity*7;
        liftVelocity+=acceleration*dt;
        liftPosition+=liftVelocity*dt;
      }
      const entrance=reduced||p>.025?1:entranceAt===null?0:clamp((ms-entranceAt)/1300);
      const entranceEase=entrance===1?1:1-Math.exp(-6*entrance)*Math.cos(entrance*8);
      model.visible=entrance>0;
      model.position.y=liftPosition+bagRestOffset-(1-entranceEase)*5.2;
      const hover=pointerInside&&!reduced;
      model.rotation.z+=(weight*Math.sin(p*30)*.035+liftVelocity*.008-(1-entranceEase)*.16+(hover?pointerX*.5:0)-model.rotation.z)*Math.min(1,dt*6);
      model.rotation.y+=((hover?clamp(pointerX*2.4,-.38,.38):0)-model.rotation.y)*Math.min(1,dt*6);
      model.rotation.x+=((hover?clamp(-pointerY*.7,-.18,.18):0)-model.rotation.x)*Math.min(1,dt*6);
      light.position.x+=((hover?pointerX*7:-2.5)-light.position.x)*Math.min(1,dt*6);
      simulate(upper,weight,rip,dt,openingWind);
      simulate(lower,weight,rip,dt);
      simulate(back,weight*.7,rip,dt);
      // Keep the two cloth panels sewn together until the tear actually starts.
      const seamLock=1-rip;
      for(let c=0;c<=upper.cols;c++){
        const ui=c*3,li=(lower.rows*(lower.cols+1)+c)*3;
        for(let axis=0;axis<3;axis++){
          const u=ui+axis,l=li+axis;
          const shared=(upper.positions[u]+lower.positions[l])*.5;
          const sharedVelocity=(upper.velocities[u]+lower.velocities[l])*.5;
          upper.positions[u]=mix(upper.positions[u],shared,seamLock);
          lower.positions[l]=mix(lower.positions[l],shared,seamLock);
          upper.velocities[u]=mix(upper.velocities[u],sharedVelocity,seamLock);
          lower.velocities[l]=mix(lower.velocities[l],sharedVelocity,seamLock);
        }
      }
      upper.geo.attributes.position.needsUpdate=true;
      lower.geo.attributes.position.needsUpdate=true;
      // The torn flap and contents lose support at the same instant. The
      // lighter paper clears the contents instead of becoming a display shelf.
      lower.mesh.position.set(detach*.22, -rip*.07-detach*4.6,detach*.46);
      lower.mesh.rotation.set(detach*.55,detach*.30,detach*.32);
      // Detached bottom is a real separate mesh; screen animation reversible.
      lower.mesh.visible=detach<.99;
      lower.mesh.material.opacity=1-smooth01(p,.76,.94);
      upper.mesh.visible=true;
      const gap=score.tear;
      // The offset photographic rear sheet exposed a rectangular duplicate
      // during hover rotation. The double-sided front already covers this view.
      back.mesh.visible=false;
      const seamIndex=Math.floor(upper.cols/2)*3;
      model.updateMatrixWorld(true);
      const seamWorld=new THREE.Vector3(upper.positions[seamIndex],upper.positions[seamIndex+1],upper.positions[seamIndex+2]).applyMatrix4(upper.mesh.matrixWorld);
      const seamEdge=[];
      for(let c=0;c<=upper.cols;c++){
        const q=c*3;
        const vertex=new THREE.Vector3(upper.positions[q],upper.positions[q+1],upper.positions[q+2]).applyMatrix4(upper.mesh.matrixWorld);
        seamEdge.push([hostStageLeft+host.clientWidth/2+vertex.x*host.clientHeight/cameraViewHeight,hostStageTop+host.clientHeight/2-vertex.y*host.clientHeight/cameraViewHeight]);
      }
      window.__dxBagPose={
        seamEdge,
        progress:p,
        centerX:hostStageLeft+host.clientWidth/2+seamWorld.x*host.clientHeight/cameraViewHeight,
        seamY:hostStageTop+host.clientHeight/2-seamWorld.y*host.clientHeight/cameraViewHeight,
        width:W*host.clientHeight/cameraViewHeight*model.scale.x
      };
      renderer.render(scene,camera);
      window.dispatchEvent(new CustomEvent('dx:bag-pose'));
      // Stop after the cloth settles. A scroll or pointer change wakes it.
      if((entranceAt!==null&&entrance<1)||Math.abs(targetProgress-progress)>.0001 || Math.abs(liftVelocity)>.008 || ms-lastActivity<900)requestFrame();
    }
    // In a WebGL context loss, reveal static bag rather than leaving a blank screen.
    renderer.domElement.addEventListener('webglcontextlost',ev=>{
      ev.preventDefault();isVisible=false;host.classList.remove('webgl-ready');
    });
    resize();schedule();
  }
}
