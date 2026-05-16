// Deklarasi Elemen DOM
const btnSelect = document.getElementById('btn-select-folder');
const btnBack = document.getElementById('btn-back');
const libraryView = document.getElementById('library-view');
const readerView = document.getElementById('reader-view');
const fileList = document.getElementById('file-list');
const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');

// State PDF
let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
const scale = 1.5; // Zoom canvas

// 1. Fungsi Memilih Folder Lokal
btnSelect.addEventListener('click', async () => {
    try {
        // Meminta akses direktori
        const directoryHandle = await window.showDirectoryPicker();
        fileList.innerHTML = ''; 
        
        // Membaca isi folder
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
                buatElemenFile(entry);
            }
        }
        
        if(fileList.innerHTML === '') {
            fileList.innerHTML = '<p>Tidak ada file PDF di folder ini.</p>';
        }
    } catch (e) {
        console.error('Batal memilih folder atau tidak ada izin:', e);
    }
});

// Membuat UI List File
function buatElemenFile(fileHandle) {
    const div = document.createElement('div');
    div.className = 'file-item';
    // Hapus ekstensi .pdf untuk tampilan yang lebih rapi
    div.textContent = fileHandle.name.replace('.pdf', ''); 
    div.onclick = () => bukaPdf(fileHandle);
    fileList.appendChild(div);
}

// 2. Fungsi Membuka File PDF Lokal
async function bukaPdf(fileHandle) {
    // Ambil object File dari handle, lalu ubah ke ArrayBuffer
    const fileData = await fileHandle.getFile();
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Ganti tampilan UI
    libraryView.style.display = 'none';
    readerView.style.display = 'block';
    btnBack.style.display = 'inline-block';
    btnSelect.style.display = 'none';

    // Memuat dokumen PDF menggunakan buffer
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    try {
        pdfDoc = await loadingTask.promise;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        pageNum = 1;
        renderPage(pageNum);
    } catch (error) {
        alert('Gagal memuat PDF: ' + error.message);
    }
}

// 3. Render Halaman ke Canvas
const renderPage = num => {
    pageIsRendering = true;
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
    });
    
    // Update UI angka halaman
    document.getElementById('page-num').textContent = num;
};

// Antrean render (mencegah crash jika tombol ditekan cepat)
const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

// 4. Navigasi Previous & Next
document.getElementById('prev-btn').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

// Tombol Kembali ke Library
btnBack.addEventListener('click', () => {
    libraryView.style.display = 'block';
    readerView.style.display = 'none';
    btnBack.style.display = 'none';
    btnSelect.style.display = 'inline-block';
});