const CACHE_NAME = 'cyber-warforge-pwa-v1.0';

// 需全量预缓存的核心静态资源清单
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './css/styles.css',
    './js/state.js',
    './js/utils.js',
    './js/storage.js',
    './js/duty.js',
    './js/timer.js',
    './js/pnf-timer.js',
    './js/hang-timer.js',
    './js/arsenal-queue.js',
    './js/quick-action.js',
    './js/diary-workbench.js',
    './js/views.js',
    './js/app.js',
    'https://cdn.bootcdn.net/ajax/libs/dexie/3.2.4/dexie.min.js'
];

// 1. 安装阶段：立即预载所有核心文件至本地硬件缓存
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[PWA] 正在全力预缓存天罡战阙核心文件...');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => {
            return self.skipWaiting(); // 跳过等待，立即生效
        })
    );
});

// 2. 激活阶段：清理旧版本缓存，保持空间纯净
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name !== CACHE_NAME) {
                        console.log('[PWA] 清理旧版本缓存:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // 立即接管所有客户端页面
        })
    );
});

// 3. 拦截请求：优先从本地离线缓存读取，彻底告别网络与防火墙限制
self.addEventListener('fetch', event => {
    // 仅处理 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // 本地已缓存：立刻秒开返回，并在后台静默拉取是否有更新
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // 离线状态下网络请求失败是预期行为，静默忽略
                });
                return cachedResponse;
            }

            // 本地无缓存：通过网络获取并存入缓存备用
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // 断网环境且未命中缓存时的兜底（返回已缓存的主页）
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});