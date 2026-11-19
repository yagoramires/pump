/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { IMAGE_HOST, PREVIEW_CACHE } from './catalog/urls'

self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
registerRoute(({ url }) => url.hostname === IMAGE_HOST,
  async ({ request }) => (await (await caches.open(PREVIEW_CACHE)).match(request)) ?? fetch(request))
// sem rota para catalog/: vai sempre à rede
