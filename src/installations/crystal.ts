import * as THREE from 'three';
import type { Installation } from './types';
import { mouseToWorld, type MouseState } from '../input/mouse';
import { rand, randInt } from '../utils';

// ── PALETTE ───────────────────────────────────────────────────────
const BG = new THREE.Color(0x000d1a);
const CRYSTAL_COLOURS = [
  new THREE.Color(0xa8dadc), // ice blue
  new THREE.Color(0x457b9d), // deep blue
  new THREE.Color(0xe0fbfc), // white ice
  new THREE.Color(0x1d3557), // dark navy
  new THREE.Color(0xcaf0f8), // pale cyan
];

// ── TYPES ─────────────────────────────────────────────────────────
interface Crystal {
  start: THREE.Vector3;
  end: THREE.Vector3;
  grown: number;
  speed: number;
  thickness: number;
  colourIndex: number;
  depth: number;
  hasSpawned: boolean;
  children: Crystal[];
  mesh: THREE.Mesh | null;
  frozen: boolean;
}

interface CrystalCluster {
  crystals: Crystal[];
  origin: THREE.Vector3;
  active: boolean;
  age: number;
  maxAge: number;
}

// ── BUILDERS ──────────────────────────────────────────────────────
const buildCrystalArm = (
  start: THREE.Vector3,
  angle: number,
  length: number,
  thickness: number,
  depth: number
): Crystal => {
  const rad = (angle * Math.PI) / 180;
  const end = new THREE.Vector3(
    start.x + Math.cos(rad) * length,
    start.y + Math.sin(rad) * length,
    start.z
  );

  return {
    start,
    end,
    grown: 0,
    speed: rand(0.008, 0.02),
    thickness,
    colourIndex: randInt(0, CRYSTAL_COLOURS.length - 1),
    depth,
    hasSpawned: false,
    children: [],
    mesh: null,
    frozen: false,
  };
};

const buildCluster = (origin: THREE.Vector3): CrystalCluster => {
  const crystals: Crystal[] = [];
  const numArms = 6;
  const baseAngle = rand(0, 60);

  for (let i = 0; i < numArms; i++) {
    const angle = baseAngle + (360 / numArms) * i;
    crystals.push(
      buildCrystalArm(
        origin.clone(),
        angle,
        rand(0.8, 1.4),
        rand(0.04, 0.08),
        0
      )
    );
  }

  return {
    crystals,
    origin,
    active: true,
    age: 0,
    maxAge: randInt(180, 300),
  };
};

const spawnChildren = (crystal: Crystal): void => {
  const MAX_DEPTH = 3;
  if (crystal.depth >= MAX_DEPTH) return;

  const baseAngle =
    Math.atan2(
      crystal.end.y - crystal.start.y,
      crystal.end.x - crystal.start.x
    ) *
    (180 / Math.PI);

  const pairs = Math.max(1, 3 - crystal.depth);

  for (let i = 0; i < pairs; i++) {
    const t = (i + 1) / (pairs + 1);
    const branchPoint = crystal.start.clone().lerp(crystal.end, t);
    const length = crystal.start.distanceTo(crystal.end) * rand(0.3, 0.5);
    const thickness = crystal.thickness * 0.55;

    crystal.children.push(
      buildCrystalArm(
        branchPoint,
        baseAngle + 60,
        length,
        thickness,
        crystal.depth + 1
      ),
      buildCrystalArm(
        branchPoint,
        baseAngle - 60,
        length,
        thickness,
        crystal.depth + 1
      )
    );
  }

  crystal.children.push(
    buildCrystalArm(
      crystal.end.clone(),
      baseAngle,
      crystal.start.distanceTo(crystal.end) * rand(0.4, 0.6),
      crystal.thickness * 0.6,
      crystal.depth + 1
    )
  );
};

