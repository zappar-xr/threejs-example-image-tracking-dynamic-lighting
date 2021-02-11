// Import our ThreeJS dependencies
import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import './index.sass';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import targetImage from '../assets/example-tracking-image.zpt';
import model from '../assets/ZapBolt.glb';

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded
const manager = new ZapparThree.LoadingManager();

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer({ antialias: true });
// Create/enable the renderer to use shadow map
renderer.shadowMap.enabled = true;
// Default ThreeJS ShadowMap
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Add renderer to Dom
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Setup a Zappar camera instead of one of ThreeJS's cameras
const camera = new ZapparThree.Camera();

// The Zappar library needs your WebGL context, so pass it
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
const mainScene = new THREE.Scene();
mainScene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// Set up our image tracker group
// Pass our loading manager in to ensure the progress bar works correctly
const tracker = new ZapparThree.ImageTrackerLoader(manager).load(targetImage);

const trackerGroup = new ZapparThree.ImageAnchorGroup(camera, tracker);
// Add the tracker group to the ThreeJS scene
mainScene.add(trackerGroup);

/** * 3D MODEL ** */

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(model, (gltf) => {
  // Position the loaded content to overlay tracking image
  const { scene } = gltf;

  scene.position.set(0, 0, 0.5);
  scene.scale.set(1.5, 1.5, 1.5);
  scene.rotation.set(0, 10, 0);
  scene.castShadow = true;
  scene.receiveShadow = true;

  // Cast shadow on each child mesh
  // .traverse is an iterator
  scene.traverse((node) => {
    // if there is a node present in the mesh
    if (node instanceof THREE.Mesh) {
      // Let that node cast a shadow
      // eslint-disable-next-line no-param-reassign
      node.castShadow = true;
    }
  });

  // Add the scene to the tracker group
  trackerGroup.add(gltf.scene);
}, undefined, () => {
  // If error thrown
  console.log('An error ocurred loading the GLTF model');
});

/** * STAGE PLANES ** */
// Set up wall
const wallGeometry = new THREE.PlaneBufferGeometry(2, 2);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.receiveShadow = true;
wall.castShadow = true;
// Add wall to scene
trackerGroup.add(wall);

// Set up floor
const floorGeometry = new THREE.PlaneBufferGeometry(2, 2);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.set(0, -1, 0);
floor.receiveShadow = true;
floor.castShadow = true;
floor.rotateX(-Math.PI / 2);
// Add floor to scene
trackerGroup.add(floor);

/** * LIGHTS ** */
// Ambient Light
const ambientLight = new THREE.AmbientLight(0x404040);
// Add light to scene
trackerGroup.add(ambientLight);

// Create a 'bulb'
const bulbLight = new THREE.PointLight(0xffee88, 1);
bulbLight.position.set(0, 0, 1.5);
// Set up shadow properties
bulbLight.shadow.mapSize.width = 512;
bulbLight.shadow.mapSize.height = 512;
bulbLight.shadow.camera.near = 0.5;
bulbLight.shadow.camera.far = 500;
bulbLight.castShadow = true;
// Create a shape so we can see a visual representation of a light source
const bulb = new THREE.Mesh(
  new THREE.SphereBufferGeometry(),
  new THREE.MeshStandardMaterial({
    emissive: 0xffffee,
    emissiveIntensity: 1,
    color: 0x000000,
  }),
);
bulb.scale.set(0.1, 0.1, 0.1);
bulb.castShadow = true;
bulbLight.add(bulb);
// Add bulb to group
trackerGroup.add(bulbLight);

// Hide and show the 3D content when the image is out of view
trackerGroup.imageTracker.onVisible.bind(() => { trackerGroup.visible = true; });
trackerGroup.imageTracker.onNotVisible.bind(() => { trackerGroup.visible = false; });

// Set up our render loop
function render() {
  // Update scene and camera each frame
  requestAnimationFrame(render);
  camera.updateFrame(renderer);

  // Move Light
  const time = Date.now() * 0.0005;
  bulbLight.position.y = Math.cos(time);
  bulbLight.position.x = Math.cos(time);

  // Pass the scene and camera through the renderer
  renderer.render(mainScene, camera);
}
// Call the render func each frame
requestAnimationFrame(render);
