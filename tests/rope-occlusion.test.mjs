import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { threadCounterPath } from '../threaded-rope.js';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const font = new FontLoader().parse(JSON.parse(readFileSync(new URL('../assets/title-font.json', import.meta.url), 'utf8')));

test('rear cord goes behind even thick, rotated, scaled o glyphs', () => {
  const geometry = new TextGeometry('o', {
    font, size: 1, depth: .18, curveSegments: 12,
    bevelEnabled: true, bevelThickness: .022,
    bevelSize: .013, bevelSegments: 5
  });
  geometry.translate(0, 0, -.08);
  geometry.computeBoundingBox();
  const glyph = new THREE.Mesh(geometry);
  for (const scale of [30, 70, 150]) {
    glyph.scale.setScalar(scale);
    for (const tilt of [-.3, 0, .18]) {
      glyph.rotation.set(0, tilt, .4);
      glyph.updateMatrixWorld(true);
      const b = geometry.boundingBox;
      let near = -Infinity, far = Infinity;
      for (const x of [b.min.x,b.max.x])
        for (const y of [b.min.y,b.max.y])
          for (const z of [b.min.z,b.max.z]) {
            const p = new THREE.Vector3(x,y,z).applyMatrix4(glyph.matrixWorld);
            near=Math.max(near,p.z);
            far=Math.min(far,p.z);
          }
      const radius = 2.25, clearance = radius + 2.5;
      const front=near+clearance, back=far-clearance;
      const path=threadCounterPath({anchor:{x:-100,y:180},hole:{x:20,y:-20},
        rx:18,ry:14,topRise:28,zFront:front,zBack:back,zAnchor:43});
      const zs=path.points.slice(path.threadStart,path.threadEnd+1).map(p=>p.z);
      assert.ok(Math.min(...zs) <= far-radius,
        `rear rope must be hidden by geometry at scale=${scale} tilt=${tilt}`);
      assert.ok(Math.max(...zs)>=near+radius,
        `front rope must be ahead of the glyph at scale=${scale} tilt=${tilt}`);
      assert.ok(front>back);
    }
  }
  geometry.dispose();
});

test('the invisible glyph depth-only mesh preserves holes and masks rear rope', () => {
  const text=readFileSync(new URL('../title-hover.js',import.meta.url),'utf8');
  assert.match(text,/colorWrite:false,depthWrite:true,depthTest:true/);
  assert.match(text,/new THREE\.Mesh\(geometry,occlusionMaterial\)/);
  assert.match(text,/occluder\.position\.copy\(mesh\.position\)/);
  assert.match(text,/occluder\.rotation\.copy\(mesh\.rotation\)/);
  assert.match(text,/occluder\.scale\.copy\(mesh\.scale\)/);
  assert.match(text,/scene\.updateMatrixWorld\(true\)/);
  assert.match(text,/zBack:depth\.far-clearance/);
  assert.match(text,/zFront:depth\.near\+clearance/);
  assert.match(text,/depthWrite:false/); // transparent rope must not block letters
  assert.match(text,/wire\.mesh\.renderOrder=20/); // draw cord AFTER translucent glyph color
});
