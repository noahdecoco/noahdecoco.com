export const rand = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));
