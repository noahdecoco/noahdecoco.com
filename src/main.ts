import './styles/main.scss';
import * as THREE from 'three';
import type { Installation } from './installations/types';
import { createMouseTracker } from './input/mouse';
import { createCubeInstallation } from './installations/cube-faces';
import { createParticleInstallation } from './installations/particles';
import { createTvNoise, type TvNoise } from './transitions/noise';
import { createCircularBreathingInstallation } from './installations/circular-breathing';
import { createSoundEngine } from './audio/soundEngine.ts';
import { createJungleMedicineInstallation } from './installations/jungle-medicine';
import { createCrtDisplay } from './tv/crt';
import { createGuide } from './tv/guide';
import { createOsd } from './tv/osd';
import { createRemote } from './tv/remote';

const createApp = () => {
  const soundEngine = createSoundEngine();
  const osd = createOsd(document.getElementById('osd')!);

  // STATE
  let renderer: THREE.WebGLRenderer;
  let installations: Installation[];
  let tvNoise: TvNoise;
  let guide: ReturnType<typeof createGuide>;
  let current = 0;
  let transitioning = false;

  const _setupRenderer = (): void => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.getElementById('three-renderer')!.appendChild(renderer.domElement);
  };

  const _showChannel = (): void => {
    guide.setCurrent(current);
    osd.show(current + 1, installations[current].name);
  };

  const _loadInstallation = (index: number): void => {
    if (transitioning || index === current) return;
    transitioning = true;
    soundEngine.play('static');

    tvNoise.start(
      () => {
        installations[current].stop();
        current = index;
        installations[current].start();
        _showChannel();
      },
      () => {
        transitioning = false;
      }
    );
  };

  const _step = (direction: number): void => {
    const count = installations.length;
    _loadInstallation((current + direction + count) % count);
  };

  const _setupInstallations = (): void => {
    const mouse = createMouseTracker();
    tvNoise = createTvNoise(renderer);
    const display = createCrtDisplay(renderer, tvNoise);

    installations = [
      createJungleMedicineInstallation(renderer, display),
      createParticleInstallation(renderer, display, mouse),
      createCircularBreathingInstallation(renderer, display, mouse),
      createCubeInstallation(renderer, display, mouse),
    ];

    installations.forEach((installation) => installation.setup());
  };

  const _setupControls = (): void => {
    guide = createGuide({
      button: document.getElementById('menu-btn')!,
      overlay: document.getElementById('guide-overlay')!,
      list: document.getElementById('guide-list')!,
      channels: installations,
      onSelect: _loadInstallation,
    });

    createRemote({
      channelCount: installations.length,
      isLocked: guide.isOpen,
      onNext: () => _step(1),
      onPrevious: () => _step(-1),
      onChannel: _loadInstallation,
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

    installations[current].start();
    _showChannel();
  };

  return { start };
};

// ── ENTRY POINT ───────────────────────────────────────────────────
window.addEventListener('load', () => createApp().start());
