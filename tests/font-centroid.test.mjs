import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import * as THREE from 'three';
import {calculatePlanarMass} from '../hanging-physics.js';

const font = new FontLoader().parse(JSON.parse(readFileSync(new URL('../assets/title-font.json',import.meta.url))));
const words=['Ding','Xiao','Dong'];
function add(geometry, offset, scale, triangles) {
  const g=geometry.index?geometry.toNonIndexed():geometry;
  const p=g.getAttribute('position'),n=g.getAttribute('normal');
  for(let i=0;i+2<p.count;i+=3){
    if(n&&(n.getZ(i)+n.getZ(i+1)+n.getZ(i+2))/3<.98)continue;
    const tri=[];
    for(let k=0;k<3;k++)tri.push({x:(p.getX(i+k)+offset)*scale,y:p.getY(i+k)*scale});
    triangles.push(tri);
  }
  if(g!==geometry)g.dispose();
}
for(const word of words){
 test(`${word} has non-zero visible cap mass with right/inner-hole suspension`,()=>{
   let advance=0, holeX=0, tr=[];
   for (let i=0;i<word.length;i++) {
     const ch=word[i]; const opts={size:1, depth:.18,curveSegments:12,bevelEnabled:true,bevelThickness:.022,bevelSize:.013,bevelSegments:5};
     const geo=ch==='i' ? new THREE.ExtrudeGeometry(font.generateShapes('i',1).filter(s=>Math.min(...s.getPoints().map(p=>p.y))<.45),opts):new TextGeometry(ch,{font,...opts});
     geo.computeBoundingBox();
     const center=(geo.boundingBox.min.x+geo.boundingBox.max.x)/2;
     geo.translate(-center,0,-.08);
     add(geo,advance+center,100,tr);
     if (word==='Ding'?i===3 : word==='Xiao'?i===3:i===1) {
       const shape=font.generateShapes(ch,1).flatMap(s=>s.holes)[0];
       const pts=shape.getPoints();
       holeX=(advance+(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2)*100;
     }
     advance+=font.data.glyphs[ch].ha/font.data.resolution-.055;
     geo.dispose();
   }
   const mass=calculatePlanarMass(tr);
   assert.ok(mass.area>1000,`${word} cap area too small: ${mass.area}`);
   assert.ok(mass.unitInertia>1000);
   assert.ok(Number.isFinite(holeX));
   console.log(`${word}: area=${mass.area.toFixed(0)} center=${mass.center.x.toFixed(1)} holeX=${holeX.toFixed(1)}, offset=${(holeX-mass.center.x).toFixed(1)}`);
 });
}