// ── FACTORY ───────────────────────────────────────────────────────
export const createCrystalInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  // CONSTANTS
  const STILL_THRESHOLD = 40;
  const MOVE_THRESHOLD = 0.15;
  const MAX_CLUSTERS = 20;

  // STATE
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let ambientLight: THREE.AmbientLight;
  let dirLight: THREE.DirectionalLight;
  let clusters: CrystalCluster[];
  let activeCluster: CrystalCluster | null;
  let lastMouseWorld: THREE.Vector3;
  let mouseStillFrames: number;
  let animationId: number | null = null;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    scene.background = BG;
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
    ambientLight = new THREE.AmbientLight(0x88ccff, 1.5);
    dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 5, 5);
    scene.add(ambientLight);
    scene.add(dirLight);
  };

  const _updateCrystal = (crystal: Crystal, active: boolean): void => {
    if (crystal.frozen) return;

    if (!active) {
      crystal.frozen = true;
      return;
    }

    if (crystal.grown < 1.0) {
      crystal.grown = Math.min(crystal.grown + crystal.speed, 1.0);

      if (crystal.mesh) {
        scene.remove(crystal.mesh);
        crystal.mesh.geometry.dispose();
        (crystal.mesh.material as THREE.Material).dispose();
      }

      const current = crystal.start.clone().lerp(crystal.end, crystal.grown);
      if (crystal.start.distanceTo(current) < 0.01) return;

      const path = new THREE.CatmullRomCurve3([
        crystal.start,
        crystal.start.clone().lerp(current, 0.5),
        current,
      ]);

      const geo = new THREE.TubeGeometry(path, 6, crystal.thickness, 4, false);
      const mat = new THREE.MeshPhongMaterial({
        color: CRYSTAL_COLOURS[crystal.colourIndex],
        emissive: CRYSTAL_COLOURS[crystal.colourIndex],
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.85,
      });

      crystal.mesh = new THREE.Mesh(geo, mat);
      scene.add(crystal.mesh);
    }

    if (crystal.grown > 0.9 && !crystal.hasSpawned) {
      crystal.hasSpawned = true;
      spawnChildren(crystal);
    }

    for (const child of crystal.children) {
      _updateCrystal(child, active);
    }
  };

  const _updateMouse = (): void => {
    const mouseWorld = mouseToWorld(mouse, camera);
    const mouseDist = mouseWorld.distanceTo(lastMouseWorld);

    if (mouseDist > MOVE_THRESHOLD) {
      mouseStillFrames = 0;
      if (activeCluster) {
        activeCluster.active = false;
        activeCluster = null;
      }
      lastMouseWorld.copy(mouseWorld);
      return;
    }

    mouseStillFrames++;

    if (
      mouseStillFrames === STILL_THRESHOLD &&
      clusters.length < MAX_CLUSTERS
    ) {
      activeCluster = buildCluster(mouseWorld.clone());
      clusters.push(activeCluster);
    }
  };

  const _updateClusters = (): void => {
    for (const cluster of clusters) {
      cluster.age++;

      if (cluster.age >= cluster.maxAge && cluster.active) {
        cluster.active = false;
        if (activeCluster === cluster) activeCluster = null;
      }

      for (const crystal of cluster.crystals) {
        _updateCrystal(crystal, cluster.active);
      }
    }
  };

  const _animate = (): void => {
    _updateMouse();
    _updateClusters();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _disposeCrystal = (crystal: Crystal): void => {
    if (crystal.mesh) {
      scene.remove(crystal.mesh);
      crystal.mesh.geometry.dispose();
      (crystal.mesh.material as THREE.Material).dispose();
    }
    for (const child of crystal.children) _disposeCrystal(child);
  };

  const _reset = (): void => {
    for (const cluster of clusters) {
      for (const crystal of cluster.crystals) {
        _disposeCrystal(crystal);
      }
    }

    clusters = [];
    activeCluster = null;
    mouseStillFrames = 0;
    lastMouseWorld = new THREE.Vector3(9999, 9999, 0);

    scene.clear();
    scene.background = BG;
    scene.add(ambientLight);
    scene.add(dirLight);
  };

  const setup = (): void => {
    _setupScene();
    _setupCamera();
    _setupLights();
    clusters = [];
    activeCluster = null;
    mouseStillFrames = 0;
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
