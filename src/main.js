import * as THREE from "three";

import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

import {
    getVisited,
    markVisited,
    resetProgress
} from "./progress.js";


// ======================================
// 1. MENGAMBIL ELEMEN HTML
// ======================================

const container = document.querySelector("#ar-container");

const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const resetButton = document.querySelector("#resetButton");

const statusText = document.querySelector("#status");
const scanMessage = document.querySelector("#scanMessage");

const infoPanel = document.querySelector("#infoPanel");
const poiName = document.querySelector("#poiName");
const poiDescription = document.querySelector("#poiDescription");

const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const progressList = document.querySelector("#progressList");

const replayButton = document.querySelector("#replayButton");


// ======================================
// 2. VARIABEL UTAMA
// ======================================

let mindarThree = null;

let poiData = [];

let entries = [];

let activeEntry = null;

let cameraStarted = false;

const clock = new THREE.Clock();


// ======================================
// 3. MEMBACA DATA POI.JSON
// ======================================

async function loadPOIData() {

    const response = await fetch(
        `${import.meta.env.BASE_URL}data/pois.json`
    );

    if (!response.ok) {
        throw new Error("File pois.json tidak ditemukan");
    }

    const json = await response.json();

    if (!Array.isArray(json.pois) || json.pois.length < 3) {
        throw new Error("Minimal harus ada 3 lokasi");
    }

    const ids = new Set();
    const indexes = new Set();

    json.pois.forEach(poi => {

        if (!Number.isInteger(poi.id) ||
            !poi.name ||
            !poi.description ||
            !Number.isInteger(poi.targetIndex) ||
            !["computer", "classroom", "office"].includes(poi.type)
        ) {
            throw new Error("Data POI tidak valid");
        }

        if (
            ids.has(poi.id) ||
            indexes.has(poi.targetIndex)
        ) {
            throw new Error("ID atau targetIndex duplikat");
        }

        ids.add(poi.id);
        indexes.add(poi.targetIndex);

    });

    const sorted = [...json.pois].sort(
        (a, b) => a.targetIndex - b.targetIndex
    );

    sorted.forEach((poi, index) => {

        if (poi.targetIndex !== index) {
            throw new Error("Urutan marker harus dimulai dari 0");
        }

    });

    return sorted;

}


// ======================================
// 4. FUNGSI MEMBUAT MATERIAL 3D
// ======================================

function createMaterial(color) {

    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.6
    });

}


// Membuat balok 3D
function createBox(
    parent,
    width,
    height,
    depth,
    x,
    y,
    z,
    color
) {

    const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
    );

    const mesh = new THREE.Mesh(
        geometry,
        createMaterial(color)
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;

    parent.add(mesh);

    return mesh;

}


// ======================================
// 5. MEMBUAT OBJEK 3D KOMPUTER
// ======================================

function createComputer() {

    const group = new THREE.Group();

    // Monitor
    createBox(
        group, 0.65, 0.42, 0.06,
        0, 0.38, 0,
        "#333333"
    );

    // Layar
    createBox(
        group, 0.57, 0.34, 0.008,
        0, 0.38, 0.035,
        "#2389c9"
    );

    // Penyangga monitor
    createBox(
        group, 0.08, 0.15, 0.08,
        0, 0.10, 0,
        "#777777"
    );

    // Kaki monitor
    createBox(
        group, 0.28, 0.04, 0.18,
        0, 0.02, 0,
        "#555555"
    );

    // Keyboard
    createBox(
        group, 0.48, 0.04, 0.18,
        0, -0.08, 0.22,
        "#292929"
    );

    // CPU
    createBox(
        group, 0.18, 0.38, 0.25, -0.48, 0.17, -0.05,
        "#777777"
    );

    // Lampu CPU
    createBox(
        group, 0.035, 0.035, 0.012, -0.48, 0.27, 0.08,
        "#35d66a"
    );

    return group;

}


// ======================================
// 6. MEMBUAT OBJEK 3D RUANG KELAS
// ======================================

function createClassroom() {

    const group = new THREE.Group();

    // Papan tulis
    createBox(
        group, 0.95, 0.48, 0.06,
        0, 0.65, 0,
        "#493d32"
    );

    // Bagian dalam papan tulis
    createBox(
        group, 0.87, 0.40, 0.01,
        0, 0.65, 0.035,
        "#23634d"
    );

    // Meja kelas
    createBox(
        group, 0.62, 0.07, 0.42,
        0, 0.10, 0.10,
        "#a96e39"
    );

    // Kaki meja kiri dan kanan
    createBox(
        group, 0.045, 0.24, 0.045, -0.25, -0.055, 0,
        "#555555"
    );

    createBox(
        group, 0.045, 0.24, 0.045,
        0.25, -0.055, 0,
        "#555555"
    );

    // Dudukan kursi
    createBox(
        group, 0.35, 0.06, 0.32,
        0, -0.18, -0.32,
        "#b78047"
    );

    // Sandaran kursi
    createBox(
        group, 0.35, 0.34, 0.06,
        0, 0.02, -0.47,
        "#a96e39"
    );

    return group;

}


