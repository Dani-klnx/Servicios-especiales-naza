import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── Configuración de Firebase ──────────────────────────────────────────────
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


// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "servidores");

const DOUBLE_SELECTION_POSITIONS = [1, 2, 4, 6, 14, 15];

// Array dinámico que se alimenta desde Firebase
let predefinedNames = [];

// Escucha activa en tiempo real de la base de datos
onValue(dbRef, (snapshot) => {
    predefinedNames = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(id => {
            if (data[id] && data[id].nombre) {
                predefinedNames.push(data[id].nombre);
            }
        });
    }
    // Renderizado reactivo al recibir o actualizar los nombres
    populateSelectors();
    updateSidebarLists();
});

// Exponer funciones al entorno global (necesario por el cambio a type="module")
window.showPreview = showPreview;
window.downloadImage = downloadImage;
window.resetAll = resetAll;

// ─── Constantes y Mapas del Croquis ─────────────────────────────────────────
const BLUEPRINT_W = 1300;
const BLUEPRINT_H = 700;
const numPositions = 15;
const assignmentMap = {};

// ─── Convert background image to base64 for html2canvas on Android ──────────
let backgroundBase64 = null;

function loadBackgroundAsBase64() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                backgroundBase64 = canvas.toDataURL('image/jpeg', 0.95);
                resolve(backgroundBase64);
            } catch(e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = 'Diseño.jpg';
    });
}

// ─── Scale blueprint to fit screen — scales the whole scaler wrapper ─────────
function scaleBlueprint() {
    const scaler = document.getElementById('blueprintScaler');
    const blueprint = document.getElementById('croquisBlueprint');
    const workingArea = document.getElementById('workingArea');
    if (!scaler || !blueprint || !workingArea) return;

    const available = workingArea.offsetWidth - 10;
    const scale = Math.min(1, available / BLUEPRINT_W);

    // Apply scale to blueprint itself, origin top-left
    blueprint.style.transform = `scale(${scale})`;
    blueprint.style.transformOrigin = 'top left';

    // Shrink the scaler wrapper to the visual footprint
    scaler.style.width  = Math.round(BLUEPRINT_W * scale) + 'px';
    scaler.style.height = Math.round(BLUEPRINT_H * scale) + 'px';
    scaler.style.overflow = 'hidden';
}

// ─── Name selectors ──────────────────────────────────────────────────────────
function initNameSelectors() {
    const container = document.getElementById('nameSelectors');
    container.innerHTML = '';
    for (let i = 1; i <= numPositions; i++) {
        const group = document.createElement('div');
        group.className = 'selector-group name-assignment-group';
        const label = document.createElement('label');
        const isDouble = DOUBLE_SELECTION_POSITIONS.includes(i);
        label.textContent = `Posición ${i}${isDouble ? ' (2 nombres)' : ''}:`;
        group.appendChild(label);
        const count = isDouble ? 2 : 1;
        for (let j = 1; j <= count; j++) {
            const select = document.createElement('select');
            select.className = 'name-selector';
            select.dataset.position = i;
            select.dataset.index = j;
            select.addEventListener('change', () => {
                updateAssignment(i);
                populateSelectors();
                updateSidebarLists();
            });
            group.appendChild(select);
        }
        container.appendChild(group);
        assignmentMap[i] = [];
    }
    populateSelectors();
    updateSidebarLists();
    updateHeaderDisplay();
}

function populateSelectors() {
    const allSelectors = document.querySelectorAll('.name-selector');
    const selected = new Set();
    allSelectors.forEach(s => {
        if (s.value && !s.value.includes('Posición')) selected.add(s.value);
    });
    allSelectors.forEach(s => {
        const current = s.value;
        const pos = s.dataset.position;
        const idx = s.dataset.index;
        s.innerHTML = '';
        const defOpt = document.createElement('option');
        defOpt.value = `Posición ${pos}-${idx}`;
        defOpt.textContent = `-- Selecciona Nombre --`;
        s.appendChild(defOpt);
        predefinedNames.forEach(name => {
            if (!selected.has(name) || name === current) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                s.appendChild(opt);
            }
        });
        s.value = current || defOpt.value;
    });
}

