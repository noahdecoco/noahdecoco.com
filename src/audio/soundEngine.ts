import * as Tone from 'tone';
import { createSoundscape, type Soundscape } from './soundscapes';

const MASTER_LEVEL = 0.8;
const FADE_IN = 0.8;
const FADE_OUT = 0.3;
const LEVEL_INTERVAL_MS = 100;

// What an installation can do to the sound of its own channel
export interface ChannelSound {
  trigger: () => void;
  setLevel: (level: number) => void;
}

export const createSoundEngine = () => {
  let enabled = false;
  let channelId = '';
  let scape: Soundscape | null = null;
  let master: Tone.Gain | null = null;
  let bus: Tone.Reverb | null = null;
  let lastLevelAt = 0;

  const _setupOutput = (): void => {
    if (master) return;

    const limiter = new Tone.Limiter(-3).toDestination();
    master = new Tone.Gain(MASTER_LEVEL).connect(limiter);
    bus = new Tone.Reverb({ decay: 6, wet: 0.3 }).connect(master);
  };

  const _startScape = (): void => {
    scape = createSoundscape(channelId, bus!);
    scape?.output.gain.rampTo(1, FADE_IN);
  };

  const _stopScape = (): void => {
    const leaving = scape;
    scape = null;
    if (!leaving) return;

    leaving.output.gain.rampTo(0, FADE_OUT);
    setTimeout(leaving.dispose, (FADE_OUT + 0.1) * 1000);
  };

  // Must be called from a click or key press: browsers block audio otherwise
  const toggle = async (): Promise<boolean> => {
    enabled = !enabled;

    if (!enabled) {
      _stopScape();
      return false;
    }

    await Tone.start();
    if (!enabled) return false; // switched back off while waiting

    _setupOutput();
    _startScape();
    return true;
  };

  const setChannel = (id: string): void => {
    channelId = id;
    if (!enabled) return;

    _stopScape();
    _startScape();
  };

  const playStatic = (): void => {
    if (!enabled || !master) return;

    const noise = new Tone.Noise('white');
    const filterAmount = Math.floor(Math.random() * 200) + 800;
    const filter = new Tone.Filter(filterAmount, 'bandpass');
    const gain = new Tone.Gain(0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start();
    gain.gain.rampTo(0.5, 0.01);

    setTimeout(() => {
      gain.gain.rampTo(0, 0.2);
      setTimeout(() => {
        noise.dispose();
        filter.dispose();
        gain.dispose();
      }, 250);
    }, 300);
  };

  const trigger = (): void => {
    scape?.trigger?.();
  };

  // Installations call this every frame; audio params only need it a few
  // times a second, and each update glides to its value.
  const setLevel = (level: number): void => {
    const now = performance.now();
    if (now - lastLevelAt < LEVEL_INTERVAL_MS) return;

    lastLevelAt = now;
    scape?.setLevel?.(level);
  };

  document.addEventListener('visibilitychange', () => {
    master?.gain.rampTo(document.hidden ? 0 : MASTER_LEVEL, FADE_OUT);
  });

  return { toggle, setChannel, playStatic, trigger, setLevel };
};
