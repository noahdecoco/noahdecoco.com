import * as THREE from 'three';
import type { Installation } from './types';
import { mouseToWorld, type MouseState } from '../input/mouse';
import { rand, randInt } from '../utils';

// ── SHADERS ───────────────────────────────────────────────────────
const vertexShader = `
  attribute float size;
  varying vec3 vColour;

  void main() {
    vColour = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColour;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColour * glow, glow);
  }
`;

// ── PALETTE ───────────────────────────────────────────────────────
const COLOURS = [
  new THREE.Color(0xe07a5f), // terracotta
  new THREE.Color(0x3d405b), // dark slate
  new THREE.Color(0x81b29a), // sage green
  new THREE.Color(0xf2cc8f), // warm gold
  new THREE.Color(0xf4f1de), // cream
  new THREE.Color(0xe63946), // strawberry red
  new THREE.Color(0xa8dadc), // ice blue
];

// ── TYPES ─────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hx: number;
  hy: number;
  hz: number;
  size: number;
  colourIndex: number;
  mass: number;
}

// ── FACTORY ───────────────────────────────────────────────────────
export const createParticleInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  // PHYSICS
  const COUNT = 600;
  const MOUSE_RADIUS = 2.5;
  const MOUSE_STRENGTH = 0.08;
  const HOME_STRENGTH = 0.003;
  const DAMPING = 0.88;
  const EXPLOSION_STRENGTH = 8;
  const MIN_FOV = 20;
  const MAX_FOV = 150;

  // STATE
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let cameraFov = (MIN_FOV + MAX_FOV) / 2;
  let geometry: THREE.BufferGeometry;
  let material: THREE.ShaderMaterial;
  let points: THREE.Points;
  let particles: Particle[];
  let positions: Float32Array;
  let colours: Float32Array;
  let sizes: Float32Array;
  let time = 0;
  let animationId: number | null = null;
  let exploding = false;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080810);
    scene.fog = new THREE.FogExp2(0x080810, 0.08);
  };

  const _setupCamera = (): void => {
    camera = new THREE.PerspectiveCamera(
      cameraFov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 8;
  };

  const _setupGeometry = (): void => {
    positions = new Float32Array(COUNT * 3);
    colours = new Float32Array(COUNT * 3);
    sizes = new Float32Array(COUNT);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
  };

  const _initParticles = (): void => {
    particles = [];

    for (let i = 0; i < COUNT; i++) {
      const theta = rand(0, Math.PI * 2);
      const phi = rand(0, Math.PI);
      const radius = rand(1, 5);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const colourIndex = randInt(0, COLOURS.length - 1);
      const colour = COLOURS[colourIndex];

      particles.push({
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        hx: x,
        hy: y,
        hz: z,
        size: rand(3, 12),
        colourIndex,
        mass: rand(0.5, 2.0),
      });

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colours[i * 3] = colour.r;
      colours[i * 3 + 1] = colour.g;
      colours[i * 3 + 2] = colour.b;

      sizes[i] = rand(3, 12);
    }
  };

  const _updatePhysics = (): void => {
    const mouseWorld = mouseToWorld(mouse, camera);

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];

      // Home force
      p.vx += (p.hx - p.x) * HOME_STRENGTH;
      p.vy += (p.hy - p.y) * HOME_STRENGTH;
      p.vz += (p.hz - p.z) * HOME_STRENGTH;

      // Mouse repulsion
      const dx = p.x - mouseWorld.x;
      const dy = p.y - mouseWorld.y;
      const dz = p.z - mouseWorld.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < MOUSE_RADIUS && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        if (exploding) {
          p.vx += (nx * EXPLOSION_STRENGTH) / p.mass;
          p.vy += (ny * EXPLOSION_STRENGTH) / p.mass;
          p.vz += (nz * EXPLOSION_STRENGTH) / p.mass;
        } else {
          const force = ((1.0 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH) / p.mass;
          p.vx += nx * force;
          p.vy += ny * force;
          p.vz += nz * force;
        }
      }

      // Integrate
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.vz *= DAMPING;

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }

    geometry.attributes.position.needsUpdate = true;
  };

  const _updateCamera = (): void => {
    time += 0.005;

    camera.fov += (cameraFov - camera.fov) * 0.02;
    camera.updateProjectionMatrix();

    camera.position.x += (Math.sin(time) * 2 - camera.position.x) * 0.01;
    camera.position.y += (Math.cos(time * 0.7) - camera.position.y) * 0.01;
    camera.lookAt(0, 0, 0);
  };

  const _animate = (): void => {
    _updatePhysics();
    _updateCamera();
    renderer.render(scene, camera);
    exploding = false;
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _onClick = (): void => {
    exploding = true;
  };

  const _onScroll = (e: WheelEvent): void => {
    cameraFov = Math.max(
      MIN_FOV,
      Math.min(MAX_FOV, cameraFov + e.deltaY * 0.1)
    );
  };

  const _reset = (): void => {
    time = 0;
    cameraFov = (MIN_FOV + MAX_FOV) / 2;
    _initParticles();
  };

  const setup = (): void => {
    _setupScene();
    _setupCamera();
    _setupGeometry();
    _initParticles();
  };

  const start = (): void => {
    _reset();
    window.addEventListener('resize', _onResize);
    window.addEventListener('click', _onClick);
    window.addEventListener('wheel', _onScroll);
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', _onResize);
    window.removeEventListener('click', _onClick);
    window.removeEventListener('wheel', _onScroll);
  };

  const dispose = (): void => {
    stop();
    geometry.dispose();
    material.dispose();
    scene.clear();
  };

  return {
    id: 'exploding-lights',
    name: 'Glowing in the sun',
    setup,
    start,
    stop,
    dispose,
  };
};
