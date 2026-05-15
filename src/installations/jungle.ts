import * as THREE from 'three';
import type { Installation } from './types';
import { mouseToWorld, type MouseState } from '../input/mouse';
import { rand, randInt } from '../utils';

// ── PALETTE ───────────────────────────────────────────────────────
const COLOURS = {
  bg: new THREE.Color(0x010a03),
  vines: [
    new THREE.Color(0x1a3a1a),
    new THREE.Color(0x2a4a2a),
    new THREE.Color(0x0d2b0d),
    new THREE.Color(0x3a5a2a),
    new THREE.Color(0x0a1f0a),
  ],
};

// ── TYPES ─────────────────────────────────────────────────────────
interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  grown: number;
  speed: number;
  thickness: number;
  colourIndex: number;
  depth: number;
  hasSpawned: boolean;
  children: Branch[];
  mesh: THREE.Mesh | null; // was THREE.Line — fixed
}

// ── BUILDER ───────────────────────────────────────────────────────
const buildBranch = (
  start: THREE.Vector3,
  angle: number,
  length: number,
  thickness: number,
  depth: number,
  speed: number
): Branch => {
  const rad = (angle * Math.PI) / 180;
  const end = new THREE.Vector3(
    start.x + Math.cos(rad) * length,
    start.y + Math.sin(rad) * length,
    start.z + rand(-0.1, 0.1)
  );

  return {
    start,
    end,
    grown: 0,
    speed,
    thickness,
    colourIndex: randInt(0, COLOURS.vines.length - 1),
    depth,
    hasSpawned: false,
    children: [],
    mesh: null,
  };
};

// ── FACTORY ───────────────────────────────────────────────────────
export const createJungleInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  // CONSTANTS
  const MAX_BRANCHES = 400;
  const MAX_DEPTH = 4;
  const SPAWN_MOVE_THRESHOLD = 0.3;
  const SPAWN_TIMER_INTERVAL = 60;

  // STATE
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let ambientLight: THREE.AmbientLight;
  let dirLight: THREE.DirectionalLight;
  let branches: Branch[];
  let lastMouseWorld: THREE.Vector3;
  let frameCount: number;
  let animationId: number | null = null;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    scene.background = COLOURS.bg;
  };

  const _setupCamera = (): void => {
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 8;
  };

  const _setupLights = (): void => {
    ambientLight = new THREE.AmbientLight(0x1a3a1a, 2);
    dirLight = new THREE.DirectionalLight(0x2a5a2a, 1.5);
    dirLight.position.set(2, 5, 3);
    scene.add(ambientLight);
    scene.add(dirLight);
  };

  const _spawnFromMouse = (worldPos: THREE.Vector3): void => {
    if (branches.length > MAX_BRANCHES) return;

    const count = randInt(2, 3);
    const baseAngle = rand(0, 360);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (360 / count) * i + rand(-30, 30);
      branches.push(
        buildBranch(
          worldPos.clone(),
          angle,
          rand(0.8, 2.0),
          rand(4, 10),
          0,
          rand(0.015, 0.03)
        )
      );
    }
  };

  const _spawnChildren = (branch: Branch): void => {
    if (branch.depth >= MAX_DEPTH) return;

    const numChildren = branch.depth === 0 ? randInt(2, 4) : randInt(2, 3);
    const baseAngle =
      Math.atan2(branch.end.y - branch.start.y, branch.end.x - branch.start.x) *
      (180 / Math.PI);

    for (let i = 0; i < numChildren; i++) {
      const spreadRange = 35 + branch.depth * 10;
      const spread = rand(15, spreadRange);
      const side = i % 2 === 0 ? 1 : -1;
      const angle = baseAngle + spread * side + rand(-10, 10);
      const length = branch.start.distanceTo(branch.end) * rand(0.55, 0.75);
      const thickness = branch.thickness * rand(0.5, 0.7);

      branch.children.push(
        buildBranch(
          branch.end.clone(),
          angle,
          length,
          thickness,
          branch.depth + 1,
          branch.speed * rand(0.8, 1.1)
        )
      );
    }
  };

  const _updateBranch = (branch: Branch): void => {
    if (branch.grown < 1.0) {
      branch.grown = Math.min(branch.grown + branch.speed, 1.0);

      // Dispose previous mesh before rebuilding
      if (branch.mesh) {
        scene.remove(branch.mesh);
        branch.mesh.geometry.dispose();
        (branch.mesh.material as THREE.Material).dispose();
      }

      const current = branch.start.clone().lerp(branch.end, branch.grown);
      const path = new THREE.CatmullRomCurve3([
        branch.start,
        branch.start.clone().lerp(branch.end, 0.5),
        current,
      ]);

      const geo = new THREE.TubeGeometry(
        path,
        8,
        branch.thickness * 0.03,
        6,
        false
      );
      const mat = new THREE.MeshBasicMaterial({
        color: COLOURS.vines[branch.colourIndex],
      });

      branch.mesh = new THREE.Mesh(geo, mat);
      scene.add(branch.mesh);
    }

    if (branch.grown > 0.85 && !branch.hasSpawned) {
      branch.hasSpawned = true;
      _spawnChildren(branch);
    }

    for (const child of branch.children) {
      _updateBranch(child);
    }
  };

  const _prune = (): void => {
    if (branches.length <= MAX_BRANCHES) return;
    const toRemove = branches.splice(0, 30);
    for (const b of toRemove) {
      if (b.mesh) {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
    }
  };

  const _updateMouse = (): void => {
    const mouseWorld = mouseToWorld(mouse, camera);
    const mouseMoved = mouseWorld.distanceTo(lastMouseWorld);

    if (mouseMoved > SPAWN_MOVE_THRESHOLD) {
      _spawnFromMouse(mouseWorld);
      lastMouseWorld.copy(mouseWorld);
    }

    if (frameCount % SPAWN_TIMER_INTERVAL === 0) {
      _spawnFromMouse(mouseWorld);
    }
  };

  const _animate = (): void => {
    frameCount++;
    _updateMouse();
    for (const branch of branches) _updateBranch(branch);
    _prune();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _reset = (): void => {
    for (const b of branches) {
      if (b.mesh) {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
    }

    branches = [];
    frameCount = 0;
    lastMouseWorld = new THREE.Vector3(9999, 9999, 0);

    scene.clear();
    scene.background = COLOURS.bg;
    scene.add(ambientLight);
    scene.add(dirLight);
  };

  const setup = (): void => {
    _setupScene();
    _setupCamera();
    _setupLights();
    branches = [];
    frameCount = 0;
    lastMouseWorld = new THREE.Vector3(9999, 9999, 0);
  };

  const start = (): void => {
    _reset();
    window.addEventListener('resize', _onResize);
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', _onResize);
  };

  const dispose = (): void => {
    stop();
    _reset();
  };

  return { setup, start, stop, dispose };
};
