// VAO POS · service worker V33. A propósito NO guarda copias de nada:
// la app siempre carga la última versión publicada (actualiza sola, sin reinstalar)
// y las ventas siempre van directo al servidor.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // no intercepta nada
