import * as THREE from 'three';
import type { Installation } from './types';

// ── SHADERS ───────────────────────────────────────────────────────
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uProgress;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    float pixelX = vUv.x * uResolution.x;
    float barWidth = 200.0;
    float center = uProgress * uResolution.x;
    float edge1 = center - barWidth / 2.0;
    float edge2 = center + barWidth / 2.0;
    float left  = smoothstep(edge1 - 1.0, edge1 + 1.0, pixelX);
    float right = smoothstep(edge2 - 1.0, edge2 + 1.0, pixelX);
    float c = 1.0 - (left - right);
    gl_FragColor = vec4(c, c, c, 1.0);
  }
`;

// ── FACTORY ───────────────────────────────────────────────────────
export const createTestInstallation = (
  renderer: THREE.WebGLRenderer
): Installation => {
  // STATE
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let geometry: THREE.PlaneGeometry;
  let material: THREE.ShaderMaterial;
  let mesh: THREE.Mesh;
  let animationId: number | null = null;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  };

  const _setupGeometry = (): void => {
    geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uProgress: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      transparent: true,
      depthWrite: false,
    });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  };

  const _animate = (): void => {
    material.uniforms.uProgress.value += 0.03;
    if (material.uniforms.uProgress.value > 1.5) {
      material.uniforms.uProgress.value = -0.5;
    }
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    material.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  };

  const _reset = (): void => {
    material.uniforms.uProgress.value = -0.5;
  };

  const setup = (): void => {
    _setupScene();
    _setupGeometry();
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
    geometry.dispose();
    material.dispose();
    scene.clear();
  };

  return { setup, start, stop, dispose };
};
