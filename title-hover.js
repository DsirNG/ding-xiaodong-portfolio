import * as THREE from 'three';
import { HangingRigidBody, calculatePlanarMass, rotate2 } from './hanging-physics.js';
import { TOTAL_SAMPLES } from './threaded-rope.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from './assets/title-font.json';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Original typography, 3D materials and intro choreography are preserved.
// Single-strand cords connect the shared DX anchor to metal eyelets above each word.
// Unilateral tension drives 2-D rigid-body rotation.
class DynamicTube {
  constructor(material, radius = 2.8, segments = 84, rings = 7) {
    this.radius=radius;this.segments=segments;this.rings=rings;
    this.positions=new Float32Array((segments+1)*(rings+1)*3);
    const uvs=new Float32Array((segments+1)*(rings+1)*2),indices=[];
    for(let i=0;i<=segments;i++)for(let j=0;j<=rings;j++){
      const k=i*(rings+1)+j;uvs[k*2]=j/rings;uvs[k*2+1]=i/segments;
      if(i<segments&&j<rings){const a=k,b=k+rings+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));this.geometry.setIndex(indices);
    this.mesh=new THREE.Mesh(this.geometry,material);this.mesh.frustumCulled=false;
  }
  update(points){
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
    const p=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3();
    for(let i=0;i<=this.segments;i++){
      const t=i/this.segments;curve.getPoint(t,p);curve.getTangent(t,tangent).normalize();
      binormal.set(0,0,1).cross(tangent).normalize();if(binormal.lengthSq()<1e-6)binormal.set(1,0,0);
      normal.crossVectors(tangent,binormal).normalize();
      for(let j=0;j<=this.rings;j++){
        const angle=2*Math.PI*j/this.rings,k=(i*(this.rings+1)+j)*3,a=Math.cos(angle)*this.radius,b=Math.sin(angle)*this.radius;
        this.positions[k]=p.x+binormal.x*a+normal.x*b;this.positions[k+1]=p.y+binormal.y*a+normal.y*b;this.positions[k+2]=p.z+binormal.z*a+normal.z*b;
      }
    }
    this.geometry.attributes.position.needsUpdate=true;this.geometry.computeVertexNormals();
  }
  dispose(){this.geometry.dispose();}
}

