varying vec3 vColour;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.5);
  gl_FragColor = vec4(vColour * glow, glow);
}