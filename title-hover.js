import * as THREE from 'three';
import { HangingRigidBody, calculatePlanarMass, rotate2 } from './hanging-physics.js';
import { threadCounterPath, TOTAL_SAMPLES } from './threaded-rope.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from './assets/title-font.json';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Original typography, 3D materials and intro choreography are preserved.
// Rope threads through g/o counters; unilateral tension drives 2-D rigid-body rotation.
// Counter contact is approximated by an effective bearing point; not full 3-D rope collision.
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
    const ringAnchor=new THREE.Mesh(new THREE.TorusGeometry(1,.22,10,32),new THREE.MeshStandardMaterial({color:0xd6eee6,metalness:.85,roughness:.22,transparent:true}));
    scene.add(ringAnchor);
    const hangers=[3,7,9].map((anchor,index)=>{
      const char=index===0?'g':'o';
      const holes=font.generateShapes(char,1).flatMap(shape=>shape.holes);
      const hole=holes.sort((a,b)=>Math.max(...b.getPoints().map(v=>v.y))-Math.max(...a.getPoints().map(v=>v.y)))[0];
      const points=hole?.getPoints()||[new THREE.Vector2(letters[anchor].userData.center,.35)];
      const holeX=(Math.min(...points.map(v=>v.x))+Math.max(...points.map(v=>v.x)))/2-letters[anchor].userData.center;
      const holeY=(Math.min(...points.map(v=>v.y))+Math.max(...points.map(v=>v.y)))/2;
      const wire=new DynamicTube(braidMaterial,2.25,TOTAL_SAMPLES,7);
      // Transparent letters render first. Rope then tests against the real
      // glyph depth-only pass: front strand visible, back strand occluded.
      wire.mesh.renderOrder=20;
      scene.add(wire.mesh);
      const minX=Math.min(...points.map(v=>v.x)),maxX=Math.max(...points.map(v=>v.x));
      const minY=Math.min(...points.map(v=>v.y)),maxY=Math.max(...points.map(v=>v.y));
      // Hole dimensions are font-space units; screen scale is applied below.
      return {anchor,holeX,holeY,
        holeRx:Math.max(.05,(maxX-minX)*.45),holeRy:Math.max(.07,(maxY-minY)*.45),
        glyphTop:letters[anchor].geometry.boundingBox.max.y,
        wire,index,ropeNodes:null};
    });
    // Each four-glyph name is its OWN rigid body. All three share ONE fixed top ring.
    const physical = hangers.map(() => ({
      body:null, mass:null, press:0, initialLength:0, targetLength:0,
      targetScale:1, scale:1, ready:false
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
    const measure=document.createElement('canvas').getContext('2d');
    let fontSize=100;
    const clamp=value=>Math.min(1,Math.max(0,value));
    const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
    const mix=(a,b,t)=>a+(b-a)*t;
    const mint=new THREE.Color(0x9fe6d0);
    const highlight=new THREE.Color(0xd9fff1);
    // The initial full-width 3-D title is the physical starting pose.
    // Scrolling releases that pose into gravity without a second entrance tween.
    function schedule(){if(!frame)frame=requestAnimationFrame(render);}
    function simulateRope(hanger,raw,threadStart,threadEnd,dt){
      const points=raw.map(p=>new THREE.Vector3(p.x,p.y,p.z));
      if(!hanger.ropeNodes||hanger.ropeNodes.length!==points.length){
        hanger.ropeNodes=points.map(p=>({position:p.clone(),previous:p.clone()}));
      }
      const nodes=hanger.ropeNodes,last=nodes.length-1;
      const fixed=i=>i===0||i===last||(i>=threadStart&&i<=threadEnd);
      const decay=Math.exp(-dt*7.5);
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i];
        if(fixed(i)){
          node.position.copy(points[i]);node.previous.copy(points[i]);continue;
        }
        const vx=(node.position.x-node.previous.x)*decay;
        const vy=(node.position.y-node.previous.y)*decay;
        const vz=(node.position.z-node.previous.z)*decay;
        node.previous.copy(node.position);
        node.position.x+=vx;
        node.position.y+=vy-260*dt*dt;
        node.position.z+=vz;
        // Small attraction toward an aerodynamically fair curve; NOT a
        // hard pose snap. The letter-contact section stays exactly pinned.
        node.position.lerp(points[i],Math.min(1,dt*4));
      }
      for(let pass=0;pass<7;pass++){
        for(let i=0;i<last;i++){
          const pa=nodes[i].position,pb=nodes[i+1].position;
          const dx=pb.x-pa.x,dy=pb.y-pa.y,dz=pb.z-pa.z;
          const length=Math.hypot(dx,dy,dz);
          if(length<.0001)continue;
          const rest=points[i].distanceTo(points[i+1])*1.015;
          const delta=(length-rest)/length;
          if(delta<=0)continue; // rope links pull, never push
          const wa=fixed(i)?0:1,wb=fixed(i+1)?0:1,sum=wa+wb;
          if(!sum)continue;
          const kA=delta*wa/sum,kB=delta*wb/sum;
          pa.x+=dx*kA;pa.y+=dy*kA;pa.z+=dz*kA;
          pb.x-=dx*kB;pb.y-=dy*kB;pb.z-=dz*kB;
        }
        for(let i=0;i<nodes.length;i++)if(fixed(i))nodes[i].position.copy(points[i]);
      }
      return nodes.map(node=>node.position);
    }
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
      const brand=document.querySelector('.masthead .brand')?.getBoundingClientRect();
      const nextAnchor={x:(brand?.left??20)+25-width/2,
        y:height/2-(brand?.bottom??70)-1};
      const shift={x:nextAnchor.x-sharedAnchor.x,y:nextAnchor.y-sharedAnchor.y};
      sharedAnchor.x=nextAnchor.x;sharedAnchor.y=nextAnchor.y;
      const titleX=rect.left+rect.width/2-width/2;
      const titleY=height/2-rect.top-rect.height/2;
      for(let index=0;index<3;index++){
        const hanger=hangers[index],attached=letters[hanger.anchor].userData;
        const m=measureWordInPixels(...wordRanges[index]);
        const px=attached.baseX+hanger.holeX*attached.sx;
        const py=attached.baseY+hanger.holeY*attached.sy;
        const targetScale=Math.min(1,(width<680?49:67)/fontSize);
        const origHook={x:titleX+px,y:titleY+py};
        // The torque bearing is the LOWER inner wall of the letter's counter.
        // It coincides with the visible threaded U bend inside the hole.
        const contactY=py-hanger.holeRy*attached.sy*.75;
        const attach={x:px-m.center.x,y:contactY-m.center.y};
        const initialCentre={x:titleX+m.center.x,y:titleY+m.center.y};
        const initialHook={x:initialCentre.x+attach.x,y:initialCentre.y+attach.y};
        const initialLength=Math.max(90,Math.hypot(initialHook.x-sharedAnchor.x,
          initialHook.y-sharedAnchor.y)+22);
        const targetLength=Math.max(35,Math.min(initialLength*.5,height*[.135,.23,.325][index]));
        const mass=Math.max(1.5,Math.min(5.5,1.2+m.area/22000));
        const state=physical[index];
        const wasReady=state.ready;
        const previousScale=state.scale;
        state.mass={...m,px,py};
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
          body.position.x+=shift.x;body.position.y+=shift.y;
          body.mass=mass;
          body.attachment={x:attach.x*previousScale,y:attach.y*previousScale};
          body.inertia=Math.max(250,mass*m.unitInertia*previousScale**2);
        }
        hanger.ropeNodes=null;
      }
      schedule();
    }
    function render(now){
      frame=0;
      if(!heroReady)return;
      const dt=lastFrameAt?Math.min(.032,Math.max(1/120,(now-lastFrameAt)/1000)):1/60;
      lastFrameAt=now;
      const elapsed=startAt===null?0:now-startAt;
      // Scrolling releases the loaded pose into gravity while scale and rope
      // length ease from their exact initial values, with no pose reset.
      const progress=reduced?1:smooth(elapsed/1450);
      const ropeProgress=startAt===null?0:smooth(elapsed/1450);
      const brand=document.querySelector('.masthead .brand')?.getBoundingClientRect();
      if(brand){
        // A single stationary top-ring in viewport coordinates.
        // It does NOT jump in response to scroll progress.
        sharedAnchor.x=brand.left+25-innerWidth/2;
        sharedAnchor.y=innerHeight/2-brand.bottom-1;
      }
      const from=new THREE.Vector3(sharedAnchor.x,sharedAnchor.y,43);
      ringAnchor.position.copy(from);
      ringAnchor.scale.setScalar(Math.max(3.3,fontSize*.050));
      ringAnchor.rotation.z=reduced||startAt===null?0:Math.sin(now*.00087)*.03;
      ringAnchor.material.opacity=.93;
      const output=[];
      for(let index=0;index<3;index++){
        const h=hangers[index],s=physical[index];
        if(!s.ready)continue;
        const body=s.body,m=s.mass,attached=letters[h.anchor].userData;
        const scale=mix(1,s.targetScale,progress);
        s.scale=scale;
        body.attachment={
          x:(m.px-m.center.x)*scale,
          y:(m.py-h.holeRy*attached.sy*.75-m.center.y)*scale
        };
        body.inertia=Math.max(250,body.mass*m.unitInertia*scale*scale);
        body.ropeLength=mix(s.initialLength,s.targetLength,reduced?1:ropeProgress);
        if(!reduced&&startAt!==null){
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
        const angle=body.angle;
        // Defer all rope geometry updates until the 3-D letters are placed.
        // Otherwise we would measure the PREVIOUS frame's model depth.
        output[index]={hole,angle,scale,progress};
        s.press+=((body.drag?1:0)-s.press)*Math.min(1,dt*18);
        if(physicsMarkers){
          const marker=physicsMarkers[index];
          marker.centre.position.set(body.position.x,body.position.y,47);
          const contact=body.point(body.attachment);
          marker.contact.position.set(contact.x,contact.y,47);
        }
      }
      transforms=output;
      const rect=title.getBoundingClientRect();
      for(let index=0;index<letters.length;index++){
        const mesh=letters[index],occluder=letterOccluders[index];
        const data=mesh.userData,groupIndex=Math.floor(index/4);
        const out=output[groupIndex],s=physical[groupIndex];
        if(!out)continue;
        const progressGlyph=1;
        const ease=progressGlyph===1?1:1-Math.exp(-7*progressGlyph)*Math.cos(progressGlyph*9);
        const centerX=data.baseX+(mesh.geometry.boundingBox.max.x+mesh.geometry.boundingBox.min.x)*data.sx/2;
        const proximity=!reduced&&hoverX!==null&&rect.width>0?
          Math.max(0,1-Math.abs(hoverX-centerX)/(fontSize*1.15)):0;
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
        mesh.rotation.y=-.055+(1-ease)*(index%2?1.4:-1.4)+out.progress*.18;
        mesh.rotation.z=out.angle;
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
        const rx=Math.max(4,h.holeRx*data.sx*out.scale*.76);
        const ry=Math.max(5,h.holeRy*data.sy*out.scale*.77);
        const topRise=(h.glyphTop-h.holeY)*data.sy*out.scale;
        const route=threadCounterPath({
          anchor:sharedAnchor,hole:out.hole,angle:out.angle,rx,ry,topRise,
          zFront:depth.near+clearance,
          zBack:depth.far-clearance,
          zAnchor:ringAnchor.position.z
        });
        const cord=simulateRope(h,route.points,route.threadStart,route.threadEnd,startAt===null?0:dt);
        h.wire.update(cord);
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
          state.body.reset({x:sharedAnchor.x,y:sharedAnchor.y-state.targetLength});
          state.body.angle=-Math.atan2(state.body.attachment.x,state.body.attachment.y||1);
        }
      }
      schedule();
    }
    function markHeroReady(){
      heroReady=true;
      title.style.color='transparent';
      schedule();
      if(reduced)start();
    }
    let lastScrollY=window.scrollY;
    const onPageScroll=()=>{
      const current=window.scrollY;
      const moved=Math.abs(current-lastScrollY)>1;
      lastScrollY=current;
      if(heroReady&&moved)start();
    };
    window.addEventListener('scroll',onPageScroll,{passive:true});
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
    title.style.color = '';
    resize();
  }
}
