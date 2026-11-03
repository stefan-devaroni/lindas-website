// Linda's "From Scratch" scroll story. One 3D kitchen; scrolling moves a timeline from 0 to 12:
// flour, egg, milk, whisk, bacon + apple in the pan, batter, cooking, flip, plate, server.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const END = 12;
const canvas = document.getElementById('stage');
const isPhone = matchMedia('(max-width: 640px)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-gl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIn = (t) => t * t * t;
const prog = (t, s, d) => clamp((t - s) / d);
const TAU = Math.PI * 2;
const col = (h) => new THREE.Color(h);
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// keyframes [[time, value], ...], smoothstep between keys; value may be an array
function kf(t, keys, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], e = (keys[i][2] || ease)((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((v, k) => lerp(v, b[k], e)) : lerp(a, b, e);
  }
  return keys[keys.length - 1][1];
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, ...o });
function shadowy(obj, cast = true, recv = true) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; } }); return obj; }
function lathe(pts, seg = 64) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); }
function softDot() {
  return canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
}

// ---------- scene, light ----------
const scene = new THREE.Scene();
scene.background = col('#F1EAD1');
scene.fog = new THREE.Fog(col('#F1EAD1'), 30, 70);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(col('#FFF6E4'), col('#B89A70'), 0.9));
const sun = new THREE.DirectionalLight(col('#FFE6BE'), 2.4);
sun.position.set(-6, 14, 9); sun.castShadow = true;
sun.shadow.mapSize.set(isPhone ? 1024 : 2048, isPhone ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(col('#CFE8FF'), 0.5); fill.position.set(8, 5, 6); scene.add(fill);
const flameLight = new THREE.PointLight(col('#4FA3FF'), 0, 4, 2); flameLight.position.set(6, -0.3, 0); scene.add(flameLight);

// ---------- kitchen set ----------
// 1 unit = 10 cm. Counter top at y = 0, floor at y = -9, Delft tile wall at z = -4.
function delftTex() {
  const r = rng(3);
  return canvasTex(512, 512, (x, w) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = i * s, y0 = j * s, cx = x0 + s / 2, cy = y0 + s / 2;
      x.fillStyle = '#F8F6F0'; x.fillRect(x0, y0, s, s);
      x.strokeStyle = 'rgba(160,150,130,0.55)'; x.lineWidth = 3; x.strokeRect(x0 + 1.5, y0 + 1.5, s - 3, s - 3);
      x.strokeStyle = '#2E5FA8'; x.fillStyle = '#2E5FA8'; x.lineWidth = 2.5;
      // corner ornaments
      for (const [ox, oy] of [[0, 0], [s, 0], [0, s], [s, s]]) { x.beginPath(); x.arc(x0 + ox, y0 + oy, 9, 0, TAU); x.stroke(); }
      const kind = (i + j * 3) % 4;
      x.save(); x.translate(cx, cy); x.globalAlpha = 0.85;
      if (kind === 0) { // windmill
        x.beginPath(); x.moveTo(-9, 26); x.lineTo(-5, -6); x.lineTo(5, -6); x.lineTo(9, 26); x.closePath(); x.fill();
        for (let k = 0; k < 4; k++) { x.save(); x.translate(0, -8); x.rotate(k * Math.PI / 2 + 0.4); x.fillRect(-2, -30, 4, 26); x.restore(); }
        x.fillRect(-30, 26, 60, 3);
      } else if (kind === 1) { // tulip
        x.beginPath(); x.moveTo(0, 30); x.quadraticCurveTo(-4, 10, 0, -4); x.stroke();
        x.beginPath(); x.moveTo(-12, -6); x.quadraticCurveTo(-13, -26, -6, -22); x.lineTo(0, -30); x.lineTo(6, -22); x.quadraticCurveTo(13, -26, 12, -6); x.quadraticCurveTo(0, 2, -12, -6); x.fill();
        x.beginPath(); x.ellipse(-9, 14, 4, 10, -0.6, 0, TAU); x.fill();
      } else if (kind === 2) { // sailing boat
        x.beginPath(); x.moveTo(-24, 14); x.lineTo(24, 14); x.lineTo(16, 24); x.lineTo(-16, 24); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(-2, 12); x.lineTo(-2, -28); x.lineTo(-22, 10); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(2, 12); x.lineTo(2, -22); x.lineTo(18, 10); x.closePath(); x.fill();
        for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-30 + k * 22, 30); x.quadraticCurveTo(-24 + k * 22, 26, -18 + k * 22, 30); x.stroke(); }
      } else { // flower rosette
        for (let k = 0; k < 8; k++) { x.save(); x.rotate(k * Math.PI / 4); x.beginPath(); x.ellipse(0, -14, 5, 11, 0, 0, TAU); x.fill(); x.restore(); }
        x.fillStyle = '#F8F6F0'; x.beginPath(); x.arc(0, 0, 5, 0, TAU); x.fill();
      }
      x.restore();
      x.fillStyle = `rgba(120,110,80,${0.02 + r() * 0.04})`; x.fillRect(x0, y0, s, s);
    }
  });
}
function woodTex(base, dark) {
  const r = rng(31), w = 1024, h = 1024;
  return canvasTex(w, h, (x) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const planks = 8;
    for (let p = 0; p < planks; p++) {
      const y0 = p * h / planks; x.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.06})`; x.fillRect(0, y0, w, h / planks);
      for (let k = 0; k < 22; k++) { x.strokeStyle = `rgba(90,50,20,${0.04 + r() * 0.08})`; x.lineWidth = 1 + r() * 3; x.beginPath(); const yy = y0 + r() * h / planks; x.moveTo(0, yy); for (let xx = 0; xx <= w; xx += 64) x.lineTo(xx, yy + Math.sin(xx / 90 + k) * 4); x.stroke(); }
      x.fillStyle = dark; x.fillRect(0, y0, w, 4);
    }
  });
}
{
  const wt = delftTex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(12, 4);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(64, 22), std('#FFFFFF', { map: wt, roughness: 0.25 }));
  wall.position.set(8, 2, -4.5); wall.receiveShadow = true; scene.add(wall);
  const top = woodTex('#C89B6A', '#8A5E36'); top.wrapS = top.wrapT = THREE.RepeatWrapping; top.repeat.set(3, 1);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 8.6), std('#FFFFFF', { map: top, roughness: 0.45 }));
  counter.position.set(5.5, -0.3, -0.2); counter.receiveShadow = true; scene.add(counter);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(29.6, 8.4, 8), std('#27AAE1', { roughness: 0.5 }));
  cab.position.set(5.5, -4.8, -0.4); cab.receiveShadow = true; scene.add(cab);
  for (let i = 0; i < 6; i++) { // cabinet doors
    const d = new THREE.Mesh(new THREE.BoxGeometry(4.4, 7, 0.12), std('#3BB5E8', { roughness: 0.45 })); d.position.set(-6.5 + i * 4.8, -4.9, 3.62); scene.add(d);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), std('#E8E2D0', { metalness: 0.6, roughness: 0.3 })); k.position.set(-6.5 + i * 4.8 + 1.6, -2.9, 3.75); scene.add(k);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), std('#E9DFC6', { roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(8, -9, 10); floor.receiveShadow = true; scene.add(floor);
}

// ---------- props on the counter ----------
// Bowl: white glaze with a blue band
const BOWL_IN = [[0, 0.1], [0.85, 0.12], [1.3, 0.45], [1.68, 0.9], [1.84, 1.3]];
const bowlRadiusAt = (y) => (y <= 0.12 ? 0.85 : y < 0.45 ? lerp(0.85, 1.3, (y - 0.12) / 0.33) : y < 0.9 ? lerp(1.3, 1.68, (y - 0.45) / 0.45) : lerp(1.68, 1.84, (y - 0.9) / 0.4));
const bowl = new THREE.Group(); scene.add(bowl);
{
  const glaze = canvasTex(1024, 256, (x, w, h) => {
    x.fillStyle = '#FBFAF6'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2E5FA8'; x.fillRect(0, h * 0.22, w, h * 0.08); x.fillRect(0, h * 0.36, w, h * 0.025);
    for (let i = 0; i < 16; i++) { x.beginPath(); x.arc((i + 0.5) * w / 16, h * 0.5, 9, 0, TAU); x.fill(); }
  });
  const outer = lathe([[0, 0], [0.8, 0], [0.95, 0.06], [1.42, 0.45], [1.8, 0.95], [1.95, 1.32], [1.92, 1.36]], 96);
  const inner = lathe([[1.92, 1.36], [1.84, 1.3], ...BOWL_IN.slice().reverse().slice(1)], 96);
  const mat = phys('#FFFFFF', { map: glaze, roughness: 0.18, clearcoat: 0.6, side: THREE.DoubleSide });
  bowl.add(new THREE.Mesh(outer, mat), new THREE.Mesh(inner, phys('#FBFAF6', { roughness: 0.15, clearcoat: 0.5, side: THREE.DoubleSide })));
  shadowy(bowl);
}
// What is inside the bowl
const heapMat = std('#F3EBD8', { roughness: 0.95, side: THREE.DoubleSide });
const heap = new THREE.Mesh(lathe([[0, 0.9], [0.35, 0.82], [0.75, 0.55], [1.05, 0.24], [1.2, 0.1], [1.25, 0.08]], 48), heapMat);
heap.receiveShadow = true; heap.castShadow = true; bowl.add(heap);
const liquidMat = std('#FFFFFF', { roughness: 0.25, transparent: true, opacity: 1 });
const liquid = new THREE.Mesh(new THREE.CircleGeometry(1, 64), liquidMat);
liquid.rotation.x = -Math.PI / 2; bowl.add(liquid);
// swirl texture on the batter while whisking
const swirlTex = canvasTex(512, 512, (x, w) => {
  x.fillStyle = '#F7E6B8'; x.fillRect(0, 0, w, w);
  x.strokeStyle = 'rgba(255,250,235,0.9)'; x.lineWidth = 7;
  for (let k = 0; k < 6; k++) { x.beginPath(); for (let a = 0; a < 7; a += 0.05) { const rr = 18 + a * 34 + k * 6; x.lineTo(w / 2 + Math.cos(a + k) * rr, w / 2 + Math.sin(a + k) * rr); } x.stroke(); }
});
const yolk = new THREE.Group(); bowl.add(yolk);
{
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), phys('#FFFFFF', { transmission: 0.5, transparent: true, opacity: 0.7, roughness: 0.1, thickness: 0.2 }));
  white.scale.set(1, 0.25, 1); yolk.add(white);
  const y = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), phys('#F7A21B', { roughness: 0.15, clearcoat: 1 })); y.scale.set(1, 0.7, 1); y.position.y = 0.07; yolk.add(y);
}

// Flour bag (kraft paper, "BLOEM" = flour in Dutch)
const bag = new THREE.Group(); scene.add(bag);
{
  const label = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#C9A57A'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(90,60,30,${Math.random() * 0.06})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    x.fillStyle = '#FBF7EE'; x.fillRect(60, 170, w - 120, 200);
    x.fillStyle = '#2E5FA8'; x.font = 'bold 92px Georgia, serif'; x.textAlign = 'center'; x.fillText('BLOEM', w / 2, 290);
    x.font = '28px Georgia, serif'; x.fillText('tarwebloem', w / 2, 340);
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.9), [std('#C9A57A', { roughness: 0.9 }), std('#C9A57A', { roughness: 0.9 }), std('#BF9A6E', { roughness: 0.9 }), std('#C9A57A'), std('#FFFFFF', { map: label, roughness: 0.9 }), std('#C9A57A')]);
  body.position.y = 1.1; bag.add(body);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), std('#BF9A6E', { roughness: 0.9 })); fold.position.set(0, 2.32, 0); bag.add(fold);
  shadowy(bag);
}
// Eggs
const eggShellMat = phys('#F3E2C8', { roughness: 0.45, clearcoat: 0.2 });
const eggGeo = new THREE.SphereGeometry(0.34, 32, 24); eggGeo.scale(1, 1.3, 1);
const egg = new THREE.Group(); scene.add(egg);
const shellTop = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, TAU, 0, Math.PI / 2), eggShellMat.clone());
const shellBot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), eggShellMat.clone());
shellTop.scale.set(1, 1.3, 1); shellBot.scale.set(1, 1.3, 1);
shellTop.material.side = shellBot.material.side = THREE.DoubleSide;
const shellTopG = new THREE.Group(), shellBotG = new THREE.Group(); shellTopG.add(shellTop); shellBotG.add(shellBot); egg.add(shellTopG, shellBotG);
shadowy(egg);
const spareEgg = shadowy(new THREE.Mesh(eggGeo, eggShellMat)); spareEgg.position.set(-3.3, 0.44, 1.4); spareEgg.rotation.z = 1.35; scene.add(spareEgg);
// Milk bottle
const milk = new THREE.Group(); scene.add(milk);
{
  const prof = [[0, 0], [0.62, 0], [0.66, 0.08], [0.66, 1.9], [0.5, 2.35], [0.3, 2.6], [0.3, 2.95]];
  const glass = new THREE.Mesh(lathe(prof, 48), phys('#FFFFFF', { transmission: 0.9, roughness: 0.05, thickness: 0.3, transparent: true, opacity: 0.35, ior: 1.5 }));
  const milkIn = new THREE.Mesh(lathe([[0, 0.05], [0.6, 0.05], [0.6, 1.85], [0.46, 2.25], [0, 2.25]], 48), std('#FFFFFF', { roughness: 0.3 }));
  const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.18, 32), std('#27AAE1', { roughness: 0.4 })); capM.position.y = 3.0;
  const lbl = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#FBF7EE'; x.fillRect(0, 0, w, h); x.fillStyle = '#2E5FA8'; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.fillText('MELK', w / 4, 88); x.fillText('MELK', w * 3 / 4, 88); });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.6, 48, 1, true), std('#FFFFFF', { map: lbl, roughness: 0.6 })); band.position.y = 1.0;
  milk.add(milkIn, glass, capM, band); shadowy(milk); glass.castShadow = false;
  milk.userData.cap = capM;
}
// Whisk
const whisk = new THREE.Group(); scene.add(whisk);
{
  const wire = std('#D9DDE2', { metalness: 1, roughness: 0.25 });
  for (let k = 0; k < 6; k++) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 40, Math.PI), wire);
    loop.scale.set(1, 2.4, 1); loop.rotation.z = Math.PI; loop.rotation.y = k * Math.PI / 6; loop.position.y = 1.0; whisk.add(loop);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 1.8, 16), std('#2E5FA8', { roughness: 0.4 })); grip.position.y = 1.9; whisk.add(grip);
  shadowy(whisk);
}
// Streams (flour, milk, batter), reused by moving and scaling
function makeStream(color, opacity = 1) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true), std(color, { roughness: 0.4, transparent: opacity < 1, opacity }));
  m.visible = false; scene.add(m); return m;
}
const flourStream = makeStream('#FFFFFF', 0.85);
const milkStream = makeStream('#FFFFFF');
const batterStream = makeStream('#F5DFA6');
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function placeStream(m, from, to, width) {
  _a.copy(from); _b.copy(to); const len = _a.distanceTo(_b);
  if (len < 0.01) { m.visible = false; return; }
  m.visible = true; m.position.copy(_a).add(_b).multiplyScalar(0.5);
  m.scale.set(width, len, width);
  m.quaternion.setFromUnitVectors(_up, _b.clone().sub(_a).normalize());
}

// ---------- stove + pan ----------
const PAN_X = 7;
const stove = new THREE.Group(); stove.position.set(PAN_X, 0, 0); scene.add(stove);
const flames = [];
{
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.16, 48), std('#2A2C30', { metalness: 0.6, roughness: 0.4 })); plate.position.y = 0.08; stove.add(shadowy(plate));
  const flameMat = new THREE.MeshBasicMaterial({ color: col('#6FB8FF'), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 8), flameMat); f.position.set(Math.cos(a) * 0.75, 0.3, Math.sin(a) * 0.75); stove.add(f); flames.push(f); }
}
const pan = new THREE.Group(); pan.position.set(PAN_X, 0.42, 0); scene.add(pan);
const PAN_R = 1.62;
{
  const pp = [[0, -0.06], [1.5, -0.06], [1.62, 0.0], [1.76, 0.32], [1.8, 0.36], [1.73, 0.36], [1.6, 0.06], [1.48, 0.0], [0, 0.0]];
  pan.add(new THREE.Mesh(lathe(pp, 96), std('#2A2B2F', { metalness: 0.7, roughness: 0.38 })));
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.7, 16), std('#2A2B2F', { metalness: 0.7, roughness: 0.4 })); handle.rotation.z = Math.PI / 2 - 0.12; handle.position.set(2.55, 0.34, 0); pan.add(handle);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 1.0, 20), std('#6B4127', { roughness: 0.5 })); grip.rotation.z = Math.PI / 2 - 0.12; grip.position.set(3.7, 0.48, 0); pan.add(grip);
  // a thin film of butter
  const butter = new THREE.Mesh(new THREE.CircleGeometry(1.48, 48), phys('#E8B23C', { roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.35 })); butter.rotation.x = -Math.PI / 2; butter.position.y = 0.006; pan.add(butter);
  shadowy(pan);
}
// Bacon strips and apple rings, laid out like we do
const baconTex = canvasTex(64, 512, (x, w, h) => {
  x.fillStyle = '#B5413A'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#F2C9B0'; x.fillRect(w * 0.18, 0, w * 0.12, h); x.fillRect(w * 0.62, 0, w * 0.2, h);
  x.fillStyle = '#8E2A26'; x.fillRect(w * 0.4, 0, w * 0.1, h);
});
const baconMats = [];
function baconStrip(len, seed) {
  const g = new THREE.PlaneGeometry(0.42, len, 1, 40), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, Math.sin(y * 4.2 + seed) * 0.05 + Math.sin(y * 9 + seed * 2) * 0.015); }
  g.computeVertexNormals();
  const m = std('#FFFFFF', { map: baconTex, roughness: 0.5, side: THREE.DoubleSide }); baconMats.push(m);
  const mesh = new THREE.Mesh(g, m); mesh.rotation.x = -Math.PI / 2; return mesh;
}
const appleMat = phys('#F3DE9C', { roughness: 0.35, clearcoat: 0.4 });
const peelMat = std('#B83A2E', { roughness: 0.4 });
function appleRing() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0.13, 0], [0.36, 0], [0.36, 0.06], [0.13, 0.06], [0.13, 0]], 40), appleMat));
  const peel = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.028, 6, 40), peelMat); peel.rotation.x = Math.PI / 2; peel.position.y = 0.03; g.add(peel);
  return g;
}
const fillings = [];
{
  const bacon = [[-0.75, 0.15, 2.3, 0.1], [0.0, -0.05, 2.6, 0.05], [0.75, 0.1, 2.3, -0.08]];
  bacon.forEach(([x, z, len, rot], i) => { const s = baconStrip(len, i * 1.7); const g = new THREE.Group(); g.add(s); g.position.set(x, 0.04, z); g.rotation.y = rot; pan.add(g); fillings.push({ g, home: g.position.clone(), delay: i * 0.12, kind: 'bacon' }); });
  const apples = [[-0.38, 0.65], [0.38, 0.62], [-0.38, -0.62], [0.4, -0.66], [-1.08, -0.45], [1.1, 0.45], [0, 1.1], [0, -1.15]];
  apples.forEach(([x, z], i) => { const g = appleRing(); g.position.set(x, 0.07, z); pan.add(g); fillings.push({ g, home: g.position.clone(), delay: 0.35 + i * 0.05, kind: 'apple' }); });
  fillings.forEach((f) => shadowy(f.g));
}

// ---------- the pancake ----------
// Top side: plain batter that browns and gets bubbles. Bottom side (shown after the flip): bacon + apple cooked in.
const PC_R = 1.5;
function pancakeTex(side) {
  const r = rng(side === 'top' ? 7 : 9);
  return canvasTex(1024, 1024, (x, w) => {
    const c = w / 2;
    const g = x.createRadialGradient(c * 0.9, c * 0.85, 30, c, c, c);
    g.addColorStop(0, '#F9D58E'); g.addColorStop(0.62, '#F2BF6A'); g.addColorStop(0.86, '#E3A04E'); g.addColorStop(0.95, '#C9803A'); g.addColorStop(1, '#A4612A');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 300; i++) { const a = r() * TAU, d = Math.pow(r(), 0.45) * c * 0.97, rad = (6 + r() * 36) * w / 1024, px = c + Math.cos(a) * d, py = c + Math.sin(a) * d, edge = d / c;
      const al = (0.04 + r() * 0.14) * (0.2 + edge * edge * 1.1); const gg = x.createRadialGradient(px, py, 0, px, py, rad);
      gg.addColorStop(0, `rgba(180,96,32,${al})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); }
    if (side === 'bottom') {
      const s = w / (2 * PC_R); // texture px per unit; mirror x because the pancake flips over x
      const toPx = (ux, uz) => [c - ux * s * -1, c + uz * s];
      for (const [bx, bz, len, rot] of [[-0.75, 0.15, 2.3, 0.1], [0, -0.05, 2.6, 0.05], [0.75, 0.1, 2.3, -0.08]]) {
        const [px, py] = toPx(bx, -bz); x.save(); x.translate(px, py); x.rotate(rot);
        x.fillStyle = '#7E2A1E'; x.fillRect(-0.2 * s, -len / 2 * s, 0.4 * s, len * s);
        x.fillStyle = 'rgba(232,170,110,0.9)'; x.fillRect(-0.12 * s, -len / 2 * s, 0.06 * s, len * s); x.fillRect(0.08 * s, -len / 2 * s, 0.08 * s, len * s);
        x.fillStyle = 'rgba(70,20,10,0.35)'; for (let k = 0; k < 14; k++) x.fillRect(-0.2 * s, (-len / 2 + k * len / 14) * s, 0.4 * s, 3);
        x.restore();
      }
      for (const [ax, az] of [[-0.38, 0.65], [0.38, 0.62], [-0.38, -0.62], [0.4, -0.66], [-1.08, -0.45], [1.1, 0.45], [0, 1.1], [0, -1.15]]) {
        const [px, py] = toPx(ax, -az);
        x.fillStyle = '#F6D58C'; x.beginPath(); x.arc(px, py, 0.36 * s, 0, TAU); x.arc(px, py, 0.13 * s, 0, TAU, true); x.fill();
        x.strokeStyle = '#A64A24'; x.lineWidth = 0.05 * s; x.beginPath(); x.arc(px, py, 0.36 * s, 0, TAU); x.stroke();
        x.strokeStyle = 'rgba(190,110,40,0.6)'; x.lineWidth = 0.04 * s; x.beginPath(); x.arc(px, py, 0.15 * s, 0, TAU); x.stroke();
      }
      // batter in between, a little lighter
      x.fillStyle = 'rgba(250,220,160,0.18)'; x.beginPath(); x.arc(c, c, c * 0.9, 0, TAU); x.fill();
    } else {
      for (let i = 0; i < 160; i++) { const a = r() * TAU, d = Math.pow(r(), 0.5) * c * 0.92, rr = (2 + r() * 5) * w / 1024;
        x.fillStyle = 'rgba(150,80,25,0.35)'; x.beginPath(); x.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, rr, 0, TAU); x.fill(); }
    }
    // lacy, crispy rim
    x.strokeStyle = 'rgba(120,60,20,0.55)'; x.lineWidth = 10; x.beginPath(); x.arc(c, c, c - 6, 0, TAU); x.stroke();
  });
}
const pancake = new THREE.Group(); scene.add(pancake);
const cookedTop = phys('#FFFFFF', { map: pancakeTex('top'), roughness: 0.5, sheen: 0.3, sheenColor: col('#FFE2A8'), envMapIntensity: 0.5, transparent: true, opacity: 0 });
const cookedBottom = phys('#FFFFFF', { map: pancakeTex('bottom'), roughness: 0.45, sheen: 0.3, sheenColor: col('#FFE2A8'), envMapIntensity: 0.5 });
const rawMat = phys('#F2D79A', { roughness: 0.2, clearcoat: 0.6, transparent: true, opacity: 0.92 });
{
  const wobble = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), rr = Math.hypot(x, y), wob = 1 + 0.02 * Math.sin(a * 5 + 1) + 0.01 * Math.sin(a * 13); if (rr > 0.01) { p.setX(i, x * wob); p.setY(i, y * wob); } } return g; };
  const top = new THREE.Mesh(wobble(new THREE.CircleGeometry(PC_R, 96)), cookedTop); top.rotation.x = -Math.PI / 2; top.position.y = 0.05;
  const bot = new THREE.Mesh(wobble(new THREE.CircleGeometry(PC_R, 96)), cookedBottom); bot.rotation.x = Math.PI / 2; bot.position.y = -0.0;
  const raw = new THREE.Mesh(wobble(new THREE.CircleGeometry(PC_R, 96)), rawMat); raw.rotation.x = -Math.PI / 2; raw.position.y = 0.06;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PC_R * 0.995, 0.03, 8, 96), std('#C98A45', { roughness: 0.6 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.025;
  pancake.add(top, bot, raw, rim); shadowy(pancake);
  pancake.userData = { top, bot, raw, rim };
}

// ---------- serving plate ----------
const PLATE_X = 13;
const plate = new THREE.Group(); scene.add(plate);
{
  const pp = [[0, 0.02], [1.15, 0.02], [1.25, 0.0], [1.5, 0.06], [2.05, 0.2], [2.16, 0.24], [2.15, 0.27], [2.0, 0.24], [1.45, 0.11], [1.2, 0.06], [0, 0.06]];
  const m = new THREE.Mesh(lathe(pp, 96), phys('#FFFFFF', { roughness: 0.12, clearcoat: 0.8 }));
  plate.add(m); shadowy(plate);
}
// powdered sugar
const sugarN = 500, sugarPos = new Float32Array(sugarN * 3), sugarSeed = [];
{ const r = rng(77); for (let i = 0; i < sugarN; i++) sugarSeed.push([Math.sqrt(r()) * 1.35, r() * TAU, 3 + r() * 2.5, r()]); }
const sugarGeo = new THREE.BufferGeometry(); sugarGeo.setAttribute('position', new THREE.BufferAttribute(sugarPos, 3));
const sugar = new THREE.Points(sugarGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, map: softDot(), transparent: true, depthWrite: false }));
sugar.frustumCulled = false; scene.add(sugar);
const sugarLayer = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, map: canvasTex(512, 512, (x, w) => { const r = rng(5); x.clearRect(0, 0, w, w); for (let i = 0; i < 3000; i++) { const a = r() * TAU, d = Math.sqrt(r()) * w / 2; x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; x.fillRect(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 2, 2); } }), transparent: true, opacity: 0, depthWrite: false, roughness: 1 }));
sugarLayer.rotation.x = -Math.PI / 2; scene.add(sugarLayer);

