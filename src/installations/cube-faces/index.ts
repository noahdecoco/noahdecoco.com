import * as THREE from 'three';
import type { Installation, CubeEntity } from '../types.ts';
import { mouseToWorld, type MouseState } from '../../input/mouse.ts';
import { rand } from '../../utils';
import type { Display } from '../../tv/crt.ts';
import type { ChannelSound } from '../../audio/soundEngine.ts';

export const createCubeInstallation = (
  renderer: THREE.WebGLRenderer,
  display: Display,
  mouse: MouseState,
  sound: ChannelSound
): Installation => {
  // PHYSICS
  const HOME_STRENGTH = 0.04;
  const DAMPING = 0.85;
  const MOUSE_RADIUS = 3.5;
  const MOUSE_STRENGTH = 0.15;
  const DISTURBANCE_RANGE = 3; // total cube speed that counts as full tension

  // POKE
  const POKE_REACH = 3; // how far from the pointer a cube can be and still get hit
  const POKE_LAYERS_Z = -2.5; // only the front rows, so the hit is visible
  const POKE_SPEED = 0.14;
  const POKE_SPIN = 0.2;
  const POKED_HOME_STRENGTH = 0.002; // lets the cube sail off before it drifts back
  const POKED_DAMPING = 0.97;
  const POKED_SPIN_DAMPING = 0.985;
  const SHOCK_RADIUS = 5;
  const SHOCK_STRENGTH = 0.5;
  const STARE_MS = 3000;
  const STARE_SPREAD = 0.02; // world units per ms the turning heads spread out at

  // MOUSE
  const mouseWorldPos = new THREE.Vector3();
  const lookAtTarget = new THREE.Quaternion();
  const tempMatrix = new THREE.Matrix4();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const cubePosition = new THREE.Vector3();

  // TEXTURES
  const loader = new THREE.TextureLoader().setPath(
    `${import.meta.env.BASE_URL}textures/`
  );
  const faceTextures = [
    loader.load('right.jpg'),
    loader.load('left.jpg'),
    loader.load('top.jpg'),
    loader.load('bottom.jpg'),
    loader.load('back.jpg'),
    loader.load('front.jpg'),
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
  let disturbance = 0;
  let pokeEnergy = 0; // keeps the sound tense for a moment after a click
  let poked: CubeEntity | null = null;
  let pokedAt = 0;

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

  const _isStaring = (cube: CubeEntity): boolean => {
    if (!poked || cube === poked) return false;
    const reach = (performance.now() - pokedAt) * STARE_SPREAD;
    return (
      (cube.x - poked.x) ** 2 +
        (cube.y - poked.y) ** 2 +
        (cube.z - poked.z) ** 2 <
      reach ** 2
    );
  };

  const _updateCubeLook = (cube: CubeEntity): void => {
    const staring = _isStaring(cube);
    const target = staring ? poked! : mouseWorldPos;
    const dx = target.x - cube.x;
    const dy = target.y - cube.y;
    const dz = target.z - cube.z + (staring ? 0 : 5);

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
      cube.mesh.quaternion.slerp(lookAtTarget, staring ? 0.08 : 0.03);
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

    const isPoked = cube === poked;
    const homeStrength = isPoked ? POKED_HOME_STRENGTH : HOME_STRENGTH;
    const damping = isPoked ? POKED_DAMPING : DAMPING;

    cube.vx += (cube.hx - cube.x) * homeStrength;
    cube.vy += (cube.hy + float - cube.y) * homeStrength;
    cube.vz += (cube.hz + floatY - cube.z) * homeStrength;

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
      disturbance += Math.abs(cube.vx) + Math.abs(cube.vy);
    }

    cube.vx *= damping;
    cube.vy *= damping;
    cube.vz *= damping;

    cube.x += cube.vx;
    cube.y += cube.vy;
    cube.z += cube.vz;

    cube.mesh.position.set(cube.x, cube.y, cube.z);

    const spinDamping = isPoked ? POKED_SPIN_DAMPING : 0.95;
    cube.rvx *= spinDamping;
    cube.rvy *= spinDamping;
    cube.rvz *= spinDamping;

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

  // The cursor pushes cubes away from itself, so a click often lands in a gap.
  // Picking the nearest cube to the click line means a poke still connects.
  const _findPokedCube = (): CubeEntity | null => {
    let nearest: CubeEntity | null = null;
    let nearestDistance = POKE_REACH ** 2;

    for (let i = 0; i < cubes.length; i++) {
      const cube = cubes[i];
      if (cube.z < POKE_LAYERS_Z) continue;

      cubePosition.set(cube.x, cube.y, cube.z);
      const distance = raycaster.ray.distanceSqToPoint(cubePosition);
      if (distance < nearestDistance) {
        nearest = cube;
        nearestDistance = distance;
      }
    }

    return nearest;
  };

  const _spin = (cube: CubeEntity, amount: number): void => {
    cube.rvx = rand(-amount, amount);
    cube.rvy = rand(-amount, amount);
    cube.rvz = rand(-amount, amount);
  };

  const _shockwave = (origin: THREE.Vector3): void => {
    for (let i = 0; i < cubes.length; i++) {
      const cube = cubes[i];
      const dx = cube.x - origin.x;
      const dy = cube.y - origin.y;
      const dz = cube.z - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > SHOCK_RADIUS || dist < 0.001) continue;

      const force = ((1 - dist / SHOCK_RADIUS) * SHOCK_STRENGTH) / cube.mass;
      cube.vx += (dx / dist) * force;
      cube.vy += (dy / dist) * force;
      cube.vz += (dz / dist) * force;
      _spin(cube, 0.05);
    }
  };

  const _onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    _shockwave(mouseToWorld(pointer, camera));

    const cube = _findPokedCube();
    if (cube) {
      poked = cube;
      pokedAt = performance.now();
      // Towards the viewer, so it tumbles out in front of the wall
      cube.vx = rand(-POKE_SPEED, POKE_SPEED);
      cube.vy = rand(-POKE_SPEED, POKE_SPEED);
      cube.vz = POKE_SPEED;
      _spin(cube, POKE_SPIN);
    }

    pokeEnergy = 1;
    sound.trigger();
  };

  const _animate = (): void => {
    time += 0.01;
    if (poked && performance.now() - pokedAt > STARE_MS) poked = null;
    mouseWorldPos.copy(mouseToWorld(mouse, camera));
    _updateLight();
    _updateCamera();
    disturbance = 0;
    for (let i = 0; i < cubes.length; i++) {
      _updateCube(cubes[i]);
    }
    pokeEnergy *= 0.97;
    sound.setLevel(Math.min(disturbance / DISTURBANCE_RANGE + pokeEnergy, 1));
    display.render(scene, camera);
    animationId = requestAnimationFrame(_animate);
  };

  const _onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const _reset = (): void => {
    time = 0;
    poked = null;
    pokeEnergy = 0;
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
    renderer.domElement.addEventListener('pointerdown', _onPointerDown);
    _onResize();
    _animate();
  };

  const stop = (): void => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', _onResize);
    renderer.domElement.removeEventListener('pointerdown', _onPointerDown);
  };

  const dispose = (): void => {
    stop();
    geometry.dispose();
    scene.clear();
  };

  return {
    id: 'cube-faces',
    name: 'Whatcha looking at?',
    hint: 'click or tap to poke a cube',
    setup,
    start,
    stop,
    dispose,
  };
};