// ======================================
// 7. MEMBUAT OBJEK 3D RUANG DOSEN
// ======================================

function createOffice() {

    const group = new THREE.Group();

    // Meja dosen
    createBox(
        group, 0.78, 0.08, 0.44,
        0, 0.12, 0,
        "#93613c"
    );

    // Kaki meja
    createBox(
        group, 0.06, 0.35, 0.06, -0.31, -0.10, -0.15,
        "#555555"
    );

    createBox(
        group, 0.06, 0.35, 0.06,
        0.31, -0.10, -0.15,
        "#555555"
    );

    // Laptop
    createBox(
        group, 0.38, 0.025, 0.27,
        0, 0.19, 0,
        "#777777"
    );

    // Layar laptop
    createBox(
        group, 0.38, 0.25, 0.025,
        0, 0.32, -0.12,
        "#2389c9"
    );

    // Buku merah
    createBox(
        group, 0.18, 0.035, 0.22, -0.26, 0.19, 0.08,
        "#b43d3d"
    );

    // Buku kuning
    createBox(
        group, 0.18, 0.035, 0.22, -0.26, 0.23, 0.08,
        "#d7a542"
    );

    // Kursi
    createBox(
        group, 0.32, 0.06, 0.30,
        0.05, -0.16, 0.38,
        "#65442c"
    );

    // Sandaran kursi
    createBox(
        group, 0.32, 0.32, 0.06,
        0.05, 0.01, 0.52,
        "#65442c"
    );

    return group;

}


// ======================================
// 8. MEMILIH OBJEK BERDASARKAN LOKASI
// ======================================

function createModel(type) {

    switch (type) {

        case "computer":
            return createComputer();

        case "classroom":
            return createClassroom();

        case "office":
            return createOffice();

        default:
            throw new Error("Jenis objek tidak dikenal");

    }

}


// ======================================
// 9. MENAMPILKAN PROGRES KUNJUNGAN
// ======================================

function updateProgress() {

    const visited = getVisited();

    const total = poiData.length;

    const count = poiData.filter(
        poi => visited.includes(poi.id)
    ).length;

    progressText.textContent =
        `${count} dari ${total} lokasi dikunjungi`;

    progressBar.style.width =
        `${(count / total) * 100}%`;

    progressList.replaceChildren();

    poiData.forEach(poi => {

        const item = document.createElement("li");

        const done = visited.includes(poi.id);

        item.textContent = done ?
            `${poi.name} - Sudah dikunjungi ✓` :
            `${poi.name} - Belum dikunjungi`;

        progressList.appendChild(item);

    });

    if (count === total) {

        scanMessage.textContent =
            "Selamat! Semua lokasi sudah dikunjungi.";

    }

}


// ======================================
// 10. MENAMPILKAN INFORMASI LOKASI
// ======================================


function showInformation(poi, entry) {

    activeEntry = entry;

    poiName.textContent = poi.name;

    poiDescription.textContent = poi.description;

    infoPanel.hidden = false;

    scanMessage.textContent =
        `Marker ditemukan: ${poi.name}`;

    statusText.textContent =
        "Marker berhasil ditemukan";

    markVisited(poi.id);

    updateProgress();

    // Mengarahkan halaman ke informasi lokasi
    infoPanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}




function hideInformation(entry) {

    if (activeEntry !== entry) {
        return;
    }

    // Informasi tetap ditampilkan
    // meskipun marker tidak lagi terlihat

    statusText.textContent =
        "Marker tidak terlihat - Informasi tetap tersedia";

    scanMessage.textContent =
        `Informasi lokasi: ${entry.poi.name}`;

}


// ======================================
// 11. MENYIAPKAN MINDAR DAN THREE.JS
// ======================================