const title = document.querySelector('.hero-title');
const hero = title?.closest('section');
if (title && hero) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex:'97' });
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch {}
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const environment = new THREE.PMREMGenerator(renderer);
    scene.environment = environment.fromScene(new RoomEnvironment(), .04).texture;
    environment.dispose();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 3000);
    camera.position.z = 1000;
    scene.add(new THREE.AmbientLight(0xffffff, .65));
    const key = new THREE.DirectionalLight(0xe3fff5, 3);
    key.position.set(-100, 180, 500); scene.add(key);
    const rim = new THREE.DirectionalLight(0x819aff, 2);
    rim.position.set(300, -60, 150); scene.add(rim);
    const font = new FontLoader().parse(fontData);
    const letters = [];
    // Invisible depth-only copies of the actual extruded letter meshes. Their
    // real glyph holes are preserved. Since the visible lettering fades with
    // a transparent material, it alone cannot reliably occlude transparent
    // rope meshes (sorting is by whole object, not each rope segment).
    const letterOccluders=[];
    const occlusionMaterial=new THREE.MeshBasicMaterial({
      colorWrite:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide
    });
    let advance = 0, iCount=0;
    function makeEmblem(star) {
      const shape=new THREE.Shape();
      if(star){
        for(let j=0;j<10;j++){
          const angle=Math.PI/2+j*Math.PI/5,r=j%2?.047:.105;
          const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
          if(j===0)shape.moveTo(x,y);else shape.lineTo(x,y);
        }
      }else{
        shape.moveTo(0,-.10);
        shape.bezierCurveTo(-.17,.015,-.11,.14,0,.055);
        shape.bezierCurveTo(.11,.14,.17,.015,0,-.10);
      }
      shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.105,bevelEnabled:true,bevelThickness:.035,bevelSize:.022,bevelSegments:6,steps:1,curveSegments:20});
      geometry.translate(0,0,-.0525);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:star?0xd6fff0:0x6edbc2,metalness:.18,roughness:.22,clearcoat:1,transparent:true}));
      mesh.scale.setScalar(1.45);
      return mesh;
    }
    for (const char of title.textContent.trim()) {
      if (char !== ' ') {
        const options={size:1,depth:.18,curveSegments:12,bevelEnabled:true,bevelThickness:.022,bevelSize:.013,bevelSegments:5};
        const geometry = char==='i'
          ? new THREE.ExtrudeGeometry(font.generateShapes('i',1).filter(shape=>Math.min(...shape.getPoints().map(point=>point.y))<.45),options)
          : new TextGeometry(char, { font, ...options });
        geometry.computeBoundingBox();
        const mesh = new THREE.Mesh(geometry, [
          new THREE.MeshPhysicalMaterial({ color: 0x9fe6d0, roughness: .24, metalness: .28, clearcoat: .8, clearcoatRoughness: .18, transparent: true }),
          new THREE.MeshPhysicalMaterial({ color: 0x287f79, roughness: .26, metalness: .5, clearcoat: .65, transparent: true })
        ]);
        mesh.userData = { advance, baseX: 0, baseY: 0, influence: 0 };
        if(char==='i'){
          const emblem=makeEmblem(iCount++===1);
          emblem.position.set((geometry.boundingBox.min.x+geometry.boundingBox.max.x)/2,.96,.08);
          mesh.add(emblem);mesh.userData.emblem=emblem;
        }
        const occluder=new THREE.Mesh(geometry,occlusionMaterial);
        // Depth-only geometry renders in the opaque pass before transparent
        // rope and title materials; no painted mask or fake font silhouette.
        occluder.frustumCulled=false;
        occluder.visible=false; // enabled once the intro glyph is visible
        occluder.renderOrder=-10;
        letters.push(mesh);letterOccluders.push(occluder);
        scene.add(occluder,mesh);
      }
      advance += font.data.glyphs[char].ha / font.data.resolution - (char === ' ' ? 0 : .055);
    }
    const bounds = new THREE.Box3();
    letters.forEach(mesh => { mesh.position.x = mesh.userData.advance; mesh.updateMatrixWorld(); bounds.union(new THREE.Box3().setFromObject(mesh)); });
    const naturalWidth = bounds.max.x - bounds.min.x;
    const naturalHeight = bounds.max.y - bounds.min.y;
    letters.forEach(mesh => {
      const box=mesh.geometry.boundingBox;
      mesh.userData.center=(box.min.x+box.max.x)/2;
      mesh.geometry.translate(-mesh.userData.center, 0, -.08);
      if(mesh.userData.emblem)mesh.userData.emblem.position.x-=mesh.userData.center;
      mesh.geometry.computeBoundingBox();
    });
    const braidCanvas=document.createElement('canvas');braidCanvas.width=96;braidCanvas.height=256;
    const braidCtx=braidCanvas.getContext('2d');braidCtx.fillStyle='#90d9d9';braidCtx.fillRect(0,0,96,256);
    for(let y=-96;y<320;y+=14)for(let x=-96;x<192;x+=16){
      braidCtx.strokeStyle='rgba(250,255,255,.47)';braidCtx.lineWidth=2.7;braidCtx.beginPath();braidCtx.moveTo(x,y);braidCtx.lineTo(x+19,y+13);braidCtx.stroke();
      braidCtx.strokeStyle='rgba(11,91,108,.22)';braidCtx.lineWidth=2;braidCtx.beginPath();braidCtx.moveTo(x+12,y+10);braidCtx.lineTo(x+22,y+2);braidCtx.stroke();
    }
    const braidMap=new THREE.CanvasTexture(braidCanvas);braidMap.wrapS=braidMap.wrapT=THREE.RepeatWrapping;braidMap.repeat.set(1,7);braidMap.colorSpace=THREE.SRGBColorSpace;braidMap.anisotropy=4;
    const braidMaterial=new THREE.MeshPhysicalMaterial({map:braidMap,color:0xc6fffa,metalness:.09,roughness:.47,clearcoat:.26,clearcoatRoughness:.38,envMapIntensity:.7,transparent:true,
      depthTest:true,depthWrite:false});
    const eyeletMaterial=new THREE.MeshStandardMaterial({color:0xf1bd58,metalness:.42,roughness:.22,emissive:0x523000,emissiveIntensity:.12,depthTest:false,depthWrite:false});
    const ringAnchor=new THREE.Mesh(new THREE.TorusGeometry(1,.14,12,40,Math.PI),new THREE.MeshStandardMaterial({color:0xd6eee6,metalness:.85,roughness:.22,transparent:true}));
    scene.add(ringAnchor);
    const hangers=[3,7,9].map((anchor,index)=>{
      const char=index===0?'g':'o';
      const holes=font.generateShapes(char,1).flatMap(shape=>shape.holes);
      const hole=holes.sort((a,b)=>Math.max(...b.getPoints().map(v=>v.y))-Math.max(...a.getPoints().map(v=>v.y)))[0];
      const points=hole?.getPoints()||[new THREE.Vector2(letters[anchor].userData.center,.35)];
      const holeX=(Math.min(...points.map(v=>v.x))+Math.max(...points.map(v=>v.x)))/2-letters[anchor].userData.center;
      const holeY=(Math.min(...points.map(v=>v.y))+Math.max(...points.map(v=>v.y)))/2;
      const wire=new DynamicTube(braidMaterial,2.25,TOTAL_SAMPLES,7);
      // Keep each single cord above the letters and behind the metal eyelet.
      wire.mesh.renderOrder=20;
      scene.add(wire.mesh);
      // A polished eyelet sits above the complete word as its keychain bail.
      // The cord loops through it; the lower edge meets the word's top edge.
      const eyelet=new THREE.Mesh(new THREE.TorusGeometry(1,.24,12,48),eyeletMaterial);
      eyelet.renderOrder=30;
      scene.add(eyelet);
      const minX=Math.min(...points.map(v=>v.x)),maxX=Math.max(...points.map(v=>v.x));
      const minY=Math.min(...points.map(v=>v.y)),maxY=Math.max(...points.map(v=>v.y));
      // Hole dimensions are font-space units; screen scale is applied below.
      return {anchor,holeX,holeY,
        holeRx:Math.max(.05,(maxX-minX)*.45),holeRy:Math.max(.07,(maxY-minY)*.45),
        eyeletRadius:0,
        wire,eyelet,index};
    });
    // Each four-glyph name is its OWN rigid body. All three share ONE fixed top ring.
    const physical = hangers.map(() => ({
      body:null, mass:null, press:0, initialLength:0, targetLength:0,
      targetScale:1, scale:1, hover:0,hoverAt:0,pointerX:0,pointerY:0,followX:0,followY:0,ready:false
    }));
    const wordRanges = [[0, 4], [4, 8], [8, 12]];
    const sharedAnchor = { x: 0, y: 0 };
    const physicsDebug = new URLSearchParams(location.search).has('physicsDebug');
    // The letter is extruded AND scaled every frame. A hard-coded Z value
    // cannot decide whether rope is in front or behind its face.
    // Use the eight transformed bounding-box corners so any tilted/rotated
    // 3-D surface will still pass the depth test correctly.
    function glyphDepthRange(glyph){
      const b=glyph.geometry.boundingBox;
      const point=new THREE.Vector3();
      let near=-Infinity,far=Infinity;
      for(const x of [b.min.x,b.max.x])
        for(const y of [b.min.y,b.max.y])
          for(const z of [b.min.z,b.max.z]){
            point.set(x,y,z).applyMatrix4(glyph.matrixWorld);
            near=Math.max(near,point.z);
            far=Math.min(far,point.z);
          }
      return {near,far};
    }
    const physicsMarkers = physicsDebug ? physical.map(() => {
      const centre = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffb271, depthTest: false }));
      const contact = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x65fff3, depthTest: false }));
      scene.add(centre, contact);
      return { centre, contact };
    }) : null;

    function measureWordInPixels(first, last) {
      const triangles = [];
      let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
      for (let i=first; i<last; i++) {
        const mesh=letters[i], data=mesh.userData;
        const geo=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
        const p=geo.getAttribute('position'), n=geo.getAttribute('normal');
        for (let k=0; k+2<p.count; k+=3) {
          if(n && (n.getZ(k)+n.getZ(k+1)+n.getZ(k+2))/3<.98)continue;
          const tri=[];
          for(let j=0;j<3;j++) {
            const x=data.baseX+p.getX(k+j)*data.sx;
            const y=data.baseY+p.getY(k+j)*data.sy;
            tri.push({x,y});
            minX=Math.min(minX,x);maxX=Math.max(maxX,x);
            minY=Math.min(minY,y);maxY=Math.max(maxY,y);
          }
          triangles.push(tri);
        }
        if(geo!==mesh.geometry)geo.dispose();
      }
      const measure=calculatePlanarMass(triangles);
      if(!Number.isFinite(minX)) { minX=-80; maxX=80; minY=-20;maxY=20; }
      return {...measure, bounds: {minX,maxX,minY,maxY}};
    }
    const clampNumber=(v,min,max)=>Math.max(min,Math.min(max,v));
    const worldPointer=(event)=>({ x: event.clientX-innerWidth/2, y:innerHeight/2-event.clientY });

    let transforms=[],lastFrameAt=0,draggedIndex=-1;
    // Keep the name as ordinary text until the visitor starts scrolling.
    // The reveal only prepares the scene; the first real page scroll starts
    // the hanging-letter motion.
    let startAt=null,frame=0,hoverX=null,hoverY=0;
    let heroReady=false;
    let hoveredGroup=-1;
    let heroRevealAt=null;
    let bagProgress=0;
    let retractAt=null,retractPoses=null;
    const measure=document.createElement('canvas').getContext('2d');
    let fontSize=100;
    const clamp=value=>Math.min(1,Math.max(0,value));
    const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
    const mix=(a,b,t)=>a+(b-a)*t;
    function keychainCablePath(anchor,connection,zStart,zEnd,index,ringRadius,ropeLength){
      const start=new THREE.Vector3(anchor.x+(index-1)*1.4,anchor.y,zStart);
      const end=new THREE.Vector3(connection.x,connection.y+ringRadius*.52,zEnd);
      const distance=start.distanceTo(end);
      const slack=Math.max(0,ropeLength-distance);
      const sag=Math.min(30,slack*.45);
      const controlA=start.clone().lerp(end,1/3);
      const controlB=start.clone().lerp(end,2/3);
      controlA.y-=sag;
      controlB.y-=sag;
      return new THREE.CubicBezierCurve3(start,controlA,controlB,end).getPoints(TOTAL_SAMPLES);
    }
    const mint=new THREE.Color(0x9fe6d0);
    const highlight=new THREE.Color(0xd9fff1);
    // The initial full-width 3-D title is the physical starting pose.
    // Scrolling releases that pose into gravity without a second entrance tween.
    function schedule(){if(!frame)frame=requestAnimationFrame(render);}
    function resize(){
      const style=getComputedStyle(title),rect=title.getBoundingClientRect();
      const width=innerWidth,height=innerHeight;
      fontSize=parseFloat(style.fontSize);
      measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const text=title.textContent.trim(),spacing=parseFloat(style.letterSpacing)||0;
      const desiredWidth=Math.min(title.clientWidth*.98,measure.measureText(text).width+spacing*(text.length-1));
      const sx=desiredWidth/naturalWidth,sy=fontSize*.78/naturalHeight;
      for(const mesh of letters){
        mesh.scale.set(sx,sy,sx);
        mesh.userData.sx=sx;mesh.userData.sy=sy;
        mesh.userData.baseX=(mesh.userData.advance+mesh.userData.center-(bounds.min.x+bounds.max.x)/2)*sx;
        mesh.userData.baseY=-(bounds.min.y+bounds.max.y)/2*sy;
      }
      camera.left=-width/2;camera.right=width/2;
      camera.top=height/2;camera.bottom=-height/2;
      camera.updateProjectionMatrix();renderer.setSize(width,height,false);
      const nextAnchor={x:0,y:height/2-22};
      const anchorShift={x:nextAnchor.x-sharedAnchor.x,y:nextAnchor.y-sharedAnchor.y};
      sharedAnchor.x=nextAnchor.x;sharedAnchor.y=nextAnchor.y;
      const titleX=rect.left+rect.width/2-width/2;
      const titleY=height/2-rect.top-rect.height/2;
      for(let index=0;index<3;index++){
        const state=physical[index];
        const hanger=hangers[index],attached=letters[hanger.anchor].userData;
        const m=measureWordInPixels(...wordRanges[index]);
        const px=attached.baseX+hanger.holeX*attached.sx;
        const py=attached.baseY+hanger.holeY*attached.sy;
        const targetScale=Math.min(1,(width<680?49:67)/fontSize);
        // Mount the hardware at the top center of the whole word, not inside
        // one glyph's counter. The ring bottom slightly overlaps the lettering.
        const eyeletRadius=clampNumber(fontSize*.07,7,13);
        hanger.eyeletRadius=eyeletRadius;
        const attach={
          x:(m.bounds.minX+m.bounds.maxX)*.5-m.center.x,
          y:m.bounds.maxY+eyeletRadius*.78-m.center.y
        };
        const initialCentre={x:titleX+m.center.x,y:titleY+m.center.y};
        const initialHook={x:initialCentre.x+attach.x,y:initialCentre.y+attach.y};
        const initialLength=Math.max(90,Math.hypot(initialHook.x-sharedAnchor.x,
          initialHook.y-sharedAnchor.y)+22);
        const targetLength=height*[.135,.1875,.24][index];
        const mass=Math.max(1.5,Math.min(5.5,1.2+m.area/22000));
        const wasReady=state.ready;
        const previousScale=state.scale;
        state.mass={...m,px,py,attach};
        state.initialCentre=initialCentre;
        state.initialLength=initialLength;
        state.targetLength=targetLength;
        state.targetScale=targetScale;
        state.ready=true;
        if(!wasReady){
          const inertia=Math.max(250,mass*m.unitInertia);
          state.body=new HangingRigidBody({mass,inertia,attachment:attach,
            ropeLength:initialLength,ropeStiffness:mass*100,ropeDamping:mass*20,
            gravity:850,airDamping:.42,angularDamping:1.25});
          state.body.reset(initialCentre,0);
          state.body.velocity.x=0;
          state.scale=1;
        }else{
          // Resize is a continuity-preserving rebase, never body.reset().
          const body=state.body;
          body.position.x+=anchorShift.x;body.position.y+=anchorShift.y;
          body.mass=mass;
          body.attachment={x:attach.x*previousScale,y:attach.y*previousScale};
          body.inertia=Math.max(250,mass*m.unitInertia*previousScale**2);
        }
      }
      schedule();
    }
    function render(now){
      frame=0;
      if(!heroReady)return;
      const dt=lastFrameAt?Math.min(.032,Math.max(1/120,(now-lastFrameAt)/1000)):1/60;
      lastFrameAt=now;
      const elapsed=startAt===null?0:now-startAt;
      const entrance=reduced?1:smooth((now-heroRevealAt)/900);
      canvas.style.opacity='1';
      const retractProgress=retractAt===null?0:smooth((now-retractAt)/750);
      if(retractAt!==null&&retractProgress>=1){
        startAt=null;retractAt=null;retractPoses=null;
      }
      // Scrolling releases the loaded pose into gravity while scale and rope
      // length ease from their exact initial values, with no pose reset.
      const departure=smooth(bagProgress/.90);
      const progress=reduced||startAt!==null?1:departure;
      const ropeProgress=progress;
      const mountEntrance=reduced?1:smooth(elapsed/750);
      const mountOffset=90*(1-mountEntrance)+innerHeight*.72*retractProgress;
      sharedAnchor.x=0;
      sharedAnchor.y=innerHeight/2-22+mountOffset;
      const hangingVisible=startAt!==null;
      ringAnchor.visible=hangingVisible;
      ringAnchor.position.set(sharedAnchor.x,innerHeight/2+2+mountOffset,43);
      ringAnchor.scale.setScalar(24);
      ringAnchor.rotation.z=Math.PI;
      ringAnchor.material.opacity=1;
      const output=[];
      for(let index=0;index<3;index++){
        const h=hangers[index],s=physical[index];
        if(!s.ready)continue;
        const body=s.body,m=s.mass,attached=letters[h.anchor].userData;
        const scale=mix(1,s.targetScale,progress);
        s.scale=scale;
        if(startAt===null&&!reduced){
          body.position.x=mix(s.initialCentre.x,(index-1)*innerWidth*.055,departure);
          body.position.y=s.initialCentre.y+innerHeight*1.12*departure;
          body.angle=0;
          body.velocity.x=body.velocity.y=body.angularVelocity=0;
        }
        body.attachment={x:m.attach.x*scale,y:m.attach.y*scale};
        body.inertia=Math.max(250,body.mass*m.unitInertia*scale*scale);
        const impactTime=startAt===null?-1:elapsed/1000-.28-index*.045;
        const elasticStretch=!reduced&&impactTime>0?
          Math.max(0,Math.sin(impactTime*7.5))*Math.exp(-impactTime*1.65)*s.targetLength*.85:0;
        body.ropeLength=mix(s.initialLength,s.targetLength,reduced?1:ropeProgress)+elasticStretch;
        if(retractAt!==null){
          const pose=retractPoses[index];
          body.position.x=mix(pose.x,(index-1)*innerWidth*.055,retractProgress);
          body.position.y=pose.y+innerHeight*1.3*retractProgress;
          body.angle=mix(pose.angle,0,retractProgress);
          body.velocity.x=body.velocity.y=body.angularVelocity=0;
        }else if(!reduced&&startAt!==null){
          const substeps=Math.max(2,Math.ceil(dt/(1/180)));
          for(let j=0;j<substeps;j++){
            // Persistent low-intensity ambient breeze keeps the 3 charms
            // moving organically, with no rotation angle keyed to time.
            const gust=Math.sin(now*.00062+index*1.9)*31+
              Math.sin(now*.00111+index*2.6)*13;
            body.step(dt/substeps,sharedAnchor,{windX:gust});
          }
        }
        const hole=body.point({x:(m.px-m.center.x)*scale,y:(m.py-m.center.y)*scale});
        const connection=body.point(body.attachment);
        const angle=body.angle;
        // Defer all rope geometry updates until the 3-D letters are placed.
        // Otherwise we would measure the PREVIOUS frame's model depth.
        output[index]={hole,connection,angle,scale,progress};
        s.press+=((body.drag?1:0)-s.press)*Math.min(1,dt*18);
        if(physicsMarkers){
          const marker=physicsMarkers[index];
          marker.centre.position.set(body.position.x,body.position.y,47);
          const contact=body.point(body.attachment);
          marker.contact.position.set(contact.x,contact.y,47);
        }
      }
      transforms=output;
      physical.forEach((s,i)=>{
        const blend=1-Math.exp(-dt*12);
        s.hover+=((hoveredGroup===i&&!reduced?1:0)-s.hover)*blend;
        s.followX+=(s.pointerX-s.followX)*blend;
        s.followY+=(s.pointerY-s.followY)*blend;
      });
      const rect=title.getBoundingClientRect();
      for(let index=0;index<letters.length;index++){
        const mesh=letters[index],occluder=letterOccluders[index];
        const data=mesh.userData,groupIndex=Math.floor(index/4);
        const out=output[groupIndex],s=physical[groupIndex];
        if(!out)continue;
        const progressGlyph=reduced?1:clamp((now-heroRevealAt-index*55)/900);
        const q=progressGlyph-1;
        const ease=1+2.3*q*q*q+1.3*q*q;
        const centerX=data.baseX+(mesh.geometry.boundingBox.max.x+mesh.geometry.boundingBox.min.x)*data.sx/2;
        const proximity=0;
        data.influence+=(proximity-data.influence)*.13;
        const localX=(data.baseX-s.mass.px)*out.scale;
        const localY=(data.baseY-s.mass.py-(1-ease)*fontSize*.43+data.influence*fontSize*.018)*out.scale;
        const co=Math.cos(out.angle),si=Math.sin(out.angle);
        mesh.position.set(out.hole.x+localX*co-localY*si,
          out.hole.y+localX*si+localY*co,
          data.influence*fontSize*.05*(1-out.progress));
        const squeeze=1-s.press*.045;
        mesh.scale.set(data.sx*out.scale*(1+s.press*.018),
          data.sy*out.scale*squeeze,data.sx*out.scale*(1+s.press*.018));
        mesh.rotation.x=(1-ease)*-1.15+data.influence*hoverY*-.21*(1-out.progress);
        mesh.rotation.y=-.055+(1-ease)*(index%2?.48:-.48)+out.progress*.18;
        mesh.rotation.z=out.angle+(1-ease)*(index%2?.10:-.10);
        const hover=s.hover*progressGlyph;
        const hoverTime=(now-s.hoverAt)/1000;
        const slot=index%4;
        if(groupIndex===0){
          mesh.position.y+=hover*out.scale*fontSize*(.035+.025*Math.sin(hoverTime*7-slot*.65));
          mesh.rotation.z+=hover*.045*Math.sin(hoverTime*5-slot*.45);
        }else if(groupIndex===1){
          const glyphX=data.baseX-s.mass.center.x;
          const distance=(s.followX-glyphX)/Math.max(1,fontSize*.65);
          const influence=Math.exp(-distance*distance*1.5);
          const vertical=clampNumber(s.followY/Math.max(1,fontSize*.42),-1,1);
          mesh.rotation.x-=hover*influence*vertical*.38;
          mesh.rotation.y+=hover*clampNumber(distance,-1,1)*.42;
          mesh.rotation.z+=hover*influence*clampNumber(distance,-1,1)*.07;
          mesh.position.y+=hover*influence*out.scale*fontSize*.055;
          mesh.position.z+=hover*influence*out.scale*fontSize*.16;
        }else{
          mesh.position.y+=hover*out.scale*fontSize*.045*Math.sin(hoverTime*5-slot*.85);
          mesh.rotation.z+=hover*.055*Math.sin(hoverTime*5-slot*.85);
        }
        mesh.material.forEach(mat=>mat.opacity=Math.min(1,progressGlyph*6));
        mesh.material[0].color.copy(mint).lerp(highlight,data.influence*.28);
        // Invisible duplicate writes the TRUE extruded mesh depth while
        // preserving the 2-D holes. Do not show the mask until glyph visible.
        occluder.position.copy(mesh.position);
        occluder.rotation.copy(mesh.rotation);
        occluder.scale.copy(mesh.scale);
        occluder.visible=progressGlyph>.985;
        if(data.emblem){
          const beat=reduced||startAt===null?0:Math.max(0,Math.sin(elapsed*.002+index*.4))*.035;
          data.emblem.material.opacity=mesh.material[0].opacity;
          data.emblem.position.y=.96+beat;
          data.emblem.rotation.y=(1-ease)*Math.PI*2;
          data.emblem.rotation.z=(1-ease)*-.35;
          data.emblem.scale.setScalar(1.45);
        }
      }
      // Draw the cords after the lettering's transforms are updated.
      // All coordinates are world-space: positive Z is toward the viewer.
      scene.updateMatrixWorld(true);
      for(let index=0;index<hangers.length;index++){
        const h=hangers[index],s=physical[index],out=output[index];
        if(!s.ready||!out)continue;
        const attached=letters[h.anchor];
        const data=attached.userData;
        const depth=glyphDepthRange(attached);
        const clearance=h.wire.radius+2.5;
        const ringRadius=h.eyeletRadius*out.scale;
        h.eyelet.position.set(out.connection.x,out.connection.y,depth.near+clearance*2);
        h.eyelet.rotation.z=out.angle;
        const ringEntrance=reduced?1:smooth((now-heroRevealAt-index*220-300)/650);
        h.eyelet.scale.setScalar(ringRadius*ringEntrance);
        h.wire.update(keychainCablePath(sharedAnchor,out.connection,ringAnchor.position.z,
          depth.near+clearance,index,ringRadius,s.body.ropeLength));
        h.wire.mesh.visible=hangingVisible;
        h.wire.mesh.material.opacity=.95;
      }
      renderer.render(scene,camera);
      // Animation runs for the duration of the page, regardless of scroll.
      // Only OS/browser reduced-motion and hidden-tab policies suspend it.
      if(!document.hidden)schedule();
    }
    function start(){
      if(startAt!==null||!heroReady)return;
      startAt=performance.now();lastFrameAt=0;
      title.style.color='transparent';
      if(reduced){
        // Respect accessibility while showing the final appearance.
        for(const state of physical){
          if(!state.ready)continue;
          state.body.ropeLength=state.targetLength;
          state.body.reset({
            x:sharedAnchor.x-state.body.attachment.x,
            y:sharedAnchor.y-state.targetLength-state.body.attachment.y
          },0);
        }
      }
      schedule();
    }
    function markHeroReady(){
      if(heroRevealAt===null)heroRevealAt=performance.now();
      heroReady=true;
      title.style.color='transparent';
      schedule();
      if(reduced)start();
    }
    const onBagPose=()=>{
      const next=window.__dxBagPose?.progress??window.__dxBagProgress??0;
      if(startAt!==null&&retractAt===null&&next<bagProgress-.00001&&next<.94){
        retractAt=performance.now();
        retractPoses=physical.map(s=>({x:s.body.position.x,y:s.body.position.y,angle:s.body.angle}));
      }
      bagProgress=next;
      if(heroReady&&bagProgress>=.97&&retractAt===null)start();
      schedule();
    };
    window.addEventListener('dx:bag-pose',onBagPose);
    window.addEventListener('dx:bag-scroll',event=>{
      if(!window.__dxBagPose){bagProgress=event.detail.progress;if(heroReady&&bagProgress>=.97)start();schedule();}
    });
    window.addEventListener('dx:hero-reveal',markHeroReady,{once:true});
    const openingObserver=new MutationObserver(()=>{
      if(document.body.classList.contains('opening-ready')){
        markHeroReady();openingObserver.disconnect();
      }
    });
    openingObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    if(window.__dxHeroRevealed||document.body.classList.contains('opening-ready'))markHeroReady();
    else if(!document.querySelector('#opening-root'))markHeroReady();
    function onPointerDown(event){
      if(reduced||event.button!==0||startAt===null||
         event.target.closest?.('button,a,input,textarea,select,[role="dialog"]'))return;
      const point=worldPointer(event);
      let nearest=-1,dist=Infinity;
      physical.forEach((s,index)=>{
        if(!s.ready)return;
        const b=s.body,m=s.mass;
        const local=rotate2({x:point.x-b.position.x,y:point.y-b.position.y},-b.angle);
        const box=m.bounds,scale=s.scale,pad=9;
        if(local.x<(box.minX-m.center.x)*scale-pad||
           local.x>(box.maxX-m.center.x)*scale+pad||
           local.y<(box.minY-m.center.y)*scale-pad||
           local.y>(box.maxY-m.center.y)*scale+pad)return;
        const d=Math.hypot(local.x,local.y);
        if(d<dist){dist=d;nearest=index;}
      });
      if(nearest<0)return;
      const s=physical[nearest];
      const local=rotate2({x:point.x-s.body.position.x,
        y:point.y-s.body.position.y},-s.body.angle);
      s.body.setDrag(point,local);
      draggedIndex=nearest;
      // Capture is on the actual clicked DOM element; the WebGL overlay
      // never steals taps or menu/links while the user scrolls the site.
      try{event.target.setPointerCapture?.(event.pointerId)}catch{}
      event.preventDefault();schedule();
    }
    function onPointerMove(event){
      if(draggedIndex>=0){
        physical[draggedIndex].body.moveDrag(worldPointer(event));
        schedule();return;
      }
      if(reduced||event.pointerType==='touch')return;
      const point=worldPointer(event);
      let next=-1;
      physical.forEach((s,i)=>{
        if(!s.ready)return;
        const local=rotate2({x:point.x-s.body.position.x,y:point.y-s.body.position.y},-s.body.angle);
        const box=s.mass.bounds,c=s.mass.center,pad=12;
        if(local.x>=(box.minX-c.x)*s.scale-pad&&local.x<=(box.maxX-c.x)*s.scale+pad&&
           local.y>=(box.minY-c.y)*s.scale-pad&&local.y<=(box.maxY-c.y)*s.scale+pad){
          next=i;
          s.pointerX=local.x/Math.max(.001,s.scale);
          s.pointerY=local.y/Math.max(.001,s.scale);
        }
      });
      if(next!==hoveredGroup&&next>=0)physical[next].hoverAt=performance.now();
      hoveredGroup=next;
      const rect=title.getBoundingClientRect();
      hoverX=event.clientX-rect.left-rect.width/2;
      hoverY=(event.clientY-rect.top)/Math.max(rect.height,1)-.5;
    }
    function onPointerUp(){
      if(draggedIndex<0)return;
      physical[draggedIndex].body.stopDrag();
      draggedIndex=-1;schedule();
    }
    window.addEventListener('pointerdown',onPointerDown,{capture:true});
    window.addEventListener('pointermove',onPointerMove,{passive:true});
    window.addEventListener('pointerup',onPointerUp);
    window.addEventListener('pointercancel',onPointerUp);
    window.addEventListener('blur',onPointerUp);
    window.addEventListener('blur',()=>{hoveredGroup=-1;});
    window.addEventListener('pointerout',event=>{if(!event.relatedTarget)hoveredGroup=-1;});
    window.addEventListener('resize',resize,{passive:true});
    new ResizeObserver(resize).observe(title);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){cancelAnimationFrame(frame);frame=0;lastFrameAt=0;}
      else if(startAt!==null)schedule();
    });
    // The bag's detailed progress event does not drive letter physics; the
    // first real page scroll starts gravity and the continuous motion.
    document.body.append(canvas);
    // Keep the original h1 for its layout and accessible name; the visible letters are meshes.
    title.style.color = 'transparent';
    resize();
    renderer.compile(scene,camera);
    // Warm the actual positioned meshes and GPU buffers behind the curtain.
    heroReady=true;heroRevealAt=performance.now()-2000;
    render(performance.now());
    heroReady=false;heroRevealAt=null;
    cancelAnimationFrame(frame);frame=0;
    canvas.style.opacity='0';
    window.__dxTitleReady=true;
    window.dispatchEvent(new CustomEvent('dx:title-ready'));
  }
  else window.__dxTitleReady=true;
}