// ---------- puffs, steam, bubbles ----------
function puffSystem(n, color, size) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, depthWrite: false, opacity: 0 });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; scene.add(p);
  const r = rng(n + size * 100); const seeds = Array.from({ length: n }, () => [r() * TAU, r(), r(), r()]);
  return { p, pos, seeds };
}
const flourPuff = puffSystem(160, 0xffffff, 0.35);
const steam = puffSystem(70, 0xffffff, 1.3);
const sizzle = puffSystem(90, 0xfff3d0, 0.08);

// ---------- the server ----------
function eyeTex() {
  return canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#FFFDF8'; x.fillRect(0, 0, w, h);
    const cx = 128, cy = 128, ri = 60, rp = 28;
    const g = x.createRadialGradient(cx, cy, 6, cx, cy, ri); g.addColorStop(0, '#9A6A3E'); g.addColorStop(0.55, '#5A3418'); g.addColorStop(1, '#2C170A');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, ri, 0, TAU); x.fill();
    x.fillStyle = '#0A0605'; x.beginPath(); x.arc(cx, cy, rp, 0, TAU); x.fill();
  });
}
const server = new THREE.Group(); scene.add(server);
const S = {};
{
  const skin = phys('#B9784F', { roughness: 0.55, sheen: 0.4, sheenColor: col('#FFC9A0'), envMapIntensity: 0.4 });
  const shirt = std('#27AAE1', { roughness: 0.7 });
  const pants = std('#2B2A33', { roughness: 0.8 });
  const shoe = std('#F2F0EA', { roughness: 0.6 });
  const hairMat = std('#2A1A12', { roughness: 0.55 });
  const logoTex = new THREE.TextureLoader().load('../assets/logos/logo-blue.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; });
  // hips at y = -1.2 (counter top is 0, floor -9)
  const hips = new THREE.Group(); hips.position.y = -1.2; server.add(hips); S.hips = hips;
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.75, 0, 0); hips.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.2, 6, 16), pants); thigh.position.y = -2.0; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -3.9; hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 3.0, 6, 16), pants); shin.position.y = -1.8; knee.add(shin);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.8, 6, 12), shoe); foot.rotation.x = Math.PI / 2; foot.position.set(0, -3.65, 0.4); knee.add(foot);
    legs.push({ hip, knee });
  }
  S.legs = legs;
  const torso = new THREE.Group(); hips.add(torso); S.torso = torso;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(1.45, 3.4, 8, 24), shirt); chest.position.y = 2.4; chest.scale.set(1, 1, 0.72); torso.add(chest);
  // white apron with the logo
  const apronTex = canvasTex(512, 640, (x, w, h) => { x.fillStyle = '#FBFAF6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#D9D4C6'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28); });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), std('#FFFFFF', { map: apronTex, roughness: 0.85 })); apron.position.set(0, 0.6, 1.09); torso.add(apron);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.8 })); logo.position.set(0, 1.05, 1.1); torso.add(logo);
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 16), skin); neck.position.y = 5.25; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 6.75; torso.add(head); S.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.35, 48, 32), skin); skull.scale.set(1, 1.08, 1); head.add(skull);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin); nose.position.set(0, -0.12, 1.33); nose.scale.set(1.1, 0.85, 0.75); head.add(nose);
  for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(sx * 1.33, 0, 0); head.add(ear); }
  // hair: cap + bun
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.42, 48, 24, 0, TAU, 0, Math.PI * 0.5), hairMat); cap.scale.set(1.02, 1.1, 1.04); cap.rotation.x = -0.62; cap.position.set(0, 0.1, -0.12); head.add(cap);
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), hairMat); fringe.scale.set(1.25, 0.42, 0.7); fringe.position.set(-0.45, 1.02, 0.78); fringe.rotation.set(0.35, 0, 0.32); head.add(fringe);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 16), hairMat); bun.position.set(0, 0.75, -1.35); head.add(bun);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 24), std('#27AAE1', { roughness: 0.4 })); tie.position.set(0, 0.62, -1.06); tie.rotation.x = 0.9; head.add(tie);
  // eyes
  const eyeMat = phys('#FFFFFF', { map: eyeTex(), roughness: 0.1, clearcoat: 1 });
  const lidMat = skin.clone();
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  S.eyes = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 0.5, 0.2, 1.02); head.add(g);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), eyeMat); g.add(ball);
    const up = new THREE.Group(), lo = new THREE.Group(); g.add(up, lo);
    up.add(new THREE.Mesh(new THREE.SphereGeometry(0.315, 32, 16, 0, TAU, 0, Math.PI / 2), lidMat));
    lo.add(new THREE.Mesh(new THREE.SphereGeometry(0.31, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), lidMat));
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.026, 6, 32, Math.PI), hairMat); lash.rotation.set(Math.PI / 2, Math.PI / 2, 0, 'YXZ'); up.add(lash);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), shine); s1.position.set(0.09, 0.1, 0.27); g.add(s1);
    S.eyes.push({ up, lo, sx, s1, ball });
    const browCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.22, -0.02, 0), new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(0.22, -0.02, 0));
    const brow = new THREE.Mesh(new THREE.TubeGeometry(browCurve, 12, 0.045, 8, false), hairMat); brow.position.set(sx * 0.52, 0.66, 1.16); brow.rotation.z = sx * -0.12; head.add(brow);
  }
  // mouth (rebuilt when the smile changes)
  const mouth = new THREE.Group(); mouth.position.set(0, -0.48, 1.27); head.add(mouth);
  const lipMat = std('#7A2E22', { roughness: 0.5 }), innerMat = std('#5E1A16', { roughness: 0.8 }), teethMat = std('#FFFDF7', { roughness: 0.3 });
  const mClosed = new THREE.Mesh(new THREE.BufferGeometry(), lipMat), mOpen = new THREE.Mesh(new THREE.BufferGeometry(), innerMat), teeth = new THREE.Mesh(new THREE.BufferGeometry(), teethMat);
  mouth.add(mClosed, mOpen, teeth); mouth.rotation.x = -0.2;
  let lastKey = '';
  S.setSmile = (smile, open) => {
    const key = smile.toFixed(2) + open.toFixed(2); if (key === lastKey) return; lastKey = key;
    const wd = 0.38 + smile * 0.08;
    [mClosed, mOpen, teeth].forEach((m) => m.geometry.dispose());
    if (open < 0.05) {
      mClosed.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-wd, 0.05 * smile, 0), new THREE.Vector3(0, -0.2 * smile, 0), new THREE.Vector3(wd, 0.05 * smile, 0)), 24, 0.04, 8, false);
      mOpen.geometry = new THREE.BufferGeometry(); teeth.geometry = new THREE.BufferGeometry();
    } else {
      const dep = 0.12 + 0.28 * open, s = new THREE.Shape();
      s.moveTo(-wd, 0.06 * smile); s.quadraticCurveTo(0, -0.02, wd, 0.06 * smile); s.quadraticCurveTo(wd * 0.85, -dep, 0, -dep * 1.1); s.quadraticCurveTo(-wd * 0.85, -dep, -wd, 0.06 * smile);
      mOpen.geometry = new THREE.ShapeGeometry(s, 24);
      const tsh = new THREE.Shape(); tsh.moveTo(-wd * 0.86, 0.03 * smile); tsh.quadraticCurveTo(0, -0.03, wd * 0.86, 0.03 * smile); tsh.lineTo(wd * 0.7, -dep * 0.32); tsh.quadraticCurveTo(0, -dep * 0.42, -wd * 0.7, -dep * 0.32); tsh.closePath();
      teeth.geometry = new THREE.ShapeGeometry(tsh, 16); teeth.position.z = 0.006;
      mClosed.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0.01)), true), 60, 0.03, 6, true);
    }
  };
  const cheekMat = new THREE.MeshStandardMaterial({ color: '#E2725F', transparent: true, opacity: 0.25, roughness: 0.9, depthWrite: false });
  for (const sx of [-1, 1]) { const ck = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), cheekMat); ck.position.set(sx * 0.82, -0.28, 1.08); ck.rotation.y = sx * 0.62; head.add(ck); }
  // arms: shoulder -> elbow -> hand
  S.arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 1.6, 4.3, 0); torso.add(sh);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.7, 6, 16), shirt); sleeve.position.y = -0.5; sh.add(sleeve);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.6, 6, 16), skin); upper.position.y = -1.3; sh.add(upper);
    const el = new THREE.Group(); el.position.y = -2.35; sh.add(el);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.6, 6, 16), skin); fore.position.y = -1.1; el.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), skin); hand.scale.set(0.8, 1, 0.55); hand.position.y = -2.15; el.add(hand);
    S.arms.push({ sh, el, sx });
  }
  shadowy(server);
  cheekMat && server.traverse((o) => { if (o.material === cheekMat) o.castShadow = false; });
}
function poseServer(p) {
  server.position.set(...p.pos); server.rotation.y = p.yaw;
  const sw = Math.sin(p.walk * TAU) * p.stride;
  S.legs[0].hip.rotation.x = sw; S.legs[1].hip.rotation.x = -sw;
  S.legs[0].knee.rotation.x = Math.max(0, -sw) * 1.2 + 0.05; S.legs[1].knee.rotation.x = Math.max(0, sw) * 1.2 + 0.05;
  S.hips.position.y = -1.2 + Math.abs(Math.cos(p.walk * TAU)) * 0.25 * (p.stride > 0.05 ? 1 : 0);
  S.torso.rotation.x = p.lean ?? 0;
  for (const a of S.arms) {
    const carry = p.carry;
    a.sh.rotation.x = lerp(-sw * a.sx * 0.5 * 0, -0.15, 0) + lerp(a.sx * sw * 0.45, -0.55, carry);
    a.sh.rotation.z = a.sx * lerp(0.12, 0.28, carry);
    a.el.rotation.x = lerp(-0.15, -1.25, carry);
  }
  S.head.rotation.set(p.nod ?? 0, p.look ?? 0, p.tilt ?? 0);
  for (const e of S.eyes) {
    const happy = p.happy ?? 0;
    e.up.rotation.x = lerp(-0.85, -0.62, happy);
    e.lo.rotation.x = lerp(1.0, 0.52, happy);
    e.s1.visible = happy < 0.95;
  }
  S.setSmile(p.smile, p.open);
}

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
// [t, [px,py,pz], [tx,ty,tz]]
const CAM = [
  [0.0, [1.5, 7.5, 15], [2.5, 0.6, 0]],
  [0.9, [0.2, 5.2, 8.8], [0, 1.0, 0]],
  [2.0, [-1.0, 5.0, 8.6], [0, 1.4, 0]],
  [3.0, [1.2, 5.0, 8.4], [0.2, 1.1, 0]],
  [4.0, [0.0, 6.4, 7.0], [0, 0.7, 0]],
  [4.95, [0.0, 6.6, 6.6], [0, 0.6, 0]],
  [5.4, [PAN_X, 6.2, 7.2], [PAN_X, 0.4, 0]],
  [6.2, [PAN_X - 1.6, 7.4, 10.8], [PAN_X - 0.9, 1.0, 0]],
  [7.15, [PAN_X - 0.6, 6.8, 6.4], [PAN_X, 0.4, 0]],
  [8.15, [PAN_X, 7.4, 5.0], [PAN_X, 0.4, 0]],
  [8.45, [PAN_X, 4.6, 9.6], [PAN_X, 2.3, 0]],
  [9.1, [PAN_X + 0.4, 5.0, 9.2], [PAN_X + 0.5, 1.4, 0]],
  [9.6, [PLATE_X - 1.5, 5.8, 8.6], [PLATE_X - 1, 0.8, 0]],
  [10.2, [PLATE_X + 1.2, 6.8, 15], [PLATE_X + 1.2, 1.4, 1.5]],
  [10.75, [PLATE_X + 1.8, 6.6, 20], [PLATE_X + 1.8, 2.4, 2]],
  [11.3, [PLATE_X + 5.2, 6.2, 23], [PLATE_X + 3.2, 3.6, 8.8]],
  [12.0, [PLATE_X + 4.4, 5.8, 20.2], [PLATE_X + 3.2, 4.1, 8.8]],
];
function updateCamera(t) {
  let i = 1; while (i < CAM.length - 1 && t > CAM[i][0]) i++;
  const [t0, p0, g0] = CAM[i - 1], [t1, p1, g1] = CAM[i], e = smooth(clamp((t - t0) / (t1 - t0)));
  camPos.set(lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e), lerp(p0[2], p1[2], e));
  camTgt.set(lerp(g0[0], g1[0], e), lerp(g0[1], g1[1], e), lerp(g0[2], g1[2], e));
  // portrait screens: step back so the action still fits
  const aspect = camera.aspect, back = aspect < 1 ? 1 + (1 - aspect) * 0.6 : 1;
  camPos.sub(camTgt).multiplyScalar(back).add(camTgt);
  camera.position.copy(camPos); camera.lookAt(camTgt);
}

