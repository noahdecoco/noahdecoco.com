import * as Tone from 'tone';

export type Sound = 'static' | 'whoosh' | 'sparkle';

export const createSoundEngine = () => {
  const play = (sound: Sound) => {
    switch (sound) {
      case 'static':
        _playStatic();
        break;
    }
  };

  const _playStatic = (): void => {
    const noise = new Tone.Noise('white');
    const filterAmount = Math.floor(Math.random() * 200) + 800;
    const filter = new Tone.Filter(filterAmount, 'bandpass');
    const gain = new Tone.Gain(0);

    noise.connect(filter);
    filter.connect(gain);
    gain.toDestination();

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

  return { play };
};
