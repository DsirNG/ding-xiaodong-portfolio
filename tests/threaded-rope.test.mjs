import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { threadCounterPath, AIR_SAMPLES, THREAD_SAMPLES, TOTAL_SAMPLES } from '../threaded-rope.js';
import { HangingRigidBody } from '../hanging-physics.js';

const setup = { anchor:{x:-250,y:230},hole:{x:50,y:-120},angle:0,
  rx:25,ry:18,topRise:42,zFront:42 };

test('counter routing enters hole and exits, not a straight chord through letters',()=>{
  const {points,threadStart,threadEnd,contact}=threadCounterPath(setup);
  assert.equal(points.length,TOTAL_SAMPLES+1);
  assert.equal(threadStart,AIR_SAMPLES);
  assert.equal(threadEnd,AIR_SAMPLES+THREAD_SAMPLES);
  assert.equal(points[0].x,setup.anchor.x-3);
  assert.equal(points.at(-1).x,setup.anchor.x+3);
  // At least one visible bite lies inside the o/g hole and in front/behind planes.
  const inside=points.slice(threadStart,threadEnd+1).filter(p=>
    Math.abs(p.x-setup.hole.x)<setup.rx*.85 &&
    Math.abs(p.y-setup.hole.y)<setup.ry*.9);
  assert.ok(inside.length>=5,`${inside.length} inside hole`);
  assert.ok(inside.some(p=>p.z<setup.zFront-13));
  assert.ok(points[threadStart].y>setup.hole.y+setup.ry);
  assert.ok(points[threadEnd].y>setup.hole.y+setup.ry);
  assert.ok(contact.y<setup.hole.y);
});

test('hole follows full rigid-body rotation with no scroll input',()=>{
  const a=threadCounterPath(setup);
  const rotate=Math.PI*.44;
  const b=threadCounterPath({...setup,angle:rotate});
  assert.equal(a.points.length,b.points.length);
  const aC=a.points[25],bC=b.points[25];
  assert.ok(Math.hypot(aC.x-bC.x,aC.y-bC.y)>5);
  assert.ok(b.points.every(p=>Number.isFinite(p.x+p.y+p.z)));
});

test('spring with shrinking rope can evolve continuously without snap or NaN',()=>{
  const body=new HangingRigidBody({mass:2.2,inertia:2200,attachment:{x:88,y:12},
    ropeLength:620,ropeStiffness:220,ropeDamping:44,gravity:850,
    airDamping:.42,angularDamping:1.25});
  body.reset({x:210,y:-200});
  let previous={...body.position};
  for(let frame=0;frame<2400;frame++){
    const t=Math.min(1,frame/600),s=t*t*(3-2*t);
    body.ropeLength=620+(250-620)*s;
    body.attachment={x:88*(1-.6*s),y:12*(1-.6*s)};
    const breeze=Math.sin(frame/71)*31;
    body.step(1/240,{x:-250,y:230},{windX:breeze});
    assert.ok(Number.isFinite(body.position.x+body.position.y+body.angle));
    assert.ok(Math.hypot(body.position.x-previous.x,body.position.y-previous.y)<11,
      'no teleport at shrinking/handoff');
    previous={...body.position};
  }
});

test('title animation is not controlled by scroll position or release threshold',()=>{
  const text=readFileSync(new URL('../title-hover.js',import.meta.url),'utf8');
  assert.equal(text.includes("window.addEventListener('dx:bag-scroll'"),false);
  assert.equal(text.includes('dropStartAt'),false);
  assert.equal(text.includes('bodyState.released'),false);
  assert.match(text,/if\(!document\.hidden\)schedule\(\)/);
});