function updateAssignment(pos) {
    const selects = document.querySelectorAll(`.name-selector[data-position="${pos}"]`);
    assignmentMap[pos] = Array.from(selects)
        .map(s => s.value)
        .filter(v => !v.includes('Posición'));
}

// ─── Build list HTML (shared between screen and capture) ─────────────────────
function buildListsHTML() {
    let pbHTML = `<div class="list-title title-pb">PLANTA BAJA</div><div class="list-items">`;
    for (let i = 1; i <= 6; i++) {
        const names = (assignmentMap[i] || []).join(' / ');
        pbHTML += `<div class="list-item item-pb"><span class="item-number">${i}</span><span class="item-name">${names || ''}</span></div>`;
    }
    pbHTML += `</div>`;

    let col1 = '', col2 = '';
    for (let i = 7; i <= 11; i++) {
        const names = (assignmentMap[i] || []).join(' / ');
        col1 += `<div class="list-item item-pa"><span class="item-number">${i}</span><span class="item-name">${names || ''}</span></div>`;
    }
    for (let i = 12; i <= 15; i++) {
        const names = (assignmentMap[i] || []).join(' / ');
        const cls = i === 15 ? 'item-rondin' : 'item-pa';
        col2 += `<div class="list-item ${cls}"><span class="item-number">${i}</span><span class="item-name">${names || ''}</span></div>`;
    }
    let paHTML = `<div class="list-title title-pa">PLANTA ALTA</div>
        <div class="list-items">
            <div class="pa-columns">
                <div class="pa-col-left">${col1}</div>
                <div class="pa-col-right">${col2}</div>
            </div>
        </div>`;

    return { pbHTML, paHTML };
}

function updateSidebarLists() {
    const pbContainer = document.getElementById('list-container-pb');
    const paContainer = document.getElementById('list-container-pa');
    if (!pbContainer || !paContainer) return;
    const { pbHTML, paHTML } = buildListsHTML();
    pbContainer.innerHTML = pbHTML;
    paContainer.innerHTML = paHTML;
}

// ─── Header display ──────────────────────────────────────────────────────────
const dateInput      = document.getElementById('croquisDate');
const timeInput      = document.getElementById('croquisTime');
const devocionalSelect = document.getElementById('devocionalType');
const especialSelect   = document.getElementById('especialType');

