// IMPORTS al tope
import * as THREE from "three";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { MindARThree } from "mindar-face-three";

// Variables AR
let mindarThree, filterMesh;

// Función que inicia cámara y AR
// Función que inicia cámara y AR
async function initAR() {
  // 1) cámara espejo
  let video = document.querySelector("#ar-container video");
  if (!video) {
    video = document.createElement("video");
    video.id = "ar-video";
    video.autoplay = video.muted = video.playsInline = true;
    Object.assign(video.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: "scaleX(-1)",
    });
    document.getElementById("ar-container").appendChild(video);
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
  });
  video.srcObject = stream;

  // 2) MindAR
  mindarThree = new MindARThree({
    container: document.getElementById("ar-container"),
  });
  const { renderer, scene, camera } = mindarThree;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3));

  // 3) Crear el mesh para el filtro
  filterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 })
  );
  scene.add(filterMesh);
  mindarThree.addAnchor(168).group.add(filterMesh);

  // 4) Cargar configuración de filtros y aplicar el por defecto
  const cfgRaw = localStorage.getItem("filterConfigData") || '{"filtros":{}}';
  const filterConfig = JSON.parse(cfgRaw).filtros;
  const keys = Object.keys(filterConfig);
  if (keys.length > 0) {
    const def = filterConfig[keys[0]];
    // textura, geometría y posición inicial
    filterMesh.material.map = new THREE.TextureLoader().load(def.path);
    filterMesh.geometry = new THREE.PlaneGeometry(...def.size);
    filterMesh.position.set(...def.position);
  }

  // 5) Renderizar botones de selector
  const btnContainer = document.getElementById("filter-buttons");
  btnContainer.innerHTML = "";
  for (const key of keys) {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-light";
    btn.textContent = filterConfig[key].displayName;
    btn.onclick = () => {
      const c = filterConfig[key];
      filterMesh.material.map = new THREE.TextureLoader().load(c.path);
      filterMesh.geometry = new THREE.PlaneGeometry(...c.size);
      filterMesh.position.set(...c.position);
    };
    btnContainer.appendChild(btn);
  }

  // 6) Arrancar MindAR y bucle
  await mindarThree.start();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

// Hook al mostrar la pestaña AR
document.querySelector("#ar-tab").addEventListener("shown.bs.tab", () => {
  if (!mindarThree) initAR();
});

document.getElementById("add-place-btn").addEventListener("click", () => {
    openPlaceModal(null);
  });
  
  document.getElementById("add-filter-btn").addEventListener("click", () => {
    openFilterModal(null);
  });
  
// Toggle filtros
document.getElementById("toggle-filters-btn").onclick = () => {
  const sel = document.getElementById("filter-selector");
  sel.style.display = sel.style.display === "block" ? "none" : "block";
};

// ======= FIN AR + filtros =======
// File System handles
let projectHandle, imagesHandle, filtersHandle, dataHandle, filterDataHandle;

// Asegura handles de FS sólo en respuesta a gesto
// Asegura la carpeta de imágenes para lugares
async function ensureImagesFS() {
    if (!imagesHandle) {
      const dirHandle = await window.showDirectoryPicker();
      imagesHandle = dirHandle;
    }
  }
  
  // Asegura la carpeta de imágenes para filtros
  async function ensureFiltersFS() {
    if (!filtersHandle) {
      const dirHandle = await window.showDirectoryPicker();
      filtersHandle = dirHandle;
    }
  }
  

// Leer JSON: FS o localStorage fallback
async function readJSON(handle, lsKey, field) {
  if (handle) {
    const file = await handle.getFile();
    const text = await file.text();
    return text ? JSON.parse(text) : {};
  } else {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return {};
    return JSON.parse(raw);
  }
}
// Escribir JSON: FS y actualiza LS
async function writeJSON(handle, obj, lsKey) {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(obj, null, 2));
    await writable.close();
  }
  localStorage.setItem(lsKey, JSON.stringify(obj));
}

async function copyFile(fileInput, type) {
    const file = fileInput.files[0];
    if (!file) return null;
  
    if (type === "images") await ensureImagesFS();
    if (type === "filters") await ensureFiltersFS();
  
    const targetDirHandle = type === "images" ? imagesHandle : filtersHandle;
  
    const dest = await targetDirHandle.getFileHandle(file.name, { create: true });
    const w = await dest.createWritable();
    await w.write(await file.arrayBuffer());
    await w.close();
  
    return file.name;
  }
  

