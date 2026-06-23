// ==================== SERVICE WORKER ====================
const CACHE_NAME = 'gymawy-v5';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    'https://i.ibb.co/XZH0qHBR/logo.png',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                console.log('Cache install error:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network First, Cache Fallback
self.addEventListener('fetch', event => {
    // Skip Firebase and API calls
    if (event.request.url.includes('firestore') || 
        event.request.url.includes('googleapis') ||
        event.request.url.includes('cloudinary') ||
        event.request.url.includes('gstatic')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline fallback
                return caches.match(event.request).then(cached => {
                    return cached || new Response('غير متصل بالإنترنت', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                });
            })
    );
});

// Push Notification
self.addEventListener('push', event => {
    let data = {};
    try {
        data = event.data?.json() || {};
    } catch(e) {
        data = {
            title: 'Gymawy | جيماوي',
            body: event.data?.text() || 'إشعار جديد'
        };
    }
    
    const options = {
        body: data.body || 'إشعار جديد من Gymawy',
        icon: 'https://i.ibb.co/XZH0qHBR/logo.png',
        badge: 'https://i.ibb.co/XZH0qHBR/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'فتح' },
            { action: 'close', title: 'إغلاق' }
        ],
        tag: 'gymawy-notification',
        renotify: true,
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'Gymawy | جيماوي',
            options
        )
    );
});

// Notification Click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'close') return;
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});