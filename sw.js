const CACHE_NAME = 'gymawy-v11';

self.addEventListener('install', event => {
    console.log('✅ SW Installed');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('✅ SW Activated');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('firestore') || 
        event.request.url.includes('googleapis') ||
        event.request.url.includes('cloudinary') ||
        event.request.url.includes('gstatic')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

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
        body: data.body || '',
        icon: 'https://i.ibb.co/XZH0qHBR/logo.png',
        badge: 'https://i.ibb.co/XZH0qHBR/logo.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' }
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'Gymawy | جيماوي', 
            options
        )
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});