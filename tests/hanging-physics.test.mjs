import test from 'node:test';
import assert from 'node:assert/strict';
import { HangingRigidBody, calculatePlanarMass } from '../hanging-physics.js';

test('rectangular cap triangles have correct mass centre and inertia', () => {
  const shape = [
    [{x:0,y:0},{x:2,y:0},{x:2,y:1}],
    [{x:0,y:0},{x:2,y:1},{x:0,y:1}],
  ];
  const properties = calculatePlanarMass(shape);
  assert.ok(Math.abs(properties.area-2) < 1e-8);
  assert.ok(Math.abs(properties.center.x-1) < 1e-8);
  assert.ok(Math.abs(properties.center.y-.5) < 1e-8);
  assert.ok(Math.abs(properties.unitInertia-5/12) < 1e-8);
});

test('cord cannot exert compressive force', () => {
  const body = new HangingRigidBody({mass:1,inertia:3000,attachment:{x:0,y:0},ropeLength:180});
  body.reset({x:0,y:-40});
  body.step(1/120,{x:0,y:0});
  assert.equal(body.tension,0);
});

test('off-centre g attachment makes Ding rotate with left side down', () => {
  const body = new HangingRigidBody({
    mass:2,inertia:12000,attachment:{x:78,y:30},
    ropeLength:200,ropeStiffness:270,ropeDamping:38,gravity:940,angularDamping:1.1
  });
  body.reset({x:-30,y:-200});
  for(let i=0;i<180;i++)body.step(1/120,{x:0,y:0});
  assert.ok(body.angle>.5, `expected counterclockwise body rotation, got ${body.angle}`);
  assert.ok(body.tension>0);
});

test('left attachment rotates body in the opposite direction', () => {
  const body = new HangingRigidBody({
    mass:2,inertia:12000,attachment:{x:-78,y:30},
    ropeLength:200,ropeStiffness:270,ropeDamping:38,gravity:940,angularDamping:1.1
  });
  body.reset({x:30,y:-200});
  for(let i=0;i<180;i++)body.step(1/120,{x:0,y:0});
  assert.ok(body.angle<-.5, `expected clockwise body rotation, got ${body.angle}`);
});

test('mouse grab induces torque and then releases without NaN', () => {
  const body = new HangingRigidBody({mass:2,inertia:5000,attachment:{x:35,y:25},ropeLength:145});
  body.reset({x:0,y:-140});
  body.setDrag({x:80,y:-200},{x:-45,y:0});
  for(let i=0;i<100;i++) body.step(1/120,{x:0,y:0});
  assert.ok(Math.abs(body.angle)>.03, `no drag-induced rotation: ${body.angle}`);
  body.stopDrag();
  for(let i=0;i<2000;i++) body.step(1/120,{x:0,y:0});
  assert.ok([body.angle,body.position.x,body.position.y,body.angularVelocity].every(Number.isFinite));
  assert.equal(body.drag,null);
});