// --- Lugares ---
async function getPlaces() {
  const data = await readJSON(dataHandle, "dbData", "maravillas");
  return data.maravillas || [];
}
async function setPlaces(arr) {
  await writeJSON(dataHandle, { maravillas: arr }, "dbData");
}

async function renderPlaceList() {
  const places = await getPlaces();
  const c = document.getElementById("place-list");
  if (!places.length) return (c.innerHTML = "<p>No hay lugares.</p>");
  let html =
    '<table class="table"><thead><tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr></thead><tbody>';
  for (const p of places) {
    html +=
      `<tr><td>${p.id}</td><td>${p.nombre}</td><td>` +
      `<button class="btn btn-sm btn-primary edit-place" data-id="${p.id}">Editar</button> ` +
      `<button class="btn btn-sm btn-danger delete-place" data-id="${p.id}">Eliminar</button>` +
      "</td></tr>";
  }
  c.innerHTML = html + "</tbody></table>";
  c.querySelectorAll(".edit-place").forEach(
    (b) =>
      (b.onclick = async () => {
        await ensureImagesFS();
        openPlaceModal(b.dataset.id || null);
      })
  );
  c.querySelectorAll(".delete-place").forEach(
    (b) =>
      (b.onclick = async () => {
        await ensureImagesFS();
        if (confirm("Eliminar lugar?")) {
          let arr = await getPlaces();
          arr = arr.filter((x) => x.id.toString() !== b.dataset.id);
          await setPlaces(arr);
          renderPlaceList();
        }
      })
  );
}

// --- MODAL LUGAR ---
function openPlaceModal(id) {
    const modalEl = document.getElementById("modal-place");
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById("form-place");
    form.reset();
  
    // Limpia la vista previa de imagen
    document.getElementById("place-preview").src = "";
  
    // Mostrar modal
    modal.show();
  
    document.getElementById("place-id").value = id || "";
  
    if (id) {
      getPlaces().then((arr) => {
        const place = arr.find((x) => x.id.toString() === id);
        if (place) {
          document.getElementById("place-nombre").value = place.nombre;
          document.getElementById("place-descripcion").value = place.descripcion;
          document.getElementById("place-video").value = place.video;
          document.getElementById("place-url_info").value = place.url_info;
          document.getElementById("place-url_mapa").value = place.url_mapa;
          document.getElementById("place-filtro").value = place.filtro || "";
          // 👇 Vista previa de imagen
          if (place.imagen) {
            document.getElementById("place-preview").src = place.imagen;
          }
        }
      });
    }
  
    form.onsubmit = async (e) => {
      e.preventDefault();
      const idVal = document.getElementById("place-id").value;
      let arr = await getPlaces();
      let place =
        idVal && arr.find((x) => x.id.toString() === idVal)
          ? arr.find((x) => x.id.toString() === idVal)
          : { id: Date.now() };
      if (!idVal) arr.push(place);
  
      place.nombre = document.getElementById("place-nombre").value;
      place.descripcion = document.getElementById("place-descripcion").value;
      place.video = document.getElementById("place-video").value;
      place.url_info = document.getElementById("place-url_info").value;
      place.url_mapa = document.getElementById("place-url_mapa").value;
      place.filtro = document.getElementById("place-filtro").value;
  
      // Cargar imagen si el usuario seleccionó una nueva
      const imgInput = document.getElementById("place-imagen");
      if (imgInput.files.length > 0) {
        const imgName = await copyFile(imgInput, "images");
        if (imgName) place.imagen = `./images/${imgName}`;
      }
  
      await setPlaces(arr);
      modal.hide();
      renderPlaceList();
    };
  }
  
// --- Filtros ---
async function getFilters() {
  const fdata = await readJSON(filterDataHandle, "filterConfigData", "filtros");
  return fdata.filtros || {};
}
async function setFilters(o) {
  await writeJSON(filterDataHandle, { filtros: o }, "filterConfigData");
}
async function renderFilterList() {
  const obj = await getFilters();
  const c = document.getElementById("filter-list");
  const keys = Object.keys(obj);
  if (!keys.length) return (c.innerHTML = "<p>No hay filtros.</p>");
  let html =
    '<table class="table"><thead><tr><th>Clave</th><th>Nombre</th><th>Acciones</th></tr></thead><tbody>';
  for (const k of keys) {
    html +=
      `<tr><td>${k}</td><td>${obj[k].displayName}</td><td>` +
      `<button class="btn btn-sm btn-primary edit-filter" data-key="${k}">Editar</button> ` +
      `<button class="btn btn-sm btn-danger delete-filter" data-key="${k}">Eliminar</button>` +
      "</td></tr>";
  }
  c.innerHTML = html + "</tbody></table>";
  c.querySelectorAll(".edit-filter").forEach(
    (b) =>
      (b.onclick = async () => {
        await ensureFiltersFS();
        openFilterModal(b.dataset.key);
      })
  );
  c.querySelectorAll(".delete-filter").forEach(
    (b) =>
      (b.onclick = async () => {
        await ensureFiltersFS();
        if (confirm("Eliminar filtro?")) {
          const o = await getFilters();
          delete o[b.dataset.key];
          await setFilters(o);
          renderFilterList();
        }
      })
  );
}

