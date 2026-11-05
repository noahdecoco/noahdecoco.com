import * as THREE from 'three';
import type { TvNoise } from '../transitions/noise';
import vertexShader from './crt.vert.glsl';
import fragmentShader from './crt.frag.glsl';

export interface Display {
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
}

// Every frame goes through here: the scene, the static on top of it, then the
// finished picture is copied back off the canvas and redrawn through the CRT.
// Copying the canvas means the installations keep their exact colours, and one
// path for every frame means the order of rAF callbacks can't hide the static.
export const createCrtDisplay = (
  renderer: THREE.WebGLRenderer,
  noise: TvNoise
): Display => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bufferSize = new THREE.Vector2();
  const cssSize = new THREE.Vector2();
  let frame: THREE.FramebufferTexture | null = null;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFrame: { value: null },
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uFlicker: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();

  const _syncFrameSize = (): void => {
    renderer.getDrawingBufferSize(bufferSize);
    if (frame?.image.width === bufferSize.x) {
      if (frame.image.height === bufferSize.y) return;
    }

    frame?.dispose();
    frame = new THREE.FramebufferTexture(bufferSize.x, bufferSize.y);
    frame.minFilter = THREE.LinearFilter;
    frame.magFilter = THREE.LinearFilter;
    material.uniforms.uFrame.value = frame;
    material.uniforms.uResolution.value.copy(renderer.getSize(cssSize));
  };

  const render = (sourceScene: THREE.Scene, sourceCamera: THREE.Camera) => {
    renderer.clear();
    renderer.render(sourceScene, sourceCamera);
    noise.render();

    _syncFrameSize();
    renderer.copyFramebufferToTexture(frame!);

    material.uniforms.uTime.value = performance.now() / 1000;
    material.uniforms.uFlicker.value = reducedMotion.matches ? 0 : 1;
    renderer.render(scene, camera);
  };

  return { render };
};
