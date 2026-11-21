const STORAGE_KEY = "ar-campus-visited";

// Mengambil data lokasi yang sudah dikunjungi
export function getVisited() {

    try {

        const data = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error("Gagal membaca progres:", error);

        return [];

    }

}


// Menyimpan lokasi yang berhasil dipindai
export function markVisited(id) {

    const visited = getVisited();

    if (!visited.includes(id)) {

        visited.push(id);

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(visited)
        );

    }

    return visited;

}


// Menghapus progres
export function resetProgress() {

    localStorage.removeItem(STORAGE_KEY);

}