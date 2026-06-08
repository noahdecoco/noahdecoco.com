uniform vec3 uBaseColourA;
uniform vec3 uBaseColourB;
uniform int uOilEnabled;
uniform vec3 uOilA;
uniform vec3 uOilB;
uniform vec3 uOilC;
uniform vec3 uRimColour;
uniform float uIridescenceStrength;

varying float vDisplacement;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vRipple;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float t = vDisplacement * 0.5 + 0.5;

  // Base Colour
  vec3 colourA = uBaseColourA;  // dark chocolate brown
  vec3 colourB = uBaseColourB;  // barely warmer brown, hint of green
  vec3 baseColour = mix(colourA, colourB, t);

  // Fresnel
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
  float peak = max(0.0, vDisplacement);
  float iridescence = fresnel * peak;
  vec3 oilColour = mix(uOilA, mix(uOilB, uOilC, fresnel), fresnel);

//  vec3 colour = hsv2rgb(vec3(t, 0.7, 0.9));
  vec3 colour = baseColour;
  colour += uRimColour * fresnel;
  colour += iridescence * oilColour * float(uOilEnabled);
  colour += vec3(0.8, 0.5, 0.2) * abs(vRipple) * 8.0;

  gl_FragColor = vec4(colour, 1.0);
}