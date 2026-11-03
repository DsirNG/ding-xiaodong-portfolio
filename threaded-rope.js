/**
 * Counter-thread rope geometry, in world screen units (+Y up).
 * The rope goes OVER the glyph's upper shoulder, DOWN INTO its counter,
 * curls around the INNER lower wall and comes out on the other side.
 * Two free spans terminate on the same global attachment ring.
 * It deliberately does not cut a straight line through the letter's stroke.
 *
 * Approximates the 3-D counter and contact with a shaped guide, rather than
 * doing mesh/cord continuous collision. The rigid-body receives force at the
 * lower inner counter contact, from the independent spring physics solver.
 */
export const AIR_SAMPLES = 18;
export const THREAD_SAMPLES = 36;
export const TOTAL_SAMPLES = AIR_SAMPLES * 2 + THREAD_SAMPLES;

const mix = (a,b,t)=>a+(b-a)*t;
const clamp = (x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const bezier = (a,b,c,t) => ({
  x: mix(mix(a.x,b.x,t),mix(b.x,c.x,t),t),
  y: mix(mix(a.y,b.y,t),mix(b.y,c.y,t),t),
  z: mix(mix(a.z,b.z,t),mix(b.z,c.z,t),t)
});
const quadratic = (a,b,c,n)=>Array.from({length:n+1},(_,i)=>bezier(a,b,c,i/n));

function catmullPoint(points, t){
  const u=clamp(t,0,1)*(points.length-1), j=Math.min(points.length-2,Math.floor(u));
  const p0=points[Math.max(0,j-1)],p1=points[j],p2=points[j+1],p3=points[Math.min(points.length-1,j+2)];
  const f=u-j,f2=f*f,f3=f2*f;
  const c=(key)=>.5*((2*p1[key])+(-p0[key]+p2[key])*f+
    (2*p0[key]-5*p1[key]+4*p2[key]-p3[key])*f2+
    (-p0[key]+3*p1[key]-3*p2[key]+p3[key])*f3);
  return {x:c('x'),y:c('y'),z:c('z')};
}

export function threadCounterPath({anchor,hole,angle=0,rx,ry,topRise,
  zFront=42,zBack=zFront-50,zAnchor=43}){
  // Depth must be measured against the ACTUAL transformed glyph. These are
  // world-space Z values: camera is on +Z, so zFront is nearer than zBack.
  // Back runs stay BEHIND the solid 3-D letters and remain visible only
  // through the real counter opening. Never use a fixed -25 Z offset.
  rx=Math.max(3,rx);ry=Math.max(4,ry);
  topRise=Math.max(ry*1.17,topRise);
  zBack=Math.min(zBack,zFront-5);
  const ca=Math.cos(angle),sa=Math.sin(angle);
  const around=(x,y,z)=>({x:hole.x+x*ca-y*sa,y:hole.y+x*sa+y*ca,z});
  const start={x:anchor.x-3,y:anchor.y,z:zAnchor};
  const finish={x:anchor.x+3,y:anchor.y,z:zAnchor};
  // The *exterior* lip must be above the upper inner-hole wall.
  const shoulderLeft=around(-rx*.88,topRise*1.02,zFront);
  const shoulderRight=around(rx*.90,topRise*.95,zFront);
  // Over the upper shoulder, into the counter, then behind the solid
  // letter. The rear segment is truly BEHIND its furthest back surface.
  // Opaque glyph depth-writing therefore hides the rear segment wherever
  // it crosses solid strokes, while preserving the actual transparent hole.
  const thread=[
    shoulderLeft,
    around(-rx*.95,topRise*.78,zFront),
    around(-rx*.72,ry*.93,zFront),
    around(-rx*.52,ry*.47,mix(zFront,zBack,.20)),
    around(-rx*.43,-ry*.05,mix(zFront,zBack,.77)),
    around(-rx*.20,-ry*.53,zBack),
    around(0,-ry*.75,zBack),
    around(rx*.52,-ry*.35,zBack),
    around(rx*.65,ry*.40,mix(zBack,zFront,.48)),
    around(rx*.72,ry*.86,zFront),
    around(rx*.87,topRise*.73,zFront),
    shoulderRight
  ];
  const first=quadratic(start,{
    x:mix(start.x,shoulderLeft.x,.60)-rx*.11,
    y:Math.max(start.y,shoulderLeft.y)+ry*.18,
    z:Math.max(zAnchor,zFront)+1
  },shoulderLeft,AIR_SAMPLES);
  const middle=Array.from({length:THREAD_SAMPLES+1},(_,i)=>catmullPoint(thread,i/THREAD_SAMPLES));
  const last=quadratic(shoulderRight,{
    x:mix(finish.x,shoulderRight.x,.62)+rx*.15,
    y:Math.max(finish.y,shoulderRight.y)+ry*.14,
    z:Math.max(zAnchor,zFront)+1
  },finish,AIR_SAMPLES);
  const points=[...first,...middle.slice(1),...last.slice(1)];
  return {points, threadStart:AIR_SAMPLES,threadEnd:AIR_SAMPLES+THREAD_SAMPLES,
    contact:around(0,-ry*.75,zBack)};
}
