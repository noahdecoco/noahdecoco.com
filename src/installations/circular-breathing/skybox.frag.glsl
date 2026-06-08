varying vec3 vPosition;
uniform float uTime;

float random(vec2 st) {
  return fract(sin(st.x * 127.1 + st.y * 311.7) * 178493.2434);
}

void main() {
  vec3 dir = normalize(vPosition);
  vec3 scaled = dir * 60.0;
  vec2 cell = floor(scaled.xy);
  vec2 local = fract(scaled.xy);  // where within the cell we are
  float r = random(cell);

  float height = dir.y * 0.5 + 0.5;
  vec3 colour = mix(vec3(0.0, 0.01, 0.15), vec3(0.0, 0.11, 0.05), height);

  if (r > 0.95) {
    float temp = random(cell + 0.5);

    vec3 starColour = mix(
    vec3(0.8, 0.9, 1.0),  // cool blue-white
    vec3(1.0, 0.95, 0.8), // warm yellow-white
    temp
    );

    float dist = length(local - 0.5);
    float glow = smoothstep(0.08, 0.0, dist);

    colour += starColour * glow;
  }

  gl_FragColor = vec4(colour, 1.0);
}