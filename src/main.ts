import "./style.css";
import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/Addons.js";

interface HoveredObject {
  name: string;
  position: THREE.Vector3;
  offset: THREE.Vector3;
}

const appContainer = document.querySelector("#app") as HTMLDivElement;
if (!appContainer) {
  throw new Error("app container is undefined");
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(999, 999);

let pointerDown = false;

const gridWidth = 10;
const gridHeight = 10;
const voxelSize = 0.1;

start();

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  appContainer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#212121");

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  scene.add(camera);

  camera.position.z = -1;
  camera.position.y = 1;
  // camera.position.x = 1;

  const { gridElements, previewVoxelElement } = createGrid(
    scene,
    gridWidth,
    gridHeight,
    voxelSize
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: null,
  };

  function render() {
    controls.update();

    const hoveredObject = getHoveredObject(camera, gridElements);

    if (hoveredObject) {
      const { x, y, z } = hoveredObject.position;

      previewVoxelElement.position.set(x, y, z);
      previewVoxelElement.material.visible = true;

      if (pointerDown) {
        throttledAddVoxel({
          scene,
          gridElements,
          hoveredObject,
          previewVoxelElement,
        });
      }
    } else {
      previewVoxelElement.material.visible = false;
    }

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(render);

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("pointerdown", () => {
    pointerDown = true;
  });
  window.addEventListener("pointerup", () => {
    pointerDown = false;
  });
}

function createGrid(
  scene: THREE.Scene,
  width: number,
  height: number,
  size: number
) {
  const gridElements: THREE.Mesh[] = [];

  const previewVoxelElement = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size).translate(
      size / 2,
      size / 2,
      size / 2
    ),
    new THREE.MeshBasicMaterial({
      color: "green",
      transparent: true,
      opacity: 0.5,
      visible: false,
    })
  );
  scene.add(previewVoxelElement);

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const gridElement = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size)
          .rotateX(-Math.PI / 2)
          .translate(size / 2, 0, size / 2),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      gridElement.name = "grid_element";

      gridElement.position.x = (i - width / 2) * size;
      gridElement.position.z = (j - height / 2) * size;

      const selectionBox = new THREE.BoxHelper(gridElement, "#fff");
      scene.add(gridElement);
      scene.add(selectionBox);

      gridElements.push(gridElement);
    }
  }

  return {
    gridElements,
    previewVoxelElement,
  };
}

function getHoveredObject(
  camera: THREE.Camera,
  gridElements: THREE.Mesh[]
): HoveredObject | null {
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(gridElements);

  if (intersects.length && intersects[0].face) {
    const hoveredObject = intersects[0].object;

    return {
      name: hoveredObject.name,
      position: hoveredObject.position,
      offset: intersects[0].face.normal.multiplyScalar(voxelSize),
    };
  } else {
    return null;
  }
}

function addVoxel({
  scene,
  gridElements,
  hoveredObject,
  previewVoxelElement,
}: {
  scene: THREE.Scene;
  gridElements: THREE.Mesh[];
  hoveredObject: HoveredObject;
  previewVoxelElement: THREE.Mesh;
}) {
  const newVoxel = new THREE.Mesh(
    new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize).translate(
      voxelSize / 2,
      voxelSize / 2,
      voxelSize / 2
    ),
    new THREE.MeshBasicMaterial({
      color: "red",
    })
  );

  if (hoveredObject.name === "grid_element") {
    newVoxel.position.set(
      previewVoxelElement.position.x,
      previewVoxelElement.position.y,
      previewVoxelElement.position.z
    );
  } else {
    newVoxel.position.set(
      previewVoxelElement.position.x + hoveredObject.offset.x,
      previewVoxelElement.position.y + hoveredObject.offset.y,
      previewVoxelElement.position.z + hoveredObject.offset.z
    );
  }

  scene.add(newVoxel);
  gridElements.push(newVoxel);
}
const throttledAddVoxel = throttle(addVoxel, 100);

function throttle<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) {
  let isWaiting = false;

  return (...args: T) => {
    if (isWaiting) {
      return;
    }

    callback(...args);
    isWaiting = true;

    setTimeout(() => {
      isWaiting = false;
    }, delay);
  };
}
