import * as THREE from 'three';
import type { Installation, CubeEntity } from '../types.ts';
import { mouseToWorld, type MouseState } from '../../input/mouse.ts';
import { rand } from '../../utils';

export const createCubeInstallation = (
  renderer: THREE.WebGLRenderer,
  mouse: MouseState
): Installation => {
  // PHYSICS
  const HOME_STRENGTH = 0.04;
  const DAMPING = 0.85;
  const MOUSE_RADIUS = 3.5;
  const MOUSE_STRENGTH = 0.15;

  // MOUSE
  const mouseWorldPos = new THREE.Vector3();
  const lookAtTarget = new THREE.Quaternion();
  const tempMatrix = new THREE.Matrix4();

  // TEXTURES
  const loader = new THREE.TextureLoader();
  const faceTextures = [
    loader.load('/textures/right.jpg'),
    loader.load('/textures/left.jpg'),
    loader.load('/textures/top.jpg'),
    loader.load('/textures/bottom.jpg'),
    loader.load('/textures/back.jpg'),
    loader.load('/textures/front.jpg'),
  ];

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let keyLight: THREE.PointLight;
  let blueLight: THREE.PointLight;
  let pinkLight: THREE.PointLight;
  let cubes: CubeEntity[];
  let geometry: THREE.BoxGeometry;
  let time = 0;
  let animationId: number | null = null;

  const _setupScene = (): void => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);
    scene.fog = new THREE.FogExp2(0x080808, 0.06);
  };

  const _setupLights = (): void => {
    keyLight = new THREE.PointLight(0xffffff, 13, 30);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    blueLight = new THREE.PointLight(0x4488ff, 4, 30);
    blueLight.position.set(-2, -3, 3);
    scene.add(blueLight);

    pinkLight = new THREE.PointLight(0xff4422, 3, 20);
    pinkLight.position.set(0, -5, -5);
    scene.add(pinkLight);

    const redLight = new THREE.PointLight(0xff4422, 2, 200);
    redLight.position.set(10, 5, -5);
    scene.add(redLight);

    scene.add(new THREE.AmbientLight(0x111111, 1));
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

  const _createMaterials = (): THREE.MeshPhongMaterial[] =>
    faceTextures.map(
      (tex) =>
        new THREE.MeshPhongMaterial({
          map: tex,
          shininess: 60,
          specular: new THREE.Color(0x444444),
        })
    );

  const _setupCubes = (): void => {
    cubes = [];
    geometry = new THREE.BoxGeometry(1, 1, 1);
    const sharedMaterials = _createMaterials();

    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        for (let z = -5; z <= 1; z++) {
          const hx = x * 2.2;
          const hy = y * 2.2;
          const hz = z * 2.2;

          const mesh = new THREE.Mesh(geometry, sharedMaterials);
          mesh.position.set(hx, hy, hz);
          mesh.castShadow = true;
          scene.add(mesh);

          cubes.push({
            mesh,
            hx,
            hy,
            hz,
            x: hx,
            y: hy,
            z: hz,
            vx: 0,
            vy: 0,
            vz: 0,
            rvx: rand(-0.01, 0.01),
            rvy: rand(-0.02, 0.02),
            rvz: rand(-0.01, 0.01),
            scale: 0,
            targetScale: rand(0.4, 0.9),
            mass: rand(0.5, 2.0),
            phaseOffset: rand(0, Math.PI * 2),
          });
        }
      }
    }
  };

  const _updateCubeLook = (cube: CubeEntity): void => {
    const dx = mouseWorldPos.x - cube.x;
    const dy = mouseWorldPos.y - cube.y;
    const dz = mouseWorldPos.z - cube.z + 5;

    tempMatrix.lookAt(
      new THREE.Vector3(cube.x, cube.y, cube.z),
      new THREE.Vector3(cube.x + dx, cube.y + dy, cube.z + dz),
      new THREE.Vector3(0, 1, 0)
    );
    lookAtTarget.setFromRotationMatrix(tempMatrix);

    // Only look at mouse when close to home — free spin otherwise
    const distFromHome = Math.sqrt(
      (cube.x - cube.hx) ** 2 +
        (cube.y - cube.hy) ** 2 +
        (cube.z - cube.hz) ** 2
    );

    if (distFromHome < 0.5) {
      cube.mesh.quaternion.slerp(lookAtTarget, 0.03);
    } else {
      cube.mesh.rotation.x += cube.rvx;
      cube.mesh.rotation.y += cube.rvy;
      cube.mesh.rotation.z += cube.rvz;
    }
  };

  const _updateCube = (cube: CubeEntity): void => {
    cube.scale += (cube.targetScale - cube.scale) * 0.02;
    cube.mesh.scale.setScalar(cube.scale);

    const float = Math.sin(time * 0.8 + cube.phaseOffset) * 0.08;
    const floatY = Math.cos(time * 0.5 + cube.phaseOffset * 1.3) * 0.05;

    cube.vx += (cube.hx - cube.x) * HOME_STRENGTH;
    cube.vy += (cube.hy + float - cube.y) * HOME_STRENGTH;
    cube.vz += (cube.hz + floatY - cube.z) * HOME_STRENGTH;

    const dx = cube.x - mouseWorldPos.x;
    const dy = cube.y - mouseWorldPos.y;
    const dz = cube.z - mouseWorldPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < MOUSE_RADIUS && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const force = ((1.0 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH) / cube.mass;

      cube.vx += nx * force;
      cube.vy += ny * force;
      cube.vz += nz * force;
    }

    cube.vx *= DAMPING;
    cube.vy *= DAMPING;
    cube.vz *= DAMPING;

    cube.x += cube.vx;
    cube.y += cube.vy;
    cube.z += cube.vz;

    cube.mesh.position.set(cube.x, cube.y, cube.z);

    cube.rvx *= 0.95;
    cube.rvy *= 0.95;
    cube.rvz *= 0.95;

    _updateCubeLook(cube);
  };

  const _updateLight = (): void => {
    keyLight.position.x = mouse.x * 8;
    keyLight.position.y = mouse.y * 8;
  };

  const _updateCamera = (): void => {
    camera.position.x += (mouse.x * 5 - camera.position.x) * 0.02;
    camera.position.y += (mouse.y * 5 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  };

  const _animate = (): void => {
    time += 0.01;
    mouseWorldPos.copy(mouseToWorld(mouse, camera));
    _updateLight();
    _updateCamera();
    for (let i = 0; i < cubes.length; i++) {
      _updateCube(cubes[i]);
    }
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
    cubes.forEach((cube) => {
      cube.x = cube.hx;
      cube.y = cube.hy;
      cube.z = cube.hz;
      cube.vx = 0;
      cube.vy = 0;
      cube.vz = 0;
      cube.scale = 0;
      cube.mesh.position.set(cube.hx, cube.hy, cube.hz);
      cube.mesh.rotation.set(0, 0, 0);
    });
  };

  const setup = (): void => {
    _setupScene();
    _setupLights();
    _setupCamera();
    _setupCubes();
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
    geometry.dispose();
    scene.clear();
  };

  return {
    id: 'cube-faces',
    name: 'Whatcha looking at?',
    setup,
    start,
    stop,
    dispose,
  };
};