// --- MODAL FILTRO ---
function openFilterModal(key) {
    const modalEl = document.getElementById("modal-filter");
    const m = bootstrap.Modal.getOrCreateInstance(modalEl);
    const f = document.getElementById("form-filter");
  
    f.reset();
    document.getElementById("filter-id").value = key || "";
  
    if (key) {
        getFilters().then((o) => {
          const v = o[key];
          document.getElementById("filter-key").value = key;
          document.getElementById("filter-displayName").value = v.displayName;
          document.getElementById("filter-size-x").value = v.size[0];
          document.getElementById("filter-size-y").value = v.size[1];
          document.getElementById("filter-pos-x").value = v.position[0];
          document.getElementById("filter-pos-y").value = v.position[1];
          document.getElementById("filter-pos-z").value = v.position[2];
      
          if (v.path) {
            document.getElementById("filter-preview").src = v.path;
          }
        });
      }
      
  
    m.show();
  
    f.onsubmit = async (e) => {
      e.preventDefault();
      const o = await getFilters();
      const newKey = document.getElementById("filter-key").value;
  
      let v = o[f.dataset.originalKey] || {};
      if (f.dataset.originalKey && f.dataset.originalKey !== newKey) {
        delete o[f.dataset.originalKey];
      }
  
      v.displayName = document.getElementById("filter-displayName").value;
  
      const img = await copyFile(document.getElementById("filter-imagen"), "filters"); 

      if (img) v.path = `../filtros/${img}`;
  
      v.size = [
        Number(document.getElementById("filter-size-x").value),
        Number(document.getElementById("filter-size-y").value),
      ];
      v.position = [
        Number(document.getElementById("filter-pos-x").value),
        Number(document.getElementById("filter-pos-y").value),
        Number(document.getElementById("filter-pos-z").value),
      ];
  
      o[newKey] = v;
      await setFilters(o);
      m.hide();
      renderFilterList();
    };
  
    f.dataset.originalKey = key;
  }
  

// Exportar JSON (usa localStorage fallback)
function setupExport() {
  document.getElementById("export-json-btn").onclick = async () => {
    const pd = await readJSON(dataHandle, "dbData");
    const fd = await readJSON(filterDataHandle, "filterConfigData");
    const blob = new Blob(
      [
        JSON.stringify(
          { maravillas: pd.maravillas || [], filtros: fd.filtros || {} },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site-data.json";
    a.click();
  };
}

function setupSmartImport() {
    const setupSingleImport = (btnId, lsKey, fileName, renderFn) => {
      document.getElementById(btnId).onclick = async () => {
        const currentData = localStorage.getItem(lsKey);
        if (currentData) {
          const choice = confirm(`Ya hay datos cargados para ${fileName}. ¿Querés exportarlos primero?`);
          if (choice) {
            const blob = new Blob([currentData], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
          }
        }
  
        // Elegir archivo
        try {
          const [fileHandle] = await window.showOpenFilePicker({
            types: [
              {
                description: "Archivos JSON",
                accept: { "application/json": [".json"] },
              },
            ],
            excludeAcceptAllOption: true,
            multiple: false,
          });
  
          const file = await fileHandle.getFile();
          const text = await file.text();
  
          // Guardar en localStorage
          localStorage.setItem(lsKey, text);
          alert(`${fileName} cargado correctamente.`);
  
          await renderFn(); // actualizar vista
        } catch (err) {
          alert("Importación cancelada o fallida.");
        }
      };
    };
  
    setupSingleImport("import-db-btn", "dbData", "DB.json", renderPlaceList);
    setupSingleImport("import-filtros-btn", "filterConfigData", "filtros.json", renderFilterList);
  }
  


(async () => {
    renderPlaceList();
    renderFilterList();
    setupExport();
    setupSmartImport(); // 👈 ahora llamamos la función nueva
  })();
  
