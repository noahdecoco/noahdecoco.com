import './styles/main.scss';
import * as THREE from 'three';
import type { Installation } from './installations/types';
import { createMouseTracker } from './input/mouse';
import { createCubeInstallation } from './installations/cube';
import { createParticleInstallation } from './installations/particles';
import { createTvNoise } from './transitions/noise';
import { createCircularBreathingInstallation } from './installations/circular-breathing.ts';

const createApp = () => {
  // STATE
  let renderer: THREE.WebGLRenderer;
  let installations: Installation[];
  let current = 0;
  let transitioning = false;

  const _setupRenderer = (): void => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.getElementById('three-renderer')!.appendChild(renderer.domElement);
  };

  const _setupInstallations = (): void => {
    const mouse = createMouseTracker();

    installations = [
      createCircularBreathingInstallation(renderer),
      createParticleInstallation(renderer, mouse),
      createCubeInstallation(renderer, mouse),
    ];

    installations.forEach((i) => i.setup());
    installations[current].start();
  };

  const _setupTransitions = (): void => {
    const tvNoise = createTvNoise(renderer);

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code !== 'Space' || transitioning) return;
      transitioning = true;

      tvNoise.start(() => {
        installations[current].stop();
        current = (current + 1) % installations.length;
        installations[current].start();
        transitioning = false;
      });
    });
  };

  const _onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const start = (): void => {
    _setupRenderer();
    _setupInstallations();
    _setupTransitions();
    window.addEventListener('resize', _onResize);
  };

  return { start };
};

// ── ENTRY POINT ───────────────────────────────────────────────────
window.addEventListener('load', () => createApp().start());
