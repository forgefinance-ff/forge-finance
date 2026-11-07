// Service worker do Forge Finance.
// Existe para o app poder ser instalado. De propósito NÃO guarda páginas nem dados
// em cache: são dados financeiros e precisam estar sempre atualizados.
// Sem internet, mostra uma tela simples em vez da página de erro do navegador.

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forge Finance · sem conexão</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#06060c;color:#e9e6f5;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:20px;margin:16px 0 8px}p{color:#a39fb8;margin:0 0 20px}
button{background:#7c3aed;color:#fff;border:0;border-radius:12px;padding:12px 20px;font-size:15px;font-weight:600}</style>
</head><body><div><h1>Você está sem internet</h1><p>Conecte-se para ver seus dados atualizados.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return; // o resto segue direto para a rede

  event.respondWith(
    fetch(request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
