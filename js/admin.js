// IMPORTS al tope
import * as THREE from "three";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { MindARThree } from "mindar-face-three";

// 0) Si no hay sesión activa, redirige al login
if (sessionStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "login.html";
}

// Variables AR
let mindarThree, filterMesh;

// 1) Inicializa AR (sin esperar al tab)
async function initAR() {
  // espejo de cámara
  let video = document.querySelector("#ar-container video");
  if (!video) {
    video = document.createElement("video");
    video.id = "ar-video";
    video.autoplay = video.muted = video.playsInline = true;
    Object.assign(video.style, {
      position: "absolute",
      top: 0,
      left: 0,
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

  // MindAR
  mindarThree = new MindARThree({
    container: document.getElementById("ar-container"),
  });
  const { renderer, scene, camera } = mindarThree;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3));

  // Mesh placeholder
  filterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true })
  );
  scene.add(filterMesh);
  mindarThree.addAnchor(168).group.add(filterMesh);

  // Carga config
  const cfgRaw = localStorage.getItem("filterConfigData") || '{"filtros":{}}';
  const filterConfig = JSON.parse(cfgRaw).filtros;
  const keys = Object.keys(filterConfig);
  if (keys.length) applyFilter(keys[0], filterConfig);

  // Render loop
  await mindarThree.start();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  // Listado debajo del visor
  renderARFilterList(filterConfig);
}

// Aplica un filtro por key
function applyFilter(key, config) {
  const c = config[key];
  filterMesh.material.map = new THREE.TextureLoader().load(c.path);
  filterMesh.geometry = new THREE.PlaneGeometry(...c.size);
  filterMesh.position.set(...c.position);
}

// Renderiza el grid de filtros con tarjetas
function renderARFilterList(filterConfig) {
  const container = document.getElementById("ar-filter-list");
  container.innerHTML = "";
  const keys = Object.keys(filterConfig);
  keys.forEach((key) => {
    const c = filterConfig[key];
    const col = document.createElement("div");
    col.className = "col";
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";
    // Thumb
    const img = document.createElement("img");
    img.src = c.path;
    img.className = "card-img-top";
    // Label
    const bd = document.createElement("div");
    bd.className = "card-body p-2 text-center";
    bd.textContent = c.displayName;
    card.append(img, bd);
    card.onclick = () => applyFilter(key, filterConfig);
    col.appendChild(card);
    container.appendChild(col);
  });

  // Sortable para reordenar
  new Sortable(container, {
    animation: 150,
    onEnd: async () => {
      // Nuevo orden de displayName
      const newConfig = {};
      container.querySelectorAll(".card-body").forEach((bd) => {
        const name = bd.textContent;
        const key = Object.keys(filterConfig).find(
          (k) => filterConfig[k].displayName === name
        );
        if (key) newConfig[key] = filterConfig[key];
      });
      // Salvamos y volvemos a pintar
      sessionStorage.setItem(
        "filterConfigData",
        JSON.stringify({ filtros: newConfig })
      );
      renderARFilterList(newConfig);
    },
  });
}

// Al cargar la página, arranca AR
window.addEventListener("DOMContentLoaded", initAR);

// Toggle visibilidad del grid
document.getElementById("toggle-filters-btn").onclick = () => {
  const l = document.getElementById("ar-filter-list");
  l.style.display = l.style.display === "none" ? "flex" : "none";
};

// ======= FIN AR + filtros =======
// File System handles
let projectHandle, imagesHandle, filtersHandle, dataHandle, filterDataHandle;

// Asegura handles de FS sólo en respuesta a gesto
// Asegura la carpeta de imágenes para lugares
// Asegura la carpeta de imágenes para lugares
async function ensureImagesFS() {
  if (!imagesHandle) {
    const dirHandle = await window.showDirectoryPicker({
      startIn: 'pictures', // opcional: para abrir en la carpeta de imágenes
    });
    imagesHandle = dirHandle;
    localStorage.setItem('imagesDirSelected', 'true');
  }
}

// Asegura la carpeta de imágenes para filtros
async function ensureFiltersFS() {
  if (!filtersHandle) {
    const dirHandle = await window.showDirectoryPicker({
      startIn: 'pictures',
    });
    filtersHandle = dirHandle;
    localStorage.setItem('filtersDirSelected', 'true');
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
  c.querySelectorAll(".edit-place").forEach(b => {
    b.onclick = async () => {
      // Solo aviso si aún no hay carpeta seleccionada
      if (!imagesHandle) {
        alert("Por favor, selecciona la carpeta donde guardas las imágenes de LUGARES");
        await ensureImagesFS();
      }
      openPlaceModal(b.dataset.id || null);
    };
  });
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
  c.querySelectorAll(".edit-filter").forEach(b => {
    b.onclick = async () => {
      if (!filtersHandle) {
        alert("Por favor, selecciona la carpeta donde guardas las imágenes de FILTROS");
        await ensureFiltersFS();
      }
      openFilterModal(b.dataset.key);
    };
  });
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

    const img = await copyFile(
      document.getElementById("filter-imagen"),
      "filters"
    );

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

// ==== Export, import inteligentes y logout ====
function setupExport() {
  document.getElementById("export-json-btn").onclick = async () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            maravillas:
              JSON.parse(sessionStorage.getItem("dbData") || "{}").maravillas ||
              [],
            filtros:
              JSON.parse(sessionStorage.getItem("filterConfigData") || "{}")
                .filtros || {},
          },
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
  const si = (btn, key, filename, renderFn) => {
    document.getElementById(btn).onclick = async () => {
      const cur = localStorage.getItem(key);
      if (
        cur &&
        confirm(`Ya hay datos cargados para ${filename}. ¿Exportar primero?`)
      ) {
        const blob = new Blob([cur], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }

      // 📢 Indicamos al usuario qué fichero debe buscar
      alert(`Por favor, selecciona el archivo ${filename} para importar.`);

      try {
        const [handle] = await window.showOpenFilePicker({
          startIn: "documents", // sugerir la carpeta Documentos (si el navegador lo permite)
          types: [
            {
              description: `Archivo ${filename}`,
              accept: { "application/json": [`.json`] },
            },
          ],
          excludeAcceptAllOption: true,
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        localStorage.setItem(key, text);
        alert(`${filename} cargado correctamente.`);
        renderFn();

        // Si importamos filtros, volvemos a pintar el grid AR
        if (key === "filterConfigData") {
          const cfg = JSON.parse(text).filtros;
          renderARFilterList(cfg);
        }
      } catch (err) {
        console.warn("Importación cancelada o fallida", err);
      }
    };
  };

  si("import-db-btn", "dbData", "DB.json", renderPlaceList);
  si(
    "import-filtros-btn",
    "filterConfigData",
    "filtros.json",
    renderFilterList
  );
}

//  Último paso: logout
document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("adminLoggedIn");
  localStorage.removeItem('imagesDirSelected');
  localStorage.removeItem('filtersDirSelected');
  window.location.href = "login.html";
});

(async () => {
  renderPlaceList();
  renderFilterList();
  setupExport();
  setupSmartImport();
})();
