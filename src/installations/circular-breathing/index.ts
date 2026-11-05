import * as THREE from 'three';
import type { Installation } from '../types.ts';
import { rand, randInt } from '../../utils';
import type { MouseState } from '../../input/mouse.ts';
import type { Display } from '../../tv/crt.ts';
import skyboxVertexShader from './skybox.vert.glsl';
import skyboxFragmentShader from './skybox.frag.glsl';
import particlesVertexShader from './particles.vert.glsl';
import particlesFragmentShader from './particles.frag.glsl';

const COLOURS = [
  new THREE.Color(0xa8aadc), // purple
  new THREE.Color(0xf4f1de), // cream
  new THREE.Color(0xa8dadc), // ice blue
  new THREE.Color(0xc9b8e8), // soft lavender
  new THREE.Color(0xb8d4e8), // pale cornflower
  new THREE.Color(0xd4e8e4), // mint mist
  new THREE.Color(0xe8d4f0), // dusty lilac
  new THREE.Color(0xb8c8e8), // periwinkle
];

interface Particle {
  inhaleX: number;
  inhaleY: number;
  inhaleZ: number;
  exhaleX: number;
  exhaleY: number;
  exhaleZ: number;
  offset: number;
  size: number;
  colourIndex: number;
}

export const createCircularBreathingInstallation = (
  renderer: THREE.WebGLRenderer,
  display: Display,
  mouse: MouseState
): Installation => {
  const COUNT = 3000;
  const TIMER = new THREE.Timer();
  const PHASE_DURATION = 5;
  const CYCLE = PHASE_DURATION * 2;
  const MIN_SCALE = 1;
  const MAX_SCALE = 3;
  const DRIFT = 0.5;

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
  let geometry: THREE.BufferGeometry;
  let points: THREE.Points;
  let particles: Particle[];
  let positions: Float32Array;
  let sizes: Float32Array;
  let colours: Float32Array;
  let material: THREE.ShaderMaterial;
  let skyBoxMaterial: THREE.ShaderMaterial;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
  };

  const _setupLights = (): void => {
    light1 = new THREE.PointLight(0xff4422, 30, 30);
    light2 = new THREE.PointLight(0x2244ff, 13, 20);
    light3 = new THREE.PointLight(0x227733, 13, 20);
    scene.add(light1, light2, light3);
    scene.add(new THREE.AmbientLight(0x660000, 0.5));
  };

  const _setupCamera = (): void => {
    camera = new THREE.PerspectiveCamera(
      65,
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
      opacity: 0.5,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    sphereInner = new THREE.Mesh(geometryInner, materialInner);
    scene.add(sphereInner);

    const geometryOuter = new THREE.SphereGeometry(1, 32, 16);
    const materialOuter = new THREE.MeshPhongMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      depthWrite: false,
    });
    sphereOuter = new THREE.Mesh(geometryOuter, materialOuter);
    scene.add(sphereOuter);
  };

  const _setupWireframes = (): void => {
    const scales = [1.1, 1.05, 1.07];
    const opacities = [0.01, 0.02, 0.01];

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
      // scene.add(mesh);
    });
  };

  const _setupSkybox = (): void => {
    const geometry = new THREE.SphereGeometry(70, 32, 32);

    skyBoxMaterial = new THREE.ShaderMaterial({
      vertexShader: skyboxVertexShader,
      fragmentShader: skyboxFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });

    const skyMesh = new THREE.Mesh(geometry, skyBoxMaterial);
    skyMesh.renderOrder = -1;
    scene.add(skyMesh);
  };

  const _setupParticles = (): void => {
    positions = new Float32Array(COUNT * 3);
    colours = new Float32Array(COUNT * 3);
    sizes = new Float32Array(COUNT);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    material = new THREE.ShaderMaterial({
      vertexShader: particlesVertexShader,
      fragmentShader: particlesFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
  };

  const _initParticles = (): void => {
    particles = [];

    for (let i = 0; i < COUNT; i++) {
      // inhale position: inside the sphere
      const inhaleLongitude = rand(0, Math.PI * 2);
      const inhaleLatitude = rand(0, Math.PI);
      const inhaleRadius = rand(0, 2);
      const inhaleX =
        inhaleRadius * Math.sin(inhaleLatitude) * Math.cos(inhaleLongitude);
      const inhaleY =
        inhaleRadius * Math.sin(inhaleLatitude) * Math.sin(inhaleLongitude);
      const inhaleZ = inhaleRadius * Math.cos(inhaleLatitude);

      // exhale position: outside the sphere
      const exhaleLongitude = rand(0, Math.PI * 2);
      const exhaleLatitude = rand(0, Math.PI);
      const exhaleRadius = rand(10, 30);
      const exhaleX =
        exhaleRadius * Math.sin(exhaleLatitude) * Math.cos(exhaleLongitude);
      const exhaleY =
        exhaleRadius * Math.sin(exhaleLatitude) * Math.sin(exhaleLongitude);
      const exhaleZ = exhaleRadius * Math.cos(exhaleLatitude);

      const colourIndex = randInt(0, COLOURS.length - 1);
      const colour = COLOURS[colourIndex];

      particles.push({
        inhaleX,
        inhaleY,
        inhaleZ,
        exhaleX,
        exhaleY,
        exhaleZ,
        size: rand(1, 2),
        offset: rand(0, Math.PI * 2),
        colourIndex,
      });

      positions[i * 3] = exhaleX;
      positions[i * 3 + 1] = exhaleY;
      positions[i * 3 + 2] = exhaleZ;

      colours[i * 3] = colour.r;
      colours[i * 3 + 1] = colour.g;
      colours[i * 3 + 2] = colour.b;

      sizes[i] = rand(0.4, 1.6);
    }
  };

  const easeInOut = (t: number): number => {
    return Math.pow((1 - Math.cos(t * Math.PI)) / 2, 2);
  };

  const getScale = (t: number): number => {
    const phase = t % CYCLE;
    const difference = MAX_SCALE - MIN_SCALE;

    if (phase < PHASE_DURATION) {
      return MIN_SCALE + difference * easeInOut(phase / PHASE_DURATION);
    } else {
      return (
        MAX_SCALE -
        difference * easeInOut((phase - PHASE_DURATION) / PHASE_DURATION)
      );
    }
  };

  const _animateParticles = (t: number): void => {
    const phase = t % CYCLE;
    let progress: number;

    if (phase < PHASE_DURATION) {
      progress = easeInOut(phase / PHASE_DURATION);
    } else {
      progress = 1 - easeInOut((phase - PHASE_DURATION) / PHASE_DURATION);
    }

    for (let i = 0; i < COUNT * 0.8; i++) {
      const p = particles[i];

      // base position: lerp between exhale (outside) and inhale (inside)
      const baseX = p.exhaleX + (p.inhaleX - p.exhaleX) * progress;
      const baseY = p.exhaleY + (p.inhaleY - p.exhaleY) * progress;
      const baseZ = p.exhaleZ + (p.inhaleZ - p.exhaleZ) * progress;

      // constant dust-like drift around base position
      positions[i * 3] = baseX + Math.sin(t * 0.3 + p.offset) * DRIFT;
      positions[i * 3 + 1] = baseY + Math.cos(t * 0.2 + p.offset * 1.3) * DRIFT;
      positions[i * 3 + 2] =
        baseZ + Math.sin(t * 0.25 + p.offset * 0.7) * DRIFT;
    }

    geometry.attributes.position.needsUpdate = true;
  };

  const _animateCamera = () => {
    camera.position.x = Math.sin(time * 0.03) * 10 + mouse.x * 10;
    camera.position.y = mouse.y * 5;
    camera.position.z = Math.cos(time * 0.03) * 10;
    camera.lookAt(0, 0, 0);
  };

  const _animateLights = (): void => {
    const radius = 5;

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
  };

  const _animate = (): void => {
    TIMER.update();
    time += TIMER.getDelta();

    _animateLights();
    _animateParticles(time);
    _animateCamera();

    sphereInner.scale.setScalar(getScale(time));
    sphereOuter.scale.setScalar(getScale(time) + 0.1);
    wireframes.forEach((frame) => {
      frame.scale.setScalar(getScale(time + 0.3));
    });

    display.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _reset = (): void => {
    TIMER.update(); // drop the time that passed while this wasn't running
    time = 0;
  };

  const setup = (): void => {
    _setupScene();
    _setupLights();
    _setupCamera();
    _setupSphere();
    _setupWireframes();
    _setupParticles();
    _setupSkybox();
    _initParticles();
  };

  const start = (): void => {
    _reset();
    window.addEventListener('resize', _onResize);
    _onResize();
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

  return {
    id: 'circular-breathing',
    name: 'A universe breathing',
    setup,
    start,
    stop,
    dispose,
  };
};
