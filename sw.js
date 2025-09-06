const CACHE_NAME = 'my-music-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './All_Music.m3u8',
    './VN_Music.m3u8',
    './Nhac_Hoa.m3u8'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});
