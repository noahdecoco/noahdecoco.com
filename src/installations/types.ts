import * as THREE from 'three';

export interface Installation {
  id: string;
  name: string;
  setup: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

export interface CubeEntity {
  mesh: THREE.Mesh;

  // home position — where it lives at rest
  hx: number;
  hy: number;
  hz: number;

  // current position
  x: number;
  y: number;
  z: number;

  // velocity
  vx: number;
  vy: number;
  vz: number;

  // rotation velocity
  rvx: number;
  rvy: number;
  rvz: number;

  // scale
  scale: number;
  targetScale: number;

  // individual personality
  mass: number;
  phaseOffset: number; // for idle floating animation
}
