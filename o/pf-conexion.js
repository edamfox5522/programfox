// ============================================================
//  ProgramFox - Conexión de los overlays
//
//  Sirve igual en OBS y en TikTok LIVE Studio:
//   - http://127.0.0.1:8765/banderas            -> directo a ProgramFox (tu PC)
//   - https://.../o/banderas.html?k=TU_CLAVE     -> por internet (como Asure)
//     ProgramFox manda los datos a la nube con tu clave y el overlay los recibe.
// ============================================================
(function () {
  const q = new URLSearchParams(location.search);
  const KEY = (q.get('k') || '').trim();
  const NUBE = !!KEY && !/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const PORT = q.get('port') || '8765';
  // Archivos de tu PC (imágenes/videos de alertas)
  window.PF_BASE = NUBE ? `http://127.0.0.1:${PORT}` : '';
  window.pfMedia = (u) => (u && String(u).startsWith('/') ? window.PF_BASE + u : u);

  window.pfConnect = function (onMsg, nombre) {
    if (!NUBE) {
      (function conectar() {
        const ws = new WebSocket(`ws://${location.host}/ws`);
        ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg(m); };
        ws.onclose = () => setTimeout(conectar, 2000);
        ws.onerror = () => ws.close();
      })();
      return;
    }
    const cfg = window.PF_CFG || {};
    if (!window.supabase || !cfg.url || !cfg.key) { console.error('ProgramFox: falta la configuración de la nube'); return; }
    const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });
    let ch = null;
    const unirse = () => {
      if (ch) { try { sb.removeChannel(ch); } catch (_) {} }
      ch = sb.channel('pf-' + KEY, { config: { broadcast: { self: false }, presence: { key: (nombre || 'overlay') + '-' + Math.random().toString(36).slice(2, 8) } } });
      ch.on('broadcast', { event: 'm' }, (r) => { if (r && r.payload) onMsg(r.payload); });
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED') ch.track({ o: nombre || 'overlay', t: Date.now() });
        if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') setTimeout(unirse, 5000);
      });
    };
    unirse();
  };
})();
