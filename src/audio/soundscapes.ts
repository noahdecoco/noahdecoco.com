import * as Tone from 'tone';
import { rand } from '../utils';

const GLIDE = 0.15;

export interface Soundscape {
  output: Tone.Gain;
  trigger?: () => void;
  setLevel?: (level: number) => void;
  dispose: () => void;
}

type Disposable = { dispose: () => unknown };

const pick = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

// Every channel starts silent, and the engine fades it in
const createOutput = (bus: Tone.ToneAudioNode) => {
  const nodes: Disposable[] = [];
  const output = new Tone.Gain(0).connect(bus);
  const track = <T extends Disposable>(node: T): T => {
    nodes.push(node);
    return node;
  };

  return {
    output,
    track,
    dispose: () => [...nodes, output].forEach((node) => node.dispose()),
  };
};

// A low, slowly breathing drone. Ripples ring a soft bell.
const createJungleSound = (bus: Tone.ToneAudioNode): Soundscape => {
  const { output, track, dispose } = createOutput(bus);

  const filter = track(new Tone.Filter(180, 'lowpass')).connect(output);
  track(new Tone.LFO(0.07, 120, 320).start()).connect(filter.frequency);
  [55, 55.6].forEach((frequency) => {
    const voice = track(new Tone.Oscillator(frequency, 'sawtooth').start());
    voice.volume.value = -18;
    voice.connect(filter);
  });

  const earth = track(new Tone.Noise('brown').start()).connect(filter);
  earth.volume.value = -24;

  const bell = track(
    new Tone.FMSynth({
      harmonicity: 2.5,
      modulationIndex: 6,
      envelope: { attack: 0.005, decay: 1.2, sustain: 0, release: 1.5 },
      volume: -4,
    })
  ).connect(output);

  return {
    output,
    dispose,
    trigger: () => {
      bell.triggerAttackRelease(pick(['A3', 'C4', 'E4', 'G4']), 0.3);
    },
  };
};

// Warm notes drifting in at random. Explosions burst with a bright chord.
const createParticleSound = (bus: Tone.ToneAudioNode): Soundscape => {
  const { output, track, dispose } = createOutput(bus);
  let timer: ReturnType<typeof setTimeout>;

  const bed = track(new Tone.Oscillator('D3', 'sine').start()).connect(output);
  bed.volume.value = -26;

  const shimmer = track(
    new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 1.2, decay: 0.5, sustain: 0.4, release: 2.5 },
      volume: -18,
    })
  ).connect(output);

  const chord = track(
    new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 1 },
      volume: -12,
    })
  ).connect(output);

  const burstFilter = track(new Tone.Filter(1800, 'bandpass')).connect(output);
  const burst = track(
    new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0 },
      volume: -10,
    })
  ).connect(burstFilter);

  const _drift = (): void => {
    shimmer.triggerAttackRelease(
      pick(['D4', 'E4', 'F#4', 'A4', 'B4', 'D5']),
      2
    );
    timer = setTimeout(_drift, rand(1200, 2600));
  };
  _drift();

  return {
    output,
    trigger: () => {
      burst.triggerAttackRelease(0.1);
      chord.triggerAttackRelease(['D4', 'A4', 'D5'], 0.2);
    },
    dispose: () => {
      clearTimeout(timer);
      dispose();
    },
  };
};

// A chord and a rush of air that open and close with the breath
const createBreathingSound = (bus: Tone.ToneAudioNode): Soundscape => {
  const { output, track, dispose } = createOutput(bus);

  const pad = track(new Tone.Gain(0.2)).connect(output);
  const filter = track(new Tone.Filter(250, 'lowpass')).connect(pad);
  [110, 164.81, 220].forEach((frequency) => {
    const voice = track(new Tone.Oscillator(frequency, 'triangle').start());
    voice.volume.value = -12;
    voice.connect(filter);
  });

  const air = track(new Tone.Gain(0)).connect(output);
  const airFilter = track(new Tone.Filter(900, 'bandpass')).connect(air);
  const noise = track(new Tone.Noise('pink').start()).connect(airFilter);
  noise.volume.value = -14;

  return {
    output,
    dispose,
    setLevel: (level) => {
      pad.gain.rampTo(0.2 + level * 0.5, GLIDE);
      filter.frequency.rampTo(250 + level * 1300, GLIDE);
      air.gain.rampTo(level * 0.5, GLIDE);
    },
  };
};

// A clashing, pulsing tone that speeds up as the cubes are disturbed
const createCubeSound = (bus: Tone.ToneAudioNode): Soundscape => {
  const { output, track, dispose } = createOutput(bus);

  const tension = track(new Tone.Gain(0.3)).connect(output);
  const pulse = track(new Tone.Gain(0.3)).connect(tension);
  const lfo = track(new Tone.LFO(1.5, 0.1, 0.5).start());
  lfo.connect(pulse.gain);

  ['B2', 'C3'].forEach((note) => {
    const voice = track(new Tone.Oscillator(note, 'sine').start());
    voice.volume.value = -6;
    voice.connect(pulse);
  });

  const hiss = track(new Tone.Gain(0)).connect(output);
  const hissFilter = track(new Tone.Filter(4000, 'highpass')).connect(hiss);
  track(new Tone.Noise('white').start()).connect(hissFilter);

  return {
    output,
    dispose,
    setLevel: (level) => {
      tension.gain.rampTo(0.3 + level * 0.7, GLIDE);
      lfo.frequency.rampTo(1.5 + level * 6, GLIDE);
      hiss.gain.rampTo(level * 0.05, GLIDE);
    },
  };
};

const SOUNDSCAPES: Record<string, (bus: Tone.ToneAudioNode) => Soundscape> = {
  'jungle-medicine': createJungleSound,
  'exploding-lights': createParticleSound,
  'circular-breathing': createBreathingSound,
  'cube-faces': createCubeSound,
};

export const createSoundscape = (
  id: string,
  bus: Tone.ToneAudioNode
): Soundscape | null => SOUNDSCAPES[id]?.(bus) ?? null;
