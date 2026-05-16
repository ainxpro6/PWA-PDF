const btnSelect = document.getElementById('btn-select-folder');
const btnBack = document.getElementById('btn-back');
const libraryView = document.getElementById('library-view');
const readerView = document.getElementById('reader-view');
const fileList = document.getElementById('file-list');
const pdfContainer = document.getElementById('pdf-container'); // Ambil container baru
const chapterTitle = document.getElementById('chapter-title');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const searchContainer = document.getElementById('search-container');
const searchBox = document.getElementById('search-box');

let currentFiles = []; 
let currentChapterIndex = -1; 
let currentDirName = ''; 
const scale = 1.5;


// 1. Fungsi Memilih Folder & Natural Sort
btnSelect.addEventListener('click', async () => {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        
        // BARU: Simpan nama direktori untuk membedakan riwayat baca tiap novel
        currentDirName = directoryHandle.name; 
        
        fileList.innerHTML = ''; 
        currentFiles = []; 
        
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
                currentFiles.push(entry);
            }
        }

        currentFiles.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        if(currentFiles.length === 0) {
            fileList.innerHTML = '<p>Tidak ada file PDF di folder ini.</p>';
            return;
        }

        // BARU: Ambil data history dari LocalStorage
        const readHistory = JSON.parse(localStorage.getItem(`read_${currentDirName}`)) || [];

        currentFiles.forEach((fileHandle, index) => {
            buatElemenFile(fileHandle, index, readHistory);
        });

        // BARU: Munculkan bar pencarian jika file berhasil diload
        if(currentFiles.length > 0) {
            searchContainer.style.display = 'flex'; 
            searchBox.value = ''; // Kosongkan ketikan sebelumnya (jika ada)
        }

    } catch (e) {
        console.error('Batal memilih folder:', e);
    }
});

// Tambahkan parameter 'readHistory' ke fungsi ini
function buatElemenFile(fileHandle, index, readHistory) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.textContent = fileHandle.name.replace('.pdf', ''); 
    
    // BARU: Jika file ini ada di history, tambahkan class is-read
    if (readHistory.includes(fileHandle.name)) {
        div.classList.add('is-read');
    }

    div.onclick = () => bukaChapter(index);
    fileList.appendChild(div);
}

// 2. Fungsi Membuka Chapter & Mode Scroll
async function bukaChapter(index) {
    currentChapterIndex = index;
    const fileHandle = currentFiles[index];
    
    // ==============================================
    // BARU: Logika Menyimpan Status "Sudah Dibaca"
    // ==============================================
    let readHistory = JSON.parse(localStorage.getItem(`read_${currentDirName}`)) || [];
    if (!readHistory.includes(fileHandle.name)) {
        readHistory.push(fileHandle.name);
        // Simpan ke LocalStorage browser
        localStorage.setItem(`read_${currentDirName}`, JSON.stringify(readHistory));
        
        // Update UI tombol chapter di menu daftar agar langsung berubah abu-abu
        if(fileList.children[index]) {
            fileList.children[index].classList.add('is-read');
        }
    }
    
    // Update Judul UI
    const judul = fileHandle.name.replace('.pdf', '');
    chapterTitle.textContent = judul;
    
    // Persiapan UI
    libraryView.style.display = 'none';
    readerView.style.display = 'block';
    btnBack.style.display = 'inline-block';
    btnSelect.style.display = 'none';
    
    // Kosongkan container halaman sebelum memuat chapter baru
    pdfContainer.innerHTML = ''; 
    pdfContainer.scrollTop = 0; // Kembalikan scroll ke paling atas
    cekTombolNavigasi();

    // Proses Baca File
    const fileData = await fileHandle.getFile();
    const arrayBuffer = await fileData.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    try {
        const pdfDoc = await loadingTask.promise;
        const totalPages = pdfDoc.numPages;

        // Loop untuk merender SETIAP halaman menjadi canvas baru (Mode Scroll)
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // Buat elemen canvas untuk setiap halaman
            const canvas = document.createElement('canvas');
            pdfContainer.appendChild(canvas); // Masukkan ke DOM berurutan
            
            // Render asinkron
            pdfDoc.getPage(pageNum).then(page => {
                const viewport = page.getViewport({ scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const ctx = canvas.getContext('2d');
                page.render({
                    canvasContext: ctx,
                    viewport: viewport
                });
            });
        }
    } catch (error) {
        alert('Gagal memuat PDF: ' + error.message);
    }
}

// 3. Logika Navigasi Antar Chapter
function cekTombolNavigasi() {
    // Matikan tombol prev jika di chapter pertama (index 0)
    prevBtn.disabled = currentChapterIndex <= 0;
    // Matikan tombol next jika di chapter terakhir
    nextBtn.disabled = currentChapterIndex >= (currentFiles.length - 1);
}

prevBtn.addEventListener('click', () => {
    if (currentChapterIndex > 0) {
        bukaChapter(currentChapterIndex - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentChapterIndex < currentFiles.length - 1) {
        bukaChapter(currentChapterIndex + 1);
    }
});

// Tombol Kembali
btnBack.addEventListener('click', () => {
    libraryView.style.display = 'block';
    readerView.style.display = 'none';
    btnBack.style.display = 'none';
    btnSelect.style.display = 'inline-block';
    pdfContainer.innerHTML = ''; // Bersihkan memori canvas
});

// ==========================================
// REGISTRASI SERVICE WORKER UNTUK PWA
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker berhasil didaftarkan dengan scope:', registration.scope);
            })
            .catch(error => {
                console.error('Pendaftaran ServiceWorker gagal:', error);
            });
    });
}

// ==========================================
// FITUR IMMERSIVE MODE (HILANGKAN HEADER)
// ==========================================
let isReadingMode = false;

// 1. Muncul / Hilang saat layar diklik (Tap)
pdfContainer.addEventListener('click', () => {
    isReadingMode = !isReadingMode; // Balikkan status
    
    if (isReadingMode) {
        document.body.classList.add('reading-mode'); // Hilangkan header
    } else {
        document.body.classList.remove('reading-mode'); // Munculkan header
    }
});

// 2. Hilang otomatis saat mulai scroll membaca
pdfContainer.addEventListener('scroll', () => {
    // Jika header masih terlihat dan user men-scroll lebih dari 10px ke bawah
    if (!isReadingMode && pdfContainer.scrollTop > 10) {
        document.body.classList.add('reading-mode');
        isReadingMode = true; // Set status menjadi tersembunyi
    }
});

// ==========================================
// FITUR PENCARIAN CHAPTER (REAL-TIME FILTER)
// ==========================================
searchBox.addEventListener('input', (e) => {
    // Ubah ketikan user menjadi huruf kecil semua agar pencarian tidak sensitif huruf besar/kecil
    const keyword = e.target.value.toLowerCase(); 
    
    // Ambil semua elemen chapter yang sedang tampil
    const items = fileList.querySelectorAll('.file-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        
        // Jika nama chapter mengandung kata/angka yang diketik
        if (text.includes(keyword)) {
            item.style.display = 'block'; // Tampilkan
        } else {
            item.style.display = 'none'; // Sembunyikan
        }
    });
});