function updateHeaderDisplay() {
    const devocional = devocionalSelect?.value;
    const especial   = especialSelect?.value;
    const time       = timeInput?.value;

    const displayDevocional = document.getElementById('displayDevocional');
    const displayEspecial   = document.getElementById('displayEspecial');
    const displayTime       = document.getElementById('displayTime');
    const displayDate       = document.getElementById('displayDate');

    if (displayDevocional) displayDevocional.textContent = devocional || '';
    if (displayEspecial)   displayEspecial.textContent   = especial   || '';
    if (displayTime)       displayTime.textContent       = time       || '';

    if (displayDate && dateInput && dateInput.value) {
        const date   = new Date(dateInput.value + 'T12:00:00');
        const months = ["enero","febrero","marzo","abril","mayo","junio",
                        "julio","agosto","septiembre","octubre","noviembre","diciembre"];
        displayDate.textContent = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}

if (dateInput) {
    dateInput.valueAsDate = new Date();
    dateInput.addEventListener('change', updateHeaderDisplay);
}
if (timeInput) {
    timeInput.value = '18:00';
    timeInput.addEventListener('change', updateHeaderDisplay);
}
if (devocionalSelect) devocionalSelect.addEventListener('change', updateHeaderDisplay);
if (especialSelect)   especialSelect.addEventListener('change',   updateHeaderDisplay);

// ─── Preview modal ────────────────────────────────────────────────────────────
function showPreview() {
    updateHeaderDisplay();
    updateSidebarLists();

    const modal     = document.getElementById('previewModal');
    const view      = document.getElementById('modalCroquisView');
    const blueprint = document.getElementById('croquisBlueprint');
    if (!modal || !view || !blueprint) return;

    // Calculate scale to fit modal (max inner width ~680px)
    const modalInnerW = Math.min(window.innerWidth * 0.95 - 80, 680);
    const scale       = Math.min(1, modalInnerW / BLUEPRINT_W);

    // Clone the blueprint without any existing transform
    const clone = blueprint.cloneNode(true);
    clone.removeAttribute('style');
    clone.style.cssText = `
        width: ${BLUEPRINT_W}px;
        height: ${BLUEPRINT_H}px;
        position: relative;
        overflow: hidden;
        border: 5px solid #000;
        background-color: #fff;
        background-image: url("Diseño.jpg");
        background-size: 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
        transform: scale(${scale});
        transform-origin: top left;
        display: block;
        flex-shrink: 0;
    `;

    // Wrapper sized to the visual footprint
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        width: ${Math.round(BLUEPRINT_W * scale)}px;
        height: ${Math.round(BLUEPRINT_H * scale)}px;
        overflow: hidden;
        margin: 0 auto;
    `;

    view.innerHTML = '';
    wrapper.appendChild(clone);
    view.appendChild(wrapper);
    modal.style.display = 'flex';
}

// ─── Download ─────────────────────────────────────────────────────────────────
async function downloadImage() {
    if (typeof html2canvas === 'undefined') {
        alert('Error: html2canvas no está disponible. Recarga la página.');
        return;
    }

    updateHeaderDisplay();
    updateSidebarLists();

    // Loading overlay
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading-overlay';
    loadingEl.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.65);z-index:99999;
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:20px;font-family:Arial,sans-serif;
        flex-direction:column;gap:14px;
    `;
    loadingEl.innerHTML = '<div style="font-size:36px">⏳</div><div>Generando imagen...</div><div style="font-size:13px;opacity:0.75">Esto puede tardar unos segundos</div>';
    document.body.appendChild(loadingEl);

    try {
        if (!backgroundBase64) await loadBackgroundAsBase64();

        // Build a clean off-screen capture div at exact 1300×700 — NO transforms
        const offscreen = document.createElement('div');
        offscreen.style.cssText = `
            position:fixed; top:-9999px; left:-9999px;
            width:${BLUEPRINT_W}px; height:${BLUEPRINT_H}px;
            overflow:hidden; z-index:-1;
        `;

        const captureEl = document.createElement('div');
        captureEl.style.cssText = `
            width:${BLUEPRINT_W}px;
            height:${BLUEPRINT_H}px;
            position:relative;
            overflow:hidden;
            border:5px solid #000;
            background-color:#fff;
            background-size:100% 100%;
            background-position:center;
            background-repeat:no-repeat;
            ${backgroundBase64
                ? `background-image:url("${backgroundBase64}");`
                : `background-image:url("Diseño.jpg");`}
        `;

        // Get current header values to inject into capture element
        const devocional = document.getElementById('displayDevocional')?.textContent || '';
        const especial   = document.getElementById('displayEspecial')?.textContent   || '';
        const time       = document.getElementById('displayTime')?.textContent       || '';
        const dateDisp   = document.getElementById('displayDate')?.textContent       || '';

        // Rebuild lists HTML fresh
        const { pbHTML, paHTML } = buildListsHTML();

        captureEl.innerHTML = `
            <span class="devocional-text" style="position:absolute;top:30px;left:40px;color:#e3002b;font-size:22px;font-weight:bold;text-transform:uppercase;font-family:Arial,sans-serif;">${devocional}</span>
            <span class="especial-text"   style="position:absolute;top:55px;left:40px;color:#e3002b;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;">${especial}</span>
            <span class="time-text"       style="position:absolute;top:30px;right:40px;font-size:18px;color:#333;font-weight:bold;font-family:Arial,sans-serif;">${time}</span>
            <span class="date-text"       style="position:absolute;top:55px;right:40px;font-size:18px;color:#333;font-weight:bold;font-family:Arial,sans-serif;">${dateDisp}</span>
            <div class="title-croquis"    style="position:absolute;top:85px;left:40px;font-size:28px;font-weight:900;color:#000;text-transform:uppercase;font-family:Arial,sans-serif;z-index:5;">IGLESIA NAZARET CENTRAL</div>
            <div class="list-container list-planta-baja" style="position:absolute;top:140px;left:840px;width:260px;z-index:10;background:rgba(255,255,255,0.95);padding:12px;border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,0.15);">${pbHTML}</div>
            <div class="list-container list-planta-alta" style="position:absolute;top:380px;left:840px;width:420px;z-index:10;background:rgba(255,255,255,0.95);padding:12px;border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,0.15);">${paHTML}</div>
        `;

        offscreen.appendChild(captureEl);
        document.body.appendChild(offscreen);

        const canvas = await html2canvas(captureEl, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: BLUEPRINT_W,
            height: BLUEPRINT_H,
            windowWidth: BLUEPRINT_W + 100,
            windowHeight: BLUEPRINT_H + 100,
        });

        document.body.removeChild(offscreen);
        await exportCanvas(canvas);

    } catch (error) {
        console.error('Error al generar imagen:', error);
        alert('Hubo un error al generar la imagen.\nIntenta recargar la página e intentar de nuevo.');
    } finally {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    }
}

