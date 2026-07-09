const CACHE_NAME = 'kering-visit-v10';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// 설치 시 정적 에셋만 캐싱 (index.html 제외)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// 구버전 캐시 삭제 후 즉시 활성화
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 구글 Apps Script 요청은 항상 네트워크로
  if (url.hostname.includes('script.google.com')) return;

  // index.html은 항상 네트워크 우선 → 오프라인일 때만 캐시 사용
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(response => {
          // 최신 버전을 캐시에도 저장 (온라인일 때 항상 최신 HTML)
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 나머지 에셋은 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
