/* Retire the previous NPPV app's offline cache. No new offline caching. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-') && name.includes(scope)).map(name => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
    const clients = await self.clients.matchAll({type:'window'});
    await Promise.all(clients.filter(client => client.url.startsWith(scope)).map(client => client.navigate(client.url)));
  })());
});
