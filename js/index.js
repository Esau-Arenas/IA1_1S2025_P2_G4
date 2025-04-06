let maravillasData = [];
let currentLugar = null; // Guarda el lugar actualmente detectado

document.addEventListener("DOMContentLoaded", () => {
    const infoContainer = document.getElementById("info-container");
    const videoFrame = document.getElementById("video-frame");
    const tituloTexto = document.getElementById("titulo-texto");
    const descripcionTexto = document.getElementById("descripcion-texto");
    const botonesContainer = document.getElementById("botones-container");
    const targetsContainer = document.getElementById("targets-container");

    // Cargar JSON
    fetch('./data/DB.json')
        .then(response => response.json())
        .then(data => {
        maravillasData = data.maravillas;
        generarTargets(maravillasData);
    })
    .catch(error => console.error('Error cargando JSON:', error));

    function generarTargets(maravillas) {
        maravillas.forEach((lugar, index) => {
        // Crear un <a-entity> para cada target
            let targetEntity = document.createElement("a-entity");
            targetEntity.setAttribute("mindar-image-target", `targetIndex: ${index}`);

            // Agregar un texto sobre el target
            let textEntity = document.createElement("a-text");
            targetsContainer.appendChild(targetEntity);

            // Event Listeners para target detectado y perdido
            targetEntity.addEventListener("targetFound", () => {
                console.log(`Target ${index} detectado: ${lugar.nombre}`);
                mostrarInformacion(lugar);
            });

            targetEntity.addEventListener("targetLost", () => {
                console.log(`Target ${index} perdido`);
                ocultarInformacion();
            });
        });
    }

    function mostrarInformacion(lugar) {
        // Formatear video de YouTube si es necesario
        let videoUrl = lugar.video;
        if (videoUrl.includes("youtu.be")) {
            videoUrl = videoUrl.replace("youtu.be/", "www.youtube.com/embed/");
        } else if (videoUrl.includes("youtube.com/watch?v=")) {
            videoUrl = videoUrl.replace("watch?v=", "embed/");
        }
        videoFrame.src = videoUrl;

        // Mostrar título
        tituloTexto.textContent = lugar.nombre;

        // Mostrar descripción
        descripcionTexto.textContent = lugar.descripcion;

        // Hacer visible la información y los botones
        infoContainer.style.display = "block";
        botonesContainer.style.display = "block";

        // Guardar el lugar actual detectado
        currentLugar = lugar;
    }

    function ocultarInformacion() {
        infoContainer.style.display = "none";
        botonesContainer.style.display = "none";
        videoFrame.src = ""; // Detener video
        currentLugar = null;
    }

    // Botón 1: Redirigir a filtro.html y guardar información en localStorage
    document.getElementById("btn1").addEventListener("click", () => {
        if (currentLugar) {
            // Guardar información del lugar actual en localStorage
            localStorage.setItem('currentTarget', JSON.stringify({
                id: currentLugar.id,
                nombre: currentLugar.nombre,
                tipo: currentLugar.tipo,
                descripcion: currentLugar.descripcion,
                imagen: currentLugar.imagen
            }));

            // Redirigir a filtro.html
            window.location.href = '../views/filtro.html';
        }
    });

    // Botón 2: Abrir información en nueva pestaña
    document.getElementById("btn2").addEventListener("click", () => {
        if (currentLugar) {
            window.open(currentLugar.url_info, '_blank');
        }
    });

    // Botón 3: Abrir ubicación en Google Maps
    document.getElementById("btn3").addEventListener("click", () => {
        if (currentLugar) {
            window.open(currentLugar.url_mapa, '_blank');
        }
    });
});

function openModal() {
    document.getElementById('adminModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('adminModal').style.display = 'none';
}

function showAlert(message, isSuccess) {
    var alertBox = document.getElementById('alert');
    alertBox.textContent = message;
    alertBox.className = 'alert ' + (isSuccess ? 'success' : '');
    alertBox.style.display = 'block';
}

function login() {
    var user = document.getElementById('user').value;
    var password = document.getElementById('password').value;
    if (user === 'admin' && password === 'admin') {
        document.getElementById('user').value = '';
        document.getElementById('password').value = '';
        showAlert('Inicio de sesión exitoso', true);
        setTimeout(function() {
        window.location.href = 'views/admin.html';
        }
        , 2000);
        closeModal();
    } else {
        document.getElementById('user').value = '';
        document.getElementById('password').value = '';
        showAlert('Credenciales incorrectas', false);
    }
}