async function initializeAR() {

    const targetUrl =
        `${import.meta.env.BASE_URL}targets/pois.mind`;

    mindarThree = new MindARThree({

        container: container,

        imageTargetSrc: targetUrl,

        maxTrack: 1

    });

    const scene = mindarThree.scene;

    const camera = mindarThree.camera;

    const renderer = mindarThree.renderer;


    // Mengatur transparansi canvas AR
    // Mengatur transparansi canvas AR
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.domElement.style.background = "transparent";
    renderer.domElement.style.pointerEvents = "none";


    // Pencahayaan
    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x777777,
        2
    );

    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    directionalLight.position.set(1, 3, 2);

    scene.add(directionalLight);


    // Membuat objek untuk setiap marker
    for (const poi of poiData) {

        const anchor = mindarThree.addAnchor(
            poi.targetIndex
        );

        const model = createModel(poi.type);

        // Mengatur posisi objek 3D
        model.position.set(0, -0.20, 0.08);

        // Mengatur ukuran objek 3D
        model.scale.setScalar(0.65);

        anchor.group.add(model);


        const entry = {

            poi: poi,

            model: model,

            time: 0,

            baseZ: 0.08

        };


        // Ketika marker ditemukan
        anchor.onTargetFound = () => {

            showInformation(poi, entry);

        };


        // Ketika marker hilang
        anchor.onTargetLost = () => {

            hideInformation(entry);

        };


        entries.push(entry);

    }


    // Mengaktifkan kamera

    await mindarThree.start();

    cameraStarted = true;

    // Mengatur posisi video kamera
    // Mengatur posisi video kamera
    const video = container.querySelector("video");

    if (video) {
        video.style.position = "absolute";
        video.style.top = "0";
        video.style.left = "0";
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.zIndex = "1";
        video.style.display = "block";
    }

    // Canvas AR berada di atas video
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "2";
    renderer.domElement.style.background = "transparent";
    renderer.domElement.style.pointerEvents = "none";
    statusText.textContent =
        "Kamera aktif - Cari marker";

    scanMessage.textContent =
        "Arahkan kamera ke gambar marker";


    // Menjalankan animasi
    renderer.setAnimationLoop(() => {

        const delta = Math.min(clock.getDelta(), 0.05);

        entries.forEach(entry => {

            entry.time += delta;

            // Objek berputar perlahan
            entry.model.rotation.y =
                Math.sin(entry.time * 0.8) * 0.12;

            // Objek bergerak naik turun
            entry.model.position.z =
                entry.baseZ +
                Math.sin(entry.time * 2) * 0.015;

        });

        renderer.render(scene, camera);

    });

}


// ======================================
// 12. TOMBOL MULAI SCAN
// ======================================

startButton.addEventListener("click", async() => {

    if (cameraStarted) {
        return;
    }

    startButton.disabled = true;

    statusText.textContent =
        "Menyiapkan kamera...";

    scanMessage.textContent =
        "Memuat sistem AR...";

    try {

        if (!mindarThree) {

            await initializeAR();

        } else {

            await mindarThree.start();

            cameraStarted = true;

            mindarThree.renderer.setAnimationLoop(() => {

                const delta = Math.min(clock.getDelta(), 0.05);

                entries.forEach(entry => {

                    entry.time += delta;

                    entry.model.rotation.y =
                        Math.sin(entry.time * 0.8) * 0.12;

                    entry.model.position.z =
                        entry.baseZ +
                        Math.sin(entry.time * 2) * 0.015;

                });

                mindarThree.renderer.render(
                    mindarThree.scene,
                    mindarThree.camera
                );

            });

        }

        startButton.hidden = true;

        stopButton.hidden = false;

    } catch (error) {

        console.error("AR Error:", error);

        statusText.textContent =
            "Gagal mengaktifkan kamera";

        scanMessage.textContent =
            error.message || "Periksa izin kamera dan file marker.";

        if (mindarThree) {

            try {
                mindarThree.stop();
            } catch (stopError) {
                console.error(stopError);
            }

            mindarThree = null;

        }

        cameraStarted = false;

        startButton.disabled = false;

    }

});


// ======================================
// 13. TOMBOL BERHENTI SCAN
// ======================================

stopButton.addEventListener("click", () => {

    if (mindarThree) {

        mindarThree.renderer.setAnimationLoop(null);

        mindarThree.stop();

        mindarThree = null;

    }

    cameraStarted = false;

    activeEntry = null;

    entries = [];

    container.querySelectorAll("canvas, video").forEach(
        element => element.remove()
    );

    infoPanel.hidden = true;

    stopButton.hidden = true;

    startButton.hidden = false;

    startButton.disabled = false;

    statusText.textContent =
        "Kamera dihentikan";

    scanMessage.textContent =
        "Tekan Mulai Scan untuk memulai kembali";

});


// ======================================
// 14. TOMBOL RESET PROGRES
// ======================================

resetButton.addEventListener("click", () => {

    const yakin = confirm(
        "Apakah kamu yakin ingin menghapus progres kunjungan?"
    );

    if (!yakin) {
        return;
    }

    resetProgress();

    updateProgress();

    statusText.textContent =
        "Progres berhasil direset";

});


// ======================================
// 15. TOMBOL PUTAR ULANG ANIMASI
// ======================================

replayButton.addEventListener("click", () => {

    if (!activeEntry) {
        return;
    }

    activeEntry.time = 0;

    activeEntry.model.rotation.y = 0;

    scanMessage.textContent =
        `Animasi ${activeEntry.poi.name} diulang`;

});


// ======================================
// 16. MENJALANKAN APLIKASI
// ======================================

async function main() {

    try {

        poiData = await loadPOIData();

        updateProgress();

        statusText.textContent =
            "Siap digunakan";

        scanMessage.textContent =
            "Tekan Mulai Scan untuk mengaktifkan kamera";

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Gagal memuat data";

        scanMessage.textContent =
            error.message;

        startButton.disabled = true;

    }

}

main();