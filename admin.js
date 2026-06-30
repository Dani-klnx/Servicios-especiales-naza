import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Credenciales extraídas de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBFA9SnvoQyJu4eeXbevlbHskCD3FZCj_k",
  authDomain: "nazaret-servidores.firebaseapp.com",
  databaseURL: "https://nazaret-servidores-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nazaret-servidores",
  storageBucket: "nazaret-servidores.firebasestorage.app",
  messagingSenderId: "861421325750",
  appId: "1:861421325750:web:7402ba1cc8991e6d774517",
  measurementId: "G-32RJ11958V"
};

// Inicializar la conexión única a Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "servidores");

// Captura de elementos del DOM
const serverIdInput = document.getElementById("serverId");
const serverNameInput = document.getElementById("serverName");
const btnSave = document.getElementById("btnSave");
const listServers = document.getElementById("listServers");

// ─── LEER Y MOSTRAR LISTADO COMPLETO EN TIEMPO REAL ───────────────────────────
onValue(dbRef, (snapshot) => {
    listServers.innerHTML = ""; // Limpiar lista antes de renderizar
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Mapear los nodos dinámicos guardados en Firebase
        Object.keys(data).forEach((id) => {
            const nombre = data[id].nombre;
            
            const li = document.createElement("li");
            li.className = "name-item";
            li.innerHTML = `
                <span>${nombre}</span>
                <div>
                    <button class="btn-edit" data-id="${id}" data-nombre="${nombre}">Editar</button>
                    <button class="btn-delete" data-id="${id}">Eliminar</button>
                </div>
            `;
            listServers.appendChild(li);
        });

        // Vincular eventos a los botones de "Eliminar" generados dinámicamente
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                deleteServer(id);
            });
        });

        // Vincular eventos a los botones de "Editar" generados dinámicamente
        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                const nombre = e.target.getAttribute("data-nombre");
                prepareEdit(id, nombre);
            });
        });
    } else {
        listServers.innerHTML = `<li class="name-item" style="justify-content: center; color: #666;">No hay servidores registrados.</li>`;
    }
});

// ─── ACCIÓN: CREAR O ACTUALIZAR NOMBRE ────────────────────────────────────────
btnSave.addEventListener("click", () => {
    const nombre = serverNameInput.value.trim();
    const id = serverIdInput.value;

    if (!nombre) {
        alert("Por favor escribe un nombre válido.");
        return;
    }

    if (id) {
        // OPERACIÓN: ACTUALIZAR NOMBRE EXISTENTE
        const updateRef = ref(db, `servidores/${id}`);
        update(updateRef, { nombre: nombre })
            .then(() => resetForm())
            .catch(err => alert("Error al actualizar en Firebase: " + err));
    } else {
        // OPERACIÓN: CREAR NUEVO NOMBRE
        push(dbRef, { nombre: nombre })
            .then(() => resetForm())
            .catch(err => alert("Error al guardar en Firebase: " + err));
    }
});

// ─── ACCIÓN: ELIMINAR REGISTRO ───────────────────────────────────────────────
function deleteServer(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este servidor de la lista?")) {
        const deleteRef = ref(db, `servidores/${id}`);
        remove(deleteRef)
            .then(() => {
                // Si borramos el elemento que estábamos editando actualmente, limpiamos el formulario
                if (serverIdInput.value === id) {
                    resetForm();
                }
            })
            .catch(err => alert("Error al eliminar: " + err));
    }
}

// ─── PASAR DATOS AL FORMULARIO PARA ACTUALIZACIÓN ─────────────────────────────
function prepareEdit(id, nombre) {
    serverIdInput.value = id;
    serverNameInput.value = nombre;
    btnSave.textContent = "Actualizar";
    btnSave.style.backgroundColor = "#ffc107";
    btnSave.style.color = "#333";
}

// ─── LIMPIAR FORMULARIO (ESTADO INICIAL) ──────────────────────────────────────
function resetForm() {
    serverIdInput.value = "";
    serverNameInput.value = "";
    btnSave.textContent = "Agregar";
    btnSave.style.backgroundColor = "#004d99";
    btnSave.style.color = "white";
}