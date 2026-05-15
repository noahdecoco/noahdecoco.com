import * as THREE from 'three';

export interface MouseState {
  x: number;
  y: number;
}

export const createMouseTracker = (): MouseState => {
  const state: MouseState = { x: 0, y: 0 };

  // ── MOUSE ───────────────────────────────────────────────────
  window.addEventListener('mousemove', (e: MouseEvent) => {
    state.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── TOUCH — single finger updates mouse position ────────────
  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      state.x = (touch.clientX / window.innerWidth) * 2 - 1;
      state.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true }
  );

  return state;
};

export const mouseToWorld = (
  mouse: MouseState,
  camera: THREE.PerspectiveCamera
): THREE.Vector3 => {
  const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(distance));
};