// ---------- the timeline ----------
const BOWL_HOME = new THREE.Vector3(0, 0, 0);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function update(t, time) {
  // --- bowl + contents
  const toPan = prog(t, 6.2, 0.35), backHome = prog(t, 7.15, 0.4);
  const tilt = kf(t, [[6.3, 0], [6.55, -1.15], [7.0, -1.25], [7.2, 0]]);
  bowl.position.set(lerp(lerp(0, PAN_X - 3.0, smooth(toPan)), -2.2, smooth(backHome)), lerp(0, 2.6, Math.sin(Math.PI * Math.min(1, toPan + backHome) * 0.5)) * (1 - smooth(backHome)), 0);
  bowl.rotation.z = tilt;
  // flour heap grows, then whisked away
  const flourIn = smooth(prog(t, 1.15, 0.75)), whisked = smooth(prog(t, 4.25, 0.6));
  heap.scale.set(lerp(0.2, 1, flourIn) * (1 - whisked * 0.9), Math.max(0.001, flourIn * (1 - whisked)), lerp(0.2, 1, flourIn) * (1 - whisked * 0.9));
  heap.visible = flourIn > 0.01 && whisked < 0.98;
  // egg on top of the heap, sinking into the batter
  yolk.visible = t > 2.55 && whisked < 0.6;
  yolk.position.set(0.05, 0.88 * flourIn * (1 - whisked) + 0.06 + lerp(0, 0.4, prog(t, 3.3, 0.6)), 0.05);
  yolk.scale.setScalar(1 - smooth(prog(t, 4.25, 0.35)));
  // liquid level: milk 3.25-3.9, then it becomes batter
  const level = lerp(0.12, 0.62, smooth(prog(t, 3.25, 0.7))) - lerp(0, 0.5, smooth(prog(t, 6.45, 0.6)));
  liquid.visible = t > 3.25 && t < 7.1;
  liquid.position.y = level; liquid.scale.setScalar(bowlRadiusAt(level) - 0.02);
  const toBatter = smooth(prog(t, 4.2, 0.7));
  liquidMat.color.copy(col('#FFFFFF')).lerp(col('#F5DFA6'), toBatter);
  liquidMat.map = toBatter > 0.05 && toBatter < 0.98 ? swirlTex : null; liquidMat.needsUpdate = true;
  liquid.rotation.z = t * 3;

  // --- flour bag: lifts, tips over the bowl, goes back
  const bagUp = smooth(prog(t, 0.85, 0.3)), bagDown = smooth(prog(t, 1.95, 0.35));
  const bagLift = bagUp * (1 - bagDown);
  bag.position.set(lerp(-3.3, -1.0, bagLift), lerp(0, 3.3, bagLift), lerp(-1.4, 0, bagLift));
  bag.rotation.z = lerp(0, -2.0, smooth(prog(t, 1.0, 0.25)) * (1 - bagDown));
  const pouring = t > 1.12 && t < 1.95;
  if (pouring) placeStream(flourStream, v3(-0.35, 3.25, 0), v3(0, flourIn * 0.8 + 0.1, 0), 0.12 + 0.05 * Math.sin(time * 9)); else flourStream.visible = false;
  // flour puff
  {
    const amt = clamp(Math.min(prog(t, 1.15, 0.2), 1 - prog(t, 2.0, 0.4)));
    flourPuff.p.material.opacity = amt * 0.55;
    flourPuff.seeds.forEach(([a, r1, r2, r3], i) => { const ph = (time * (0.25 + r2 * 0.3) + r3) % 1, rad = 0.4 + ph * (1.4 + r1); flourPuff.pos.set([Math.cos(a) * rad, 1.0 + ph * (0.8 + r1 * 0.8) + flourIn * 0.4, Math.sin(a) * rad], i * 3); });
    flourPuff.p.position.copy(bowl.position); flourPuff.p.geometry.attributes.position.needsUpdate = true;
  }

  // --- egg: rises, taps, splits; yolk drops into the flour
  const eggUp = smooth(prog(t, 2.0, 0.3));
  const crack = smooth(prog(t, 2.35, 0.25));
  egg.visible = t < 2.95;
  egg.position.set(lerp(-3.0, 0.1, eggUp), lerp(0.44, 2.1, eggUp) - Math.sin(prog(t, 2.28, 0.1) * Math.PI) * 0.2, lerp(1.0, 0.05, eggUp));
  egg.rotation.z = lerp(1.4, 0, eggUp);
  shellTopG.position.set(-crack * 0.5, crack * 0.15, 0); shellTopG.rotation.z = crack * 1.2;
  shellBotG.position.set(crack * 0.5, crack * 0.15, 0); shellBotG.rotation.z = -crack * 1.2;
  const shellGone = smooth(prog(t, 2.65, 0.3));
  shellTopG.position.x -= shellGone * 3; shellBotG.position.x += shellGone * 3; shellTopG.position.y += shellGone * 2; shellBotG.position.y += shellGone * 2;
  // falling yolk between the halves
  const drop = prog(t, 2.4, 0.18);
  if (t > 2.4 && t < 2.6) { yolk.visible = true; yolk.position.set(0.1, lerp(1.95, 0.95 * flourIn, eIn(drop)), 0.05); }
  // spare egg disappears into the tray of the shot when the first is cracked (keeps the counter tidy)

  // --- milk bottle
  const milkUp = smooth(prog(t, 3.0, 0.25)), milkDown = smooth(prog(t, 3.9, 0.3)), milkLift = milkUp * (1 - milkDown);
  milk.position.set(lerp(-2.6, 1.9, milkLift), lerp(0, 2.6, milkLift), lerp(-2.0, 0, milkLift));
  milk.rotation.z = lerp(0, 1.95, smooth(prog(t, 3.1, 0.2)) * (1 - milkDown));
  if (t > 3.22 && t < 3.88) { const lip = new THREE.Vector3(0, 2.95, 0).applyMatrix4(milk.matrixWorld); placeStream(milkStream, lip, v3(0.3, level + 0.02, 0), 0.08); } else milkStream.visible = false;

  // --- whisk
  const wIn = smooth(prog(t, 4.0, 0.2)), wOut = smooth(prog(t, 4.88, 0.15)), wOn = wIn * (1 - wOut);
  const wa = time * 9;
  whisk.position.set(lerp(3.5, Math.cos(wa) * 0.55 * wOn, wOn), lerp(-0.3, 0.32, wOn) + (1 - wOn) * 0.3, lerp(-1, Math.sin(wa) * 0.4 * wOn, wOn));
  whisk.rotation.set(lerp(0, 0.35 * Math.sin(wa), wOn), wa * wOn, lerp(1.4, 0.3 * Math.cos(wa), wOn));
  whisk.visible = t > 3.8 && t < 5.2;

  // --- stove: flames on from 5.0
  const heat = smooth(prog(t, 5.0, 0.3)) * (1 - smooth(prog(t, 9.5, 0.4)));
  flames.forEach((f, i) => { f.visible = heat > 0.02; f.scale.set(1, (0.6 + 0.4 * Math.sin(time * 18 + i * 1.7)) * heat, 1); });
  flameLight.intensity = heat * 2.2;

  // --- bacon + apple drop into the pan
  for (const f of fillings) {
    const land = prog(t, 5.2 + f.delay, 0.28);
    f.g.visible = land > 0 && t < 7.05;
    f.g.position.copy(f.home); f.g.position.y = f.home.y + (1 - eOut(land)) * 3.2 + (land >= 1 && t < 6.6 ? Math.abs(Math.sin(time * 22 + f.home.x * 5)) * 0.02 : 0);
  }
  const fry = smooth(prog(t, 5.5, 1.3));
  baconMats.forEach((m) => m.color.copy(col('#FFFFFF')).lerp(col('#B07A5C'), fry));
  appleMat.color.copy(col('#F3DE9C')).lerp(col('#E8B865'), fry);
  // sizzle sparks around the fillings
  {
    const amt = heat * (t > 5.4 ? 1 : 0) * (1 - prog(t, 9.2, 0.3));
    sizzle.p.material.opacity = amt;
    sizzle.seeds.forEach(([a, r1, r2, r3], i) => { const ph = (time * (1.4 + r2 * 2) + r3) % 1, rad = Math.sqrt(r1) * 1.4; sizzle.pos.set([PAN_X + Math.cos(a) * rad, 0.5 + ph * 0.35 + (t > 6.9 ? 0.06 : 0), Math.sin(a) * rad], i * 3); });
    sizzle.p.geometry.attributes.position.needsUpdate = true;
  }
  // steam
  {
    const amt = heat * clamp(prog(t, 5.6, 0.4)) * (1 - prog(t, 10.3, 0.5));
    steam.p.material.opacity = amt * 0.32;
    const sx = t < 9.6 ? PAN_X : lerp(PAN_X, PLATE_X, smooth(prog(t, 9.4, 0.5)));
    steam.seeds.forEach(([a, r1, r2, r3], i) => { const ph = (time * (0.18 + r2 * 0.12) + r3) % 1; steam.pos.set([sx + Math.cos(a) * r1 * 1.2 + Math.sin(ph * 6 + i) * 0.2, 0.7 + ph * 4.5, Math.sin(a) * r1 * 1.0], i * 3); });
    steam.p.geometry.attributes.position.needsUpdate = true;
  }

  // --- batter: pour + spread
  const spread = smooth(prog(t, 6.5, 0.55));
  if (t > 6.45 && t < 7.05) { const lip = new THREE.Vector3(1.86, 1.32, 0).applyMatrix4(bowl.matrixWorld); placeStream(batterStream, lip, v3(PAN_X - 0.2, 0.5, 0), 0.16); } else batterStream.visible = false;
  const { raw, top, bot, rim } = pancake.userData;
  const cook = smooth(prog(t, 7.3, 0.8));
  pancake.visible = t > 6.5;
  raw.visible = cook < 0.99; rawMat.opacity = 0.92 * (1 - cook);
  cookedTop.opacity = cook;
  rim.visible = cook > 0.3;
  pancake.scale.setScalar(Math.max(0.01, spread));

  // --- flip (8.3 - 9.0) and the trip to the plate (9.3 - 9.75)
  const fl = prog(t, 8.3, 0.7), toPlate = smooth(prog(t, 9.3, 0.45));
  const flipH = Math.sin(fl * Math.PI) * 3.0;
  pancake.position.set(lerp(PAN_X, PLATE_X, toPlate), 0.45 + flipH + Math.sin(toPlate * Math.PI) * 1.8 - toPlate * 0.18, 0);
  pancake.rotation.x = smooth(fl) * Math.PI;
  pancake.rotation.z = Math.sin(fl * Math.PI) * 0.15;
  pan.position.y = 0.42 + (fl > 0.82 && fl < 1 ? Math.sin((fl - 0.82) / 0.18 * Math.PI) * -0.08 : 0) + (fl > 0 && fl < 0.12 ? Math.sin(fl / 0.12 * Math.PI) * 0.15 : 0);

  // --- plate, sugar, server
  const pick = smooth(prog(t, 10.6, 0.35));
  const walkOut = prog(t, 10.95, 0.75);
  // server walks in from the right behind the counter edge, picks up, walks toward the camera
  const sPos = [
    lerp(lerp(PLATE_X + 9, PLATE_X + 2.6, smooth(prog(t, 10.1, 0.5))), PLATE_X + 3.2, smooth(walkOut)),
    0,
    lerp(5.4, 8.8, smooth(walkOut)),
  ];
  const yaw = t < 10.6 ? -Math.PI / 2 + lerp(0, 0.0, 0) : lerp(-Math.PI / 2, 0, smooth(prog(t, 10.75, 0.4)));
  const walking = (t > 10.1 && t < 10.6) || (t > 10.95 && t < 11.7);
  const walkPh = t < 10.6 ? (t - 10.1) * 3.2 : (t - 10.95) * 3.2;
  const smileK = smooth(prog(t, 11.2, 0.5));
  server.visible = t > 9.9;
  poseServer({
    pos: sPos, yaw, walk: walkPh, stride: walking ? 0.42 : 0,
    carry: pick, lean: pick > 0 && pick < 1 ? Math.sin(pick * Math.PI) * 0.18 : 0,
    look: lerp(0, -0.1, smileK), nod: lerp(0.15, -0.05, smileK) - (t < 10.7 ? 0.2 * smooth(prog(t, 10.4, 0.2)) : 0), tilt: smileK * 0.12,
    smile: lerp(0.6, 1, smileK), open: smileK * 0.6, happy: smileK,
  });
  // plate sits on the counter edge, then rides on the server's hands
  server.updateMatrixWorld(true);
  const handPos = new THREE.Vector3(0, 2.6, 2.3).applyMatrix4(server.matrixWorld);
  const platePos = v3(PLATE_X, 0.02, 1.2).lerp(handPos, pick);
  plate.position.copy(platePos); plate.rotation.y = lerp(0, server.rotation.y + Math.PI / 2, pick);
  if (toPlate >= 1) {
    pancake.position.copy(plate.position).add(v3(0, 0.22, 0)); pancake.rotation.set(Math.PI, 0, 0);
  }
  sugarLayer.position.copy(plate.position).add(v3(0, 0.25, 0));
  sugarLayer.material.opacity = smooth(prog(t, 9.85, 0.4)) * 0.9;
  // sugar sprinkle falling
  {
    const fall = prog(t, 9.75, 0.6);
    sugar.visible = fall > 0 && fall < 1;
    sugarSeed.forEach(([rr, a, h, ph], i) => { const y = Math.max(0.27, h * (1 - ((fall * 1.4 + ph * 0.4) % 1))); sugarPos.set([plate.position.x + Math.cos(a) * rr, plate.position.y + y, plate.position.z + Math.sin(a) * rr], i * 3); });
    sugarGeo.attributes.position.needsUpdate = true;
  }

  updateCamera(t);
  // the server looks at you
  if (server.visible) { server.updateMatrixWorld(true); for (const e of S.eyes) e.ball.lookAt(camera.position); }
}

