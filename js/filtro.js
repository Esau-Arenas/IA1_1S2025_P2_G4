import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';

// ————————————————————————————————
// Configuración inicial
// ————————————————————————————————
const currentTarget = JSON.parse(localStorage.getItem('currentTarget')) || {};
let filterPath = '../filtros/lentes2.png'; 
let mindarThree;
let filterMesh;
let filterConfig = {};

// ————————————————————————————————
// Carga configuración de filtros
// ————————————————————————————————
async function loadFilterConfig() {
  const cached = localStorage.getItem('filtrosConfig');
  if (cached) {
    filterConfig = JSON.parse(cached);
    return;
  }
  try {
    const resp = await fetch('../data/filtros.json');
    const data = await resp.json();
    filterConfig = data.filtros || {};
    localStorage.setItem('filtrosConfig', JSON.stringify(filterConfig));
  } catch (e) {
    console.error('No se pudo cargar filtros.json', e);
  }
}

// ————————————————————————————————
// Establece filtro según target
// ————————————————————————————————
async function loadFilterImage() {
  await loadFilterConfig();
  const targetId = Number(currentTarget.id);
  const key = Object.keys(filterConfig).find(k => Number(filterConfig[k].id) === targetId);
  if (key) {
    filterPath = filterConfig[key].path;
  } else {
    console.warn('Filtro por defecto');
  }
}

// ————————————————————————————————
// Arranca la cámara
// ————————————————————————————————
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 }
    });
    const videoEl = document.getElementById('video');
    if (videoEl) {
      videoEl.srcObject = stream;
    }
  } catch (e) {
    console.error('No se pudo acceder a la cámara', e);
  }
}

// ————————————————————————————————
// Inicializa MindAR, Three.js y añade botón de captura
// ————————————————————————————————
async function initFaceFilter() {
  await loadFilterImage();

  mindarThree = new MindARThree({ container: document.body });
  const { renderer, scene, camera } = mindarThree;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.1));

  const headGroup = new THREE.Group();
  const tex = new THREE.TextureLoader().load(filterPath);
  const cfg = Object.values(filterConfig).find(f => f.path === filterPath)
             || { size: [1.5,1], position: [0,0,-0.3] };
  const geom = new THREE.PlaneGeometry(...cfg.size);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8 });
  filterMesh = new THREE.Mesh(geom, mat);
  filterMesh.position.set(...cfg.position);
  headGroup.add(filterMesh);

  scene.add(headGroup);
  mindarThree.addAnchor(168).group.add(headGroup);

  await mindarThree.start();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  // — Botón de captura —
  const btn = document.createElement('button');
  btn.innerText = 'Tomar y Guardar Foto';
  Object.assign(btn.style, {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: 9999
  });

  btn.addEventListener('click', captureScene);
  document.body.appendChild(btn);

  // Función para capturar la escena
  function captureScene() {
    console.log("Botón de captura presionado");
    try {
      // Forzar renderizado actual
      renderer.render(scene, camera);

      // Obtener canvas AR y vídeo
      const arCanvas = renderer.domElement;
      const video = document.getElementById('video');

      // Crear canvas para la captura combinada
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = window.innerWidth;
      captureCanvas.height = window.innerHeight;
      const ctx = captureCanvas.getContext('2d');

      // 1. Dibujar la transmisión de la cámara
      if (video && video.readyState >= 2) {
        console.log("Dibujando vídeo de la cámara");
        ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      }

      // 2. Dibujar el canvas AR con los filtros
      if (arCanvas) {
        console.log("Dibujando filtros AR");
        ctx.drawImage(arCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
      }

      console.log("Generando imagen para descargar...");
      const dataURL = captureCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `filtro_ar_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);

    } catch (error) {
      console.error("Error en captura:", error);
    }
  }
}

// ————————————————————————————————
// Arranca todo tras cargar la página
// ————————————————————————————————
window.addEventListener('load', () => {
  startCamera();
  initFaceFilter();
});