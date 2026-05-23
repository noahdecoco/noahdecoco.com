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

export interface TvNoise {
  start: (onComplete: () => void) => void;
  dispose: () => void;
  mesh: THREE.Mesh;
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

  const start = (onComplete: () => void): void => {
    mesh.visible = true;
    material.uniforms.uProgress.value = 0;
    let isComplete = false;
    const animate = (): void => {
      // Increment progress 0 → 1 over roughly 40 frames
      material.uniforms.uProgress.value += 0.025;
      material.uniforms.uTime.value += 0.1;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);

      // Halfway through — trigger the installation switch
      if (material.uniforms.uProgress.value >= 0.5) {
        if (!isComplete) {
          onComplete();
          isComplete = true;
        }
      }

      // Done — hide and clean up
      if (material.uniforms.uProgress.value >= 1.0) {
        mesh.visible = false;
        if (animationId !== null) cancelAnimationFrame(animationId);
      }
    };

    animate();
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

  return { start, dispose, mesh };
};