// ---------- scroll -> time ----------
const caps = [...document.querySelectorAll('.cap')].map((el) => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
const rail = document.getElementById('rail');
const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11.3];
STEPS.forEach(() => rail.appendChild(document.createElement('span')));
const dots = [...rail.children];
const scrollEl = document.getElementById('scroll');
function targetT() {
  const max = scrollEl.offsetHeight - innerHeight;
  return clamp(scrollY / Math.max(1, max)) * END;
}
let t = targetT(), lastCapKey = '';
function updateCaptions(tt) {
  for (const c of caps) {
    const fade = 0.15, vis = Math.min(clamp((tt - c.a) / fade + (c.a < 0 ? 1 : 0)), clamp((c.b - tt) / fade));
    c.el.style.opacity = vis.toFixed(3);
    c.el.style.transform = `translateY(${((1 - vis) * 18).toFixed(1)}px)`;
  }
  const key = STEPS.filter((s) => tt >= s - 0.05).length;
  if (key !== lastCapKey) { dots.forEach((d, i) => d.classList.toggle('on', i === key - 1)); lastCapKey = key; }
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 52 : 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
// hide the step dots once the closing card scrolls in
new IntersectionObserver(([e]) => rail.style.opacity = e.isIntersecting ? 0 : 1).observe(document.querySelector('.end'));

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
let frozen = null; // set by __story.snap for testing
function frame() {
  const time = clock.getElapsedTime();
  const goal = frozen ?? targetT();
  t += (goal - t) * (frozen != null || reduce ? 1 : 0.1);
  if (Math.abs(goal - t) < 0.0005) t = goal;
  update(t, time);
  updateCaptions(t);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
update(t, 0); renderer.render(scene, camera);
document.getElementById('loading').style.opacity = 0;
setTimeout(() => document.getElementById('loading').remove(), 700);
requestAnimationFrame(frame);

// for checking single moments: __story.snap(7.5)
window.__story = { snap(tt) { frozen = tt; t = tt; update(tt, clock.getElapsedTime()); updateCaptions(tt); renderer.render(scene, camera); }, release() { frozen = null; } };
