import * as THREE from 'three';
import type { Installation } from './types';
import type { MouseState } from '../input/mouse';

// ── SHADERS ───────────────────────────────────────────────────────
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const psychedelicFrag = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec2 rotate(vec2 uv, float angle) {
    float s = sin(angle); float c = cos(angle);
    return vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uResolution.x / uResolution.y;

    vec2 mouse = uMouse - 0.5;
    uv += mouse * 0.15;

    float t = uTime * 0.3;

    float n1 = snoise(vec3(uv * 1.5, t * 0.4));
    vec2 uv2 = rotate(uv, t * 0.2 + n1 * 0.5);
    float n2 = snoise(vec3(uv2 * 3.0, t * 0.6 + 1.5));
    vec2 uv3 = rotate(uv2, n2 * 1.2);
    float n3 = snoise(vec3(uv3 * 6.0, t * 1.1 + 3.0));

    float combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    float dist = length(uv);
    float vortex = atan(uv.y, uv.x) / (3.14159 * 2.0);
    float tunnel = fract(vortex + combined * 0.4 + t * 0.15);
    float rings = sin(dist * 12.0 - t * 2.0 + combined * 3.0) * 0.5 + 0.5;

    float hue = fract(combined * 0.3 + dist * 0.2 + t * 0.08 + tunnel * 0.2);
    float saturation = 0.7 + rings * 0.3;
    float brightness = clamp(0.4 + combined * 0.35 + rings * 0.25, 0.0, 1.0);

    vec3 colour = hsv2rgb(vec3(hue, saturation, brightness));
    colour = mix(colour, vec3(0.02, 0.0, 0.05), smoothstep(0.6, 0.0, dist) * 0.6);
    colour *= smoothstep(0.9, 0.3, dist);

    gl_FragColor = vec4(colour, 1.0);
  }
`;

const feedbackFrag = `
  uniform sampler2D uCurrent;
  uniform sampler2D uPrevious;
  uniform vec2 uMouse;
  uniform vec2 uPrevMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 mouseDelta = uMouse - uPrevMouse;
    float mouseSpeed = length(mouseDelta * uResolution);

    vec2 toMouse = uMouse - vUv;
    toMouse.x *= uResolution.x / uResolution.y;
    float distToMouse = length(toMouse);

    float smearStrength = smoothstep(0.15, 0.0, distToMouse);
    float retention = mix(
      0.05,
      0.85,
      smearStrength * clamp(mouseSpeed * 0.003, 0.0, 1.0)
    );

    gl_FragColor = mix(
      texture2D(uCurrent, vUv),
      texture2D(uPrevious, vUv),
      retention
    );
  }
`;

const displayFrag = `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

// ── FACTORY ───────────────────────────────────────────────────────
export const createPsychedelicInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  // CONSTANTS
  const RT_PARAMS = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  };

  // STATE
  let psychScene: THREE.Scene;
  let feedbackScene: THREE.Scene;
  let displayScene: THREE.Scene;
  let orthoCamera: THREE.OrthographicCamera;
  let plane: THREE.PlaneGeometry;
  let psychMat: THREE.ShaderMaterial;
  let feedbackMat: THREE.ShaderMaterial;
  let displayMat: THREE.ShaderMaterial;
  let rtA: THREE.WebGLRenderTarget;
  let rtB: THREE.WebGLRenderTarget;
  let clock: THREE.Clock;
  let prevMouse: THREE.Vector2;
  let animationId: number | null = null;

  const _setupCamera = (): void => {
    orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  };

  const _setupGeometry = (): void => {
    plane = new THREE.PlaneGeometry(2, 2);
  };

  const _setupRenderTargets = (): void => {
    rtA = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      RT_PARAMS
    );
    rtB = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      RT_PARAMS
    );
  };

  const _setupScenes = (): void => {
    psychMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: psychedelicFrag,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
    });

    feedbackMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: feedbackFrag,
      uniforms: {
        uCurrent: { value: null },
        uPrevious: { value: null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
    });

    displayMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: displayFrag,
      uniforms: {
        uTexture: { value: null },
      },
    });

    psychScene = new THREE.Scene();
    psychScene.add(new THREE.Mesh(plane, psychMat));

    feedbackScene = new THREE.Scene();
    feedbackScene.add(new THREE.Mesh(plane, feedbackMat));

    displayScene = new THREE.Scene();
    displayScene.add(new THREE.Mesh(plane, displayMat));
  };

  const _renderPass1 = (elapsed: number, mx: number, my: number): void => {
    psychMat.uniforms.uTime.value = elapsed;
    psychMat.uniforms.uMouse.value.set(mx, my);
    renderer.setRenderTarget(rtA);
    renderer.render(psychScene, orthoCamera);
  };

  const _renderPass2 = (mx: number, my: number): void => {
    feedbackMat.uniforms.uCurrent.value = rtA.texture;
    feedbackMat.uniforms.uPrevious.value = rtB.texture;
    feedbackMat.uniforms.uMouse.value.set(mx, my);
    feedbackMat.uniforms.uPrevMouse.value.copy(prevMouse);
    renderer.setRenderTarget(rtB);
    renderer.render(feedbackScene, orthoCamera);
  };

  const _renderPass3 = (): void => {
    displayMat.uniforms.uTexture.value = rtB.texture;
    renderer.setRenderTarget(null);
    renderer.render(displayScene, orthoCamera);
  };

  const _swapBuffers = (): void => {
    const temp = rtA;
    rtA = rtB;
    rtB = temp;
  };

  const _animate = (): void => {
    const elapsed = clock.getElapsedTime();
    const mx = mouse.x * 0.5 + 0.5;
    const my = mouse.y * 0.5 + 0.5;

    _renderPass1(elapsed, mx, my);
    _renderPass2(mx, my);
    _renderPass3();
    _swapBuffers();

    prevMouse.set(mx, my);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    rtA.setSize(window.innerWidth, window.innerHeight);
    rtB.setSize(window.innerWidth, window.innerHeight);
    psychMat.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
    feedbackMat.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  };

  const _reset = (): void => {
    clock.stop();
    clock.start();
    prevMouse.set(0.5, 0.5);
    rtA.setSize(window.innerWidth, window.innerHeight);
    rtB.setSize(window.innerWidth, window.innerHeight);
  };

  const setup = (): void => {
    _setupCamera();
    _setupGeometry();
    _setupRenderTargets();
    _setupScenes();
    clock = new THREE.Clock();
    prevMouse = new THREE.Vector2(0.5, 0.5);
  };

  const start = (): void => {
    _reset();
    window.addEventListener('resize', _onResize);
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', _onResize);
    clock.stop();
  };

  const dispose = (): void => {
    stop();
    rtA.dispose();
    rtB.dispose();
    psychMat.dispose();
    feedbackMat.dispose();
    displayMat.dispose();
    plane.dispose();
    psychScene.clear();
    feedbackScene.clear();
    displayScene.clear();
  };

  return { setup, start, stop, dispose };
};
