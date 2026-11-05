import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
 `;

const fragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uResolution;

  varying vec2 vUv;
  
  float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec2 st = vUv;
    st.x *= uResolution.x / uResolution.y;

    float noise = random(vUv * 200.0 + uTime * 10.0);
    vec3 colour = vec3(noise);

    float scanline = sin(vUv.y * 800.0) * 0.04;
    colour += scanline;

    float alpha = 1.0 - abs(uProgress * 2.0 - 1.0);

    gl_FragColor = vec4(colour, alpha);
  }
`;

const DURATION_MS = 600;

export interface TvNoise {
  start: (onMidpoint: () => void, onComplete: () => void) => void;
  render: () => void;
  dispose: () => void;
}

export const createTvNoise = (renderer: THREE.WebGLRenderer): TvNoise => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    transparent: true, // needed for alpha to work
    depthWrite: false, // don't write to depth buffer
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);

  mesh.visible = false;
  scene.add(mesh);

  let animationId: number | null = null;

  const _onResize = () => {
    mesh.material.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  };

  const _init = () => {
    window.addEventListener('resize', _onResize);
  };

  const start = (onMidpoint: () => void, onComplete: () => void): void => {
    const startedAt = performance.now();
    let hasSwitched = false;

    mesh.visible = true;
    material.uniforms.uProgress.value = 0;

    const animate = (): void => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      material.uniforms.uProgress.value = progress;
      material.uniforms.uTime.value = elapsed / 100;

      // Halfway through — trigger the installation switch
      if (!hasSwitched && progress >= 0.5) {
        hasSwitched = true;
        onMidpoint();
      }

      // Done — hide and clean up
      if (progress >= 1) {
        mesh.visible = false;
        animationId = null;
        onComplete();
        return;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
  };

  // Drawn by the display, on top of whichever installation is running
  const render = (): void => {
    if (mesh.visible) renderer.render(scene, camera);
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
  };

  const dispose = (): void => {
    stop();

    geometry.dispose();
    material.dispose();
    scene.remove(mesh);

    window.removeEventListener('resize', _onResize);
  };

  _init();

  return { start, render, dispose };
};
