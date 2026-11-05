import * as THREE from 'three';
import type { Installation } from '../types.ts';
import type { Display } from '../../tv/crt.ts';
import vertexShader from './mosaic.vert.glsl';
import fragmentShader from './mosaic.frag.glsl';

// The text lives in index.html as real HTML, so it stays readable, selectable
// and clickable. Only the blocks behind it are drawn in WebGL.
export const createAboutInstallation = (display: Display): Installation => {
  const page = document.getElementById('teletext')!;
  const clock = document.getElementById('teletext-clock')!;
  const TIMER = new THREE.Timer();

  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let material: THREE.ShaderMaterial;
  let geometry: THREE.PlaneGeometry;
  let animationId: number | null = null;
  let clockTimer: number | undefined;

  const _updateClock = (): void => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
    const time = now.toLocaleTimeString('en-GB');
    clock.textContent = `${date.toUpperCase()} ${time}`;
  };

  const _animate = (): void => {
    TIMER.update();
    material.uniforms.uTime.value += TIMER.getDelta();
    display.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _setPageVisible = (visible: boolean): void => {
    page.classList.toggle('visible', visible);
    page.inert = !visible;
    page.setAttribute('aria-hidden', String(!visible));
  };

  const setup = (): void => {
    scene = new THREE.Scene();
    camera = new THREE.Camera();
    geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    _setPageVisible(false);
  };

  const start = (): void => {
    TIMER.update(); // drop the time that passed while this wasn't running
    _setPageVisible(true);
    _updateClock();
    clockTimer = window.setInterval(_updateClock, 1000);
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.clearInterval(clockTimer);
    _setPageVisible(false);
  };

  const dispose = (): void => {
    stop();
    geometry.dispose();
    material.dispose();
    scene.clear();
  };

  return {
    id: 'about',
    name: 'About Noah',
    setup,
    start,
    stop,
    dispose,
  };
};
