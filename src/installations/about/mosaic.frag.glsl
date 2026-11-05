uniform float uTime;

varying vec2 vUv;

const vec2 GRID = vec2(40.0, 25.0);

float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// A few dim teletext blocks that blink on and off behind the page
void main() {
  vec2 cell = floor(vUv * GRID);
  float slowTime = floor(uTime * 0.5 + random(cell) * 8.0);
  float lit = step(0.96, random(cell + slowTime));

  float hue = random(cell * 1.7) * 3.0;
  vec3 colour = hue < 1.0
    ? vec3(0.0, 1.0, 1.0)
    : hue < 2.0
      ? vec3(1.0, 0.0, 1.0)
      : vec3(0.0, 0.3, 1.0);

  gl_FragColor = vec4(colour * lit * 0.22, 1.0);
}
