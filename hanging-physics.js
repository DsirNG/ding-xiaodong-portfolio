/**
 * 2-D rigid-body dynamics in the orthographic XY plane (screen pixels, +Y up).
 * The rendered object is a genuine extruded 3-D mesh; only its motion is constrained
 * to the plane of the landing page. The lanyard is unilateral: it can pull but
 * cannot push. A force applied at an offset wrap point creates a real torque.
 *
 * No predetermined rotation angles or positional springs to arbitrary UI targets.
 */
export const rotate2 = (p, angle) => ({
  x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
  y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
});
const limit = (v, max) => Math.max(-max, Math.min(max, v));

export class HangingRigidBody {
  constructor({ mass, inertia, attachment, ropeLength, gravity = 1000,
    ropeStiffness = 170, ropeDamping = 24, airDamping = .27, angularDamping = .9 }) {
    this.mass = Math.max(.1, mass);
    this.inertia = Math.max(100, inertia);
    this.attachment = { ...attachment };
    this.ropeLength = Math.max(30, ropeLength);
    this.gravity = gravity;
    this.ropeStiffness = ropeStiffness;
    this.ropeDamping = ropeDamping;
    this.airDamping = airDamping;
    this.angularDamping = angularDamping;
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.angle = 0;
    this.angularVelocity = 0;
    this.tension = 0;
    this.drag = null;
  }
  point(local) {
    const r = rotate2(local, this.angle);
    return { x: this.position.x + r.x, y: this.position.y + r.y };
  }
  pointVelocity(local) {
    const r = rotate2(local, this.angle);
    return { x: this.velocity.x - this.angularVelocity * r.y,
      y: this.velocity.y + this.angularVelocity * r.x };
  }
  setDrag(pointer, localPoint) {
    this.drag = { pointer: { ...pointer }, localPoint: { ...localPoint } };
  }
  moveDrag(pointer) { if (this.drag) this.drag.pointer = { ...pointer }; }
  stopDrag() { this.drag = null; }
  reset(position, angle = 0) {
    this.position = { ...position };
    this.velocity.x = this.velocity.y = 0;
    this.angle = angle;
    this.angularVelocity = 0;
    this.tension = 0;
  }
  step(dt, anchor, { windX = 0, windY = 0 } = {}) {
    // Semi-implicit Euler and fixed small substeps supplied by the scene director.
    let fx = -this.velocity.x * this.mass * this.airDamping + windX * this.mass;
    let fy = -this.mass * this.gravity - this.velocity.y * this.mass * this.airDamping + windY * this.mass;
    let torque = -this.angularVelocity * this.inertia * this.angularDamping;
    const forceAt = (forceX, forceY, local) => {
      fx += forceX; fy += forceY;
      const r = rotate2(local, this.angle);
      torque += r.x * forceY - r.y * forceX;
    };

    const attach = this.point(this.attachment);
    const dx = attach.x - anchor.x, dy = attach.y - anchor.y;
    const distance = Math.max(1e-5, Math.hypot(dx, dy));
    const extension = distance - this.ropeLength;
    const v = this.pointVelocity(this.attachment);
    const radialSpeed = (v.x * dx + v.y * dy) / distance;
    if (extension > 0) {
      // Dashpot responds to radial velocity only. Cord is never in compression.
      const tension = Math.max(0, this.ropeStiffness * extension + this.ropeDamping * radialSpeed);
      this.tension = Math.min(tension, 24000);
      forceAt(-dx / distance * this.tension, -dy / distance * this.tension, this.attachment);
    } else this.tension = 0;

    if (this.drag) {
      const { pointer, localPoint } = this.drag;
      const grabbed = this.point(localPoint);
      const vel = this.pointVelocity(localPoint);
      const stiffness = 170 * this.mass;
      const damping = 22 * this.mass;
      let px = (pointer.x - grabbed.x) * stiffness - vel.x * damping;
      let py = (pointer.y - grabbed.y) * stiffness - vel.y * damping;
      const norm = Math.hypot(px, py);
      const cap = 18000 * this.mass;
      if (norm > cap) { px *= cap / norm; py *= cap / norm; }
      forceAt(px, py, localPoint);
    }

    this.velocity.x = limit(this.velocity.x + (fx / this.mass) * dt, 1800);
    this.velocity.y = limit(this.velocity.y + (fy / this.mass) * dt, 1800);
    this.angularVelocity = limit(this.angularVelocity + (torque / this.inertia) * dt, 12);
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.angle += this.angularVelocity * dt;
    // Keep angles in a compact numerical range; unrestricted full rotations allowed.
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    if (this.angle < -Math.PI * 2) this.angle += Math.PI * 2;
  }
}

/**
 * Triangle area moments. Supply (possibly disconnected) glyph cap triangles.
 * Distinct letters are treated as one glued rigid object, with constant thickness
 * and density. This is a planar mass approximation, not a full 3-D inertia tensor.
 */
export function calculatePlanarMass(triangles) {
  let area = 0, sx = 0, sy = 0, polarAboutZero = 0;
  for (const [a, b, c] of triangles) {
    const twice = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    const mass = twice * .5;
    if (mass < 1e-8) continue;
    const x = (a.x + b.x + c.x) / 3;
    const y = (a.y + b.y + c.y) / 3;
    area += mass; sx += mass * x; sy += mass * y;
    // Integral(r^2 dA) for a triangle; exact for uniform area density.
    const xx = a.x*a.x+b.x*b.x+c.x*c.x+a.x*b.x+b.x*c.x+c.x*a.x;
    const yy = a.y*a.y+b.y*b.y+c.y*c.y+a.y*b.y+b.y*c.y+c.y*a.y;
    polarAboutZero += mass * (xx+yy) / 6;
  }
  if (area < 1e-8) return { area: 1, center: {x:0,y:0}, unitInertia: 1 };
  const center = { x: sx / area, y: sy / area };
  return { area, center,
    unitInertia: Math.max(.01, polarAboutZero / area - center.x**2 - center.y**2) };
}
