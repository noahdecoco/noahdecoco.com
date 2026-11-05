uniform sampler2D uFrame;
uniform vec2 uResolution;
uniform float uTime;
uniform float uFlicker;

varying vec2 vUv;

const float PI = 3.14159265;
const float CURVATURE = 0.035;
const float ABERRATION = 0.005;
const float SCANLINE_STRENGTH = 0.1;
const float SCANLINE_PERIOD = 3.0; // CSS pixels
const float VIGNETTE = 0.3;

// Bulge the picture so only its corners fall off the glass
vec2 curve(vec2 uv) {
  vec2 centred = uv * 2.0 - 1.0;
  centred *= (1.0 + CURVATURE * dot(centred, centred)) / (1.0 + CURVATURE);
  return centred * 0.5 + 0.5;
}

void main() {
  vec2 uv = curve(vUv);

  // Colour fringing grows towards the edges
  vec2 fringe = (uv - 0.5) * ABERRATION;
  vec3 colour = vec3(
    texture2D(uFrame, uv + fringe).r,
    texture2D(uFrame, uv).g,
    texture2D(uFrame, uv - fringe).b
  );

  float scanline = 0.5 + 0.5 * sin(uv.y * uResolution.y * 2.0 * PI / SCANLINE_PERIOD);
  colour *= 1.0 - SCANLINE_STRENGTH * scanline;
  colour *= 1.0 + SCANLINE_STRENGTH * 0.5; // win back the scanline dimming

  vec2 centred = uv * 2.0 - 1.0;
  colour *= 1.0 - VIGNETTE * pow(dot(centred, centred) * 0.5, 1.5);
  colour *= 1.0 + uFlicker * 0.012 * sin(uTime * 90.0);

  // Soft black edge where the picture leaves the glass
  vec2 edge = smoothstep(vec2(0.0), vec2(0.004), uv) * smoothstep(vec2(0.0), vec2(0.004), 1.0 - uv);
  colour *= edge.x * edge.y;

  gl_FragColor = vec4(colour, 1.0);
}