// ─── Export canvas → PNG (Android-safe) ──────────────────────────────────────
async function exportCanvas(canvas) {
    const dateText   = document.getElementById('displayDate')?.textContent || 'sin_fecha';
    const safeFile   = dateText.replace(/ /g, '_').replace(/[<>:"/\\|?*]/g, '_');
    const fileName   = `Servicios_Especiales_${safeFile}.png`;

    return new Promise((resolve) => {
        canvas.toBlob(function(blob) {
            if (!blob) { resolve(); return; }
            try {
                const url  = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href     = url;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => { URL.revokeObjectURL(url); link.remove(); resolve(); }, 1500);
            } catch(e) {
                // Fallback: open in new tab
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 30000);
                alert('La imagen se abrió en una nueva pestaña.\nMantén presionada la imagen y elige "Guardar imagen".');
                resolve();
            }
        }, 'image/png');
    });
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetAll() {
    document.querySelectorAll('.name-selector').forEach(s => {
        s.value = `Posición ${s.dataset.position}-${s.dataset.index}`;
    });
    for (let i = 1; i <= numPositions; i++) assignmentMap[i] = [];
    if (devocionalSelect) devocionalSelect.value = '';
    if (especialSelect)   especialSelect.value   = '';
    if (timeInput)        timeInput.value        = '18:00';
    if (dateInput)        dateInput.valueAsDate  = new Date();
    populateSelectors();
    updateHeaderDisplay();
    updateSidebarLists();
    alert('Todos los datos han sido limpiados correctamente.');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    loadBackgroundAsBase64();

    document.getElementById('previewCroquis')   ?.addEventListener('click', showPreview);
    document.getElementById('downloadCroquis')  ?.addEventListener('click', downloadImage);
    document.getElementById('modalDownloadButton')?.addEventListener('click', downloadImage);
    document.getElementById('resetData')        ?.addEventListener('click', resetAll);

    document.querySelector('.close-button')?.addEventListener('click', () => {
        document.getElementById('previewModal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('previewModal');
        if (modal && e.target === modal) modal.style.display = 'none';
    });

    initNameSelectors();

    // Scale on load and on every resize
    scaleBlueprint();
    window.addEventListener('resize', scaleBlueprint);
});