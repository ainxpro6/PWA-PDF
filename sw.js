const CACHE_NAME = 'novel-reader-cache-v2';

// Daftar file yang akan disimpan di memori perangkat
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    // Cache library pdf.js agar tetap bisa merender PDF meski offline
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    // Catatan: Jika kamu punya gambar icon-192.png dan icon-512.png, tambahkan juga di sini
    // './icon-192.png',
    // './icon-512.png'
];

// Event Install: Menyimpan aset ke dalam cache browser
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache berhasil dibuka dan aset disimpan.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Event Activate: Membersihkan cache versi lama jika ada pembaruan (misal v2)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Event Fetch: Mencegat permintaan jaringan
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Jika file ada di cache, gunakan itu (offline mode)
                if (response) {
                    return response;
                }
                // Jika tidak ada di cache, baru minta ke jaringan (internet)
                return fetch(event.request);
            })
    );
});
