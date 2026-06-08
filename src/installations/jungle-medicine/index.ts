import * as THREE from 'three';
import type { Installation } from '../types.ts';
import type { MouseState } from '../../input/mouse.ts';
import medicineVertexShader from './medicine.vert.glsl';
import medicineFragmentShader from './medicine.frag.glsl';

export const createJungleMedicineInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  const DEFAULT_PARAMS = {
    displacementScale: 3.2,
    displacementSpeed: 0.3,
    noiseScale: 1.3,
    iridescenceStrength: 0.8,
    baseColourA: '#73400d',
    baseColourB: '#1c0202',
    oilEnabled: true,
    oilA: '#030d02',
    oilB: '#8e2c1a',
    oilC: '#247208',
    rimColour: '#247208',
  };
  const TIMER = new THREE.Timer();

  let time = 0;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let animationId: number | null = null;
  let raycaster: THREE.Raycaster;
  let touchStartTime = -1.0;

  // SETUP
  let medicineMesh: THREE.Mesh;
  let medicineMaterial: THREE.ShaderMaterial;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
  };

  const _setupLights = (): void => {
    scene.add(new THREE.AmbientLight(0x336633, 0.1));
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

  const _setupMedicine = (): void => {
    const geometry = new THREE.SphereGeometry(5, 800, 800);
    medicineMaterial = new THREE.ShaderMaterial({
      vertexShader: medicineVertexShader,
      fragmentShader: medicineFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDisplacementScale: { value: DEFAULT_PARAMS.displacementScale },
        uDisplacementSpeed: { value: DEFAULT_PARAMS.displacementSpeed },
        uNoiseScale: { value: DEFAULT_PARAMS.noiseScale },
        uIridescenceStrength: { value: 0.8 },
        uBaseColourA: { value: new THREE.Color(DEFAULT_PARAMS.baseColourA) },
        uBaseColourB: { value: new THREE.Color(DEFAULT_PARAMS.baseColourB) },
        uOilEnabled: { value: DEFAULT_PARAMS.oilEnabled },
        uOilA: { value: new THREE.Color(DEFAULT_PARAMS.oilA) },
        uOilB: { value: new THREE.Color(DEFAULT_PARAMS.oilB) },
        uOilC: { value: new THREE.Color(DEFAULT_PARAMS.oilC) },
        uRimColour: { value: new THREE.Color(DEFAULT_PARAMS.rimColour) },
        uMousePos: { value: new THREE.Vector3(0, 0, 0) },
        uTouchTime: { value: -1.0 },
      },
    });
    medicineMesh = new THREE.Mesh(geometry, medicineMaterial);
    medicineMesh.position.z = -10;

    scene.add(medicineMesh);
  };

  // ANIMATE
  const _updateMouseState = (): void => {
    raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
    const intersects = raycaster.intersectObject(medicineMesh);
    if (intersects.length === 0) {
    } else {
      const localPoint = medicineMesh.worldToLocal(intersects[0].point.clone());
      medicineMaterial.uniforms.uMousePos.value.copy(localPoint);
    }
  };

  const _animate = (): void => {
    TIMER.update();
    time += TIMER.getDelta();

    _updateMouseState();

    medicineMaterial.uniforms.uTime.value += TIMER.getDelta();
    medicineMaterial.uniforms.uTouchTime.value = touchStartTime;
    console.log(
      'touchTime:',
      medicineMaterial.uniforms.uTouchTime.value,
      'uTime:',
      medicineMaterial.uniforms.uTime.value,
      'elapsed:',
      medicineMaterial.uniforms.uTime.value -
        medicineMaterial.uniforms.uTouchTime.value
    );
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  // LISTENERS
  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _reset = (): void => {
    time = 0;
  };

  // PUBLIC
  const setup = (): void => {
    _setupScene();
    _setupLights();
    _setupCamera();
    _setupMedicine();
    raycaster = new THREE.Raycaster();
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
    id: 'jungle-medicine',
    name: 'Jungle Medicine',
    setup,
    start,
    stop,
    dispose,
  };
};
