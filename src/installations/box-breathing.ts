import * as THREE from 'three';
import type { Installation } from './types';

export const createBoxBreathingInstallation = (
  renderer: THREE.WebGLRenderer
): Installation => {
  const TIMER = new THREE.Timer();
  const PHASE_DURATION = 4;
  const CYCLE = PHASE_DURATION * 4;
  const MIN_SCALE = 1;
  const MAX_SCALE = 3;

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let time = 0;
  let animationId: number | null = null;
  let sphereInner: THREE.Mesh;
  let sphereOuter: THREE.Mesh;
  let wireframes: THREE.Mesh[] = [];
  let light1: THREE.PointLight;
  let light2: THREE.PointLight;
  let light3: THREE.PointLight;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
  };

  const _setupLights = (): void => {
    light1 = new THREE.PointLight(0xff4422, 13, 20);
    light2 = new THREE.PointLight(0x2244ff, 13, 20);
    light3 = new THREE.PointLight(0x227733, 13, 20);
    scene.add(light1, light2, light3);
    scene.add(new THREE.AmbientLight(0xffff00, 0.1));
  };

  const _setupCamera = (): void => {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 10;
  };

  const _setupSphere = (): void => {
    const geometryInner = new THREE.SphereGeometry(1, 32, 16);
    const materialInner = new THREE.MeshPhongMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.8,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    sphereInner = new THREE.Mesh(geometryInner, materialInner);
    scene.add(sphereInner);

    const geometryOuter = new THREE.SphereGeometry(1, 32, 16);
    const materialOuter = new THREE.MeshPhongMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      depthWrite: false,
    });
    sphereOuter = new THREE.Mesh(geometryOuter, materialOuter);
    scene.add(sphereOuter);
  };

  const _setupWireframes = (): void => {
    const scales = [1.02, 1.05, 1.07, 1.13];
    const opacities = [0.3, 0.15, 0.07, 0.05];

    scales.forEach((s, i) => {
      const geo = new THREE.SphereGeometry(s, 16, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        wireframe: true,
        transparent: true,
        opacity: opacities[i],
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      wireframes.push(mesh);
      scene.add(mesh);
    });
  };

  const easeInOut = (t: number, o: number = 0): number => {
    return (1 - Math.cos((t + o) * Math.PI)) / 2;
  };

  const getScale = (t: number): number => {
    const phase = t % CYCLE;
    const difference = MAX_SCALE - MIN_SCALE;

    if (phase < PHASE_DURATION) {
      return MIN_SCALE + difference * easeInOut(phase / PHASE_DURATION);
    } else if (phase < PHASE_DURATION * 2) {
      return MAX_SCALE;
    } else if (phase < PHASE_DURATION * 3) {
      return (
        MAX_SCALE -
        difference * easeInOut((phase - PHASE_DURATION * 2) / PHASE_DURATION)
      );
    } else {
      return MIN_SCALE;
    }
  };

  const _animateLights = (): void => {
    const radius = 5;

    // orbit at different speeds
    light1.position.set(
      Math.sin(time * 0.4) * radius,
      Math.cos(time * 0.3) * radius,
      Math.cos(time * 0.5) * radius
    );
    light2.position.set(
      Math.cos(time * 0.5) * radius,
      Math.sin(time * 0.4) * radius,
      Math.sin(time * 0.3) * radius
    );
    light3.position.set(
      Math.sin(time * 0.3 + Math.PI) * radius,
      Math.cos(time * 0.5 + Math.PI) * radius,
      Math.sin(time * 0.4) * radius
    );

    const hueShift = (time * 0.02) % 1;
    light1.color.setHSL((0.0 + hueShift) % 1, 1.0, 0.5); // red family
    light2.color.setHSL((0.6 + hueShift) % 1, 1.0, 0.5); // blue family
    light3.color.setHSL((0.3 + hueShift) % 1, 1.0, 0.5); // green family

    const breathT = (time % CYCLE) / CYCLE;
    const pulse = 8 + easeInOut(breathT) * 10;
    light1.intensity = pulse;
    light2.intensity = pulse * 0.8;
    light3.intensity = pulse * 0.6;
  };

  const _animate = (): void => {
    TIMER.update();
    time += TIMER.getDelta();

    _animateLights();

    sphereInner.scale.setScalar(getScale(time));
    sphereOuter.scale.setScalar(getScale(time) + 0.1);
    wireframes.forEach((frame) => {
      frame.scale.setScalar(getScale(time + 0.3));
    });

    camera.position.x = Math.sin(time * 0.15) * 10;
    camera.position.z = Math.cos(time * 0.15) * 10;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _reset = (): void => {
    time = 0;
  };

  const setup = (): void => {
    _setupScene();
    _setupLights();
    _setupCamera();
    _setupSphere();
    _setupWireframes();
  };

  const start = (): void => {
    _reset();
    window.addEventListener('resize', _onResize);
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', _onResize);
  };

  const dispose = (): void => {
    stop();
    scene.clear();
  };

  return { setup, start, stop, dispose };
};
