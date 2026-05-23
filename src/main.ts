import './styles/main.scss';
import * as THREE from 'three';
import type { Installation } from './installations/types';
import { createMouseTracker } from './input/mouse';
import { createCubeInstallation } from './installations/cube';
import { createParticleInstallation } from './installations/particles';
import { createTvNoise } from './transitions/noise';
import { createCircularBreathingInstallation } from './installations/circular-breathing.ts';
import { createSoundEngine } from './audio/soundEngine.ts';

const createApp = () => {
  const menuBtn = document.getElementById('menu-btn')!;
  const overlay = document.getElementById('gallery-overlay')!;
  const grid = document.getElementById('gallery-grid')!;
  const soundEngine = createSoundEngine();

  // STATE
  let renderer: THREE.WebGLRenderer;
  let installations: Installation[];
  let tvNoise: ReturnType<typeof createTvNoise>;
  let current = 0;
  let transitioning = false;

  const _setupRenderer = (): void => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.getElementById('three-renderer')!.appendChild(renderer.domElement);
  };

  const _loadInstallation = (index: number): void => {
    if (transitioning || index === current) return;
    transitioning = true;
    soundEngine.play('static');

    tvNoise.start(() => {
      installations[current].stop();
      current = index;
      installations[current].start();
      transitioning = false;
    });
  };

  const _setupInstallations = (): void => {
    const mouse = createMouseTracker();

    installations = [
      createParticleInstallation(renderer, mouse),
      createCircularBreathingInstallation(renderer, mouse),
      createCubeInstallation(renderer, mouse),
    ];

    installations.forEach((installation, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-thumb';
      thumb.innerHTML = `
        <img src="/thumbnails/${installation.id}.png" alt="${installation.name}" />
        <p>${installation.name}</p>
      `;
      thumb.addEventListener('click', () => {
        overlay.classList.remove('open');
        _loadInstallation(index);
      });
      grid.appendChild(thumb);

      installation.setup();
    });

    installations[current].start();
  };

  const _setupControls = (): void => {
    tvNoise = createTvNoise(renderer);

    // space: load next
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        _loadInstallation((current + 1) % installations.length);
      }
      if (e.key === 'Escape') {
        overlay.classList.remove('open');
      }
    });

    // menu toggle
    menuBtn.addEventListener('click', () => {
      overlay.classList.toggle('open');
    });

    // close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  };

  const _onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const start = (): void => {
    _setupRenderer();
    _setupInstallations();
    _setupControls();
    window.addEventListener('resize', _onResize);
  };

  return { start };
};

// ── ENTRY POINT ───────────────────────────────────────────────────
window.addEventListener('load', () => createApp().start());
