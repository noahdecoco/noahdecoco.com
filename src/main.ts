import './styles/main.scss';
import { createAnalytics } from './analytics';
import * as THREE from 'three';
import type { Installation } from './installations/types';
import { createMouseTracker } from './input/mouse';
import { createCubeInstallation } from './installations/cube-faces';
import { createParticleInstallation } from './installations/particles';
import { createTvNoise, type TvNoise } from './transitions/noise';
import { createCircularBreathingInstallation } from './installations/circular-breathing';
import { createSoundEngine } from './audio/soundEngine.ts';
import { createJungleMedicineInstallation } from './installations/jungle-medicine';
import { createAboutInstallation } from './installations/about';
import { createCrtDisplay } from './tv/crt';
import { createGuide } from './tv/guide';
import { createOsd } from './tv/osd';
import { createRemote } from './tv/remote';

// Each channel's number is its position, so the list starts with CH 00
const OPENING_CHANNEL = 1;

const createApp = () => {
  const soundEngine = createSoundEngine();
  const soundBtn = document.getElementById('sound-btn')!;
  const osd = createOsd(document.getElementById('osd')!);

  // STATE
  let renderer: THREE.WebGLRenderer;
  let installations: Installation[];
  let tvNoise: TvNoise;
  let guide: ReturnType<typeof createGuide>;
  let current = OPENING_CHANNEL;
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
    soundEngine.setChannel(installations[current].id);
    const { name, hint } = installations[current];
    osd.show(current, name, hint);
  };

  const _loadInstallation = (index: number): void => {
    if (transitioning || index === current) return;
    transitioning = true;
    soundEngine.playStatic();

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
      createAboutInstallation(display),
      createJungleMedicineInstallation(renderer, display, soundEngine),
      createParticleInstallation(renderer, display, mouse, soundEngine),
      createCircularBreathingInstallation(
        renderer,
        display,
        mouse,
        soundEngine
      ),
      createCubeInstallation(renderer, display, mouse, soundEngine),
    ];

    installations.forEach((installation) => installation.setup());
  };

  const _toggleSound = async (): Promise<void> => {
    const on = await soundEngine.toggle();
    soundBtn.textContent = on ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(on));
  };

  const _setupControls = (): void => {
    soundBtn.addEventListener('click', _toggleSound);

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
      onMute: _toggleSound,
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
window.addEventListener('load', () => {
  createAnalytics();
  createApp().start();
});
