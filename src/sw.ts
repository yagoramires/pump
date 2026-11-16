/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
// fotos: só lê o cache do plano; nunca grava aqui
registerRoute(({ url }) => url.hostname === 'cdn.jsdelivr.net',
  async ({ request }) => (await (await caches.open('pump-previews-v1')).match(request)) ?? fetch(request))
// sem rota para catalog/: vai sempre à rede
