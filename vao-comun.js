/* vao-comun.js — v045.2: WhatsApp con número internacional (54 9 …) y primero WhatsApp Business (regla de oro, 13/11/2026). v044.1 (STAGING AR). v044.1: aplicaciones base (sin prestación), menú para cambiar de aplicación con la misma sesión, P3 PRO.
   v044: Base compartida de los módulos de VAO POS.
   Un solo lugar para: dirección del servidor, sesión del comercio (el mismo PIN/token del POS), permisos por plan,
   navegación de vuelta al POS, mensajes y formato. Cada módulo es un HTML independiente que usa esta base.
   La pantalla solo muestra: cada acción la vuelve a validar el servidor (sesión, plan y complemento contratado). */
(function () {
  'use strict';
  var API_URL = 'https://script.google.com/macros/s/AKfycbzuRgk0h-gd5OXdZ3Q2Dw2Kudx8V7jY6ZwhuWvfg8JYfbU1mr2SU_K3zuFriRDRyUAU9A/exec';   // PRODUCCIÓN AR
  var qs = new URLSearchParams(location.search);
  var PREFIJO = String(qs.get('p') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  var TOKEN_KEY = 'vao_token_' + PREFIJO;
  var VAO = window.VAO = { prefijo: PREFIJO, config: null, prestaciones: null, soloLectura: false, version: 'v044.1' };

  VAO.token = function () { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
  VAO.esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  VAO.pesos = function (n) { var v = Number(n) || 0; return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 2 }); };
  VAO.num = function (t) { var s = String(t == null ? '' : t).trim().replace(/\s/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? 0 : n; };
  VAO.hoy = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  VAO.opId = function (pref) { return (pref || 'OP') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); };
  VAO.urlPos = function () { return 'pos.html?p=' + encodeURIComponent(PREFIJO); };
  VAO.esAndroid = function () { return /Android/i.test(navigator.userAgent || ''); };

  // Comunicación con el servidor: POST con texto plano (sin pre-vuelo). Nunca se mandan claves en la dirección.
  VAO.api = function (action, data) {
    var body = JSON.stringify({ action: action, prefijo: PREFIJO, data: Object.assign({ token: VAO.token() }, data || {}) });
    return fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && /sesi[oó]n/i.test(j.error || '') && /venci|inv[aá]lid|PIN/i.test(j.error || '')) VAO.sesionVencida(j.error);
        return j;
      });
  };
  VAO.sinConexion = 'Sin conexión: no se registró nada nuevo. Revisá internet y volvé a intentar (no se duplica).';

  VAO.toast = function (msg, tipo) {
    var t = document.getElementById('vaoToast');
    if (!t) { t = document.createElement('div'); t.id = 'vaoToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.className = 'vao-toast visible ' + (tipo || ''); t.textContent = msg;
    clearTimeout(VAO._tt); VAO._tt = setTimeout(function () { t.className = 'vao-toast'; }, 4500);
  };
  VAO.msg = function (el, texto, tipo) { if (typeof el === 'string') el = document.getElementById(el); if (!el) return;
    el.className = 'vao-msg ' + (texto ? (tipo || 'info') : 'oculto'); el.textContent = texto || ''; };

  VAO.sesionVencida = function (texto) {
    var m = document.getElementById('vaoBloqueo'); if (!m) return;
    m.innerHTML = '<div class="vao-tarjeta vao-centro"><div class="vao-grande">🔒</div><h2>Tu sesión venció</h2><p>' + VAO.esc(texto || 'Volvé a entrar con tu PIN desde el POS.') +
      '</p><a class="vao-btn primario" href="' + VAO.urlPos() + '">Ir al POS</a></div>';
    m.classList.remove('oculto'); var c = document.getElementById('vaoContenido'); if (c) c.classList.add('oculto');
  };

  // Encabezado común + verificación de sesión y de permiso del complemento.
  // opts: { modulo: 'extra_cotizador', titulo, icono, grupo: 'P3' }
  VAO.iniciar = function (opts) {
    document.documentElement.setAttribute('data-grupo', opts.grupo || 'P3');
    var cab = document.getElementById('vaoCabecera');
    if (cab) cab.innerHTML = '<a class="vao-volver" href="' + VAO.urlPos() + '" aria-label="Volver al POS">← POS</a>' +
      '<div class="vao-tit"><span class="vao-sello" title="' + VAO.esc({ P1: 'P1 Esencial', P2: 'P2 Gestión', P3: 'P3 PRO', C: 'Complemento opcional' }[opts.grupo] || '') + '">' + VAO.esc({ P1: 'P1', P2: 'P2', P3: 'PRO', C: '➕' }[opts.grupo] || 'P1') + '</span><h1>' + VAO.esc((opts.icono ? opts.icono + ' ' : '') + opts.titulo) + '</h1></div>' +
      '<div class="vao-comercio" id="vaoComercio">' + VAO.esc(PREFIJO) + '</div><button class="vao-apps-btn oculto" id="vaoAppsBtn" aria-label="Otras aplicaciones" title="Otras aplicaciones">☰</button>';
    document.title = opts.titulo + ' · VAO POS';
    var bloqueo = document.getElementById('vaoBloqueo'), cont = document.getElementById('vaoContenido');
    var mostrar = function (html) { bloqueo.innerHTML = html; bloqueo.classList.remove('oculto'); cont.classList.add('oculto'); };
    if (!PREFIJO || !VAO.token()) { mostrar('<div class="vao-tarjeta vao-centro"><div class="vao-grande">🔒</div><h2>Entrá desde el POS</h2><p>Esta herramienta usa la misma sesión del POS. Abrí el POS, poné tu PIN y volvé a tocar el botón.</p><a class="vao-btn primario" href="' + VAO.urlPos() + '">Ir al POS</a></div>'); return Promise.resolve(null); }
    return VAO.api('getConfig', { modoConsulta: true }).then(function (r) {
      if (!r || r.error) { VAO.sesionVencida(r && r.error); return null; }
      VAO.config = r.config || {}; VAO.prestaciones = r.prestaciones || null; VAO.soloLectura = !!(VAO.config.modoConsulta);
      var nom = VAO.config.nombre_empresa || VAO.config.title || PREFIJO; var cc = document.getElementById('vaoComercio'); if (cc) cc.textContent = nom;
      var hab = !opts.modulo ? true : (VAO.prestaciones && VAO.prestaciones.modulos ? VAO.prestaciones.modulos[opts.modulo] === true : false);   // v044.1: sin prestación = base (todos los planes)
      VAO._menuApps(opts);
      if (!hab) {
        mostrar('<div class="vao-tarjeta vao-centro"><div class="vao-grande">🧩</div><h2>' + VAO.esc(opts.titulo) + ' no está en tu plan</h2>' +
          '<p>' + ({ P2: 'Es parte del plan P2 Gestión.', P3: 'Es parte del paquete P3 PRO.', C: 'Es un complemento opcional que se suma a tu plan.' }[opts.grupo] || 'No está incluida en tu plan.') + ' Si la querés, pedila desde <b>💳 Mi plan</b> en el POS: VAO Sistemas la activa cuando confirma el pago.</p><a class="vao-btn primario" href="' + VAO.urlPos() + '">Volver al POS</a></div>');
        return null;
      }
      if (VAO.soloLectura) { var a = document.getElementById('vaoAviso'); if (a) { a.className = 'vao-msg aviso'; a.textContent = '🔒 Tu plan está vencido o suspendido: podés consultar, pero no registrar operaciones nuevas.'; } document.documentElement.classList.add('vao-solo-lectura'); }
      bloqueo.classList.add('oculto'); cont.classList.remove('oculto');
      return r;
    }).catch(function () { mostrar('<div class="vao-tarjeta vao-centro"><div class="vao-grande">📡</div><h2>Sin conexión</h2><p>No se pudo verificar tu sesión. Revisá internet y recargá la página.</p><button class="vao-btn primario" onclick="location.reload()">Reintentar</button></div>'); return null; });
  };


  // v044.1: menú de aplicaciones (solo las páginas que habilita el plan; la lista viene de la matriz central del servidor)
  VAO._menuApps = function (opts) {
    var apps = (VAO.prestaciones && VAO.prestaciones.apps) || [], b = document.getElementById('vaoAppsBtn');
    var vis = apps.filter(function (a) { return a.pagina && a.habilitada && (!a.soloAndroid || VAO.esAndroid()); });
    if (!b || !vis.length) return;
    b.classList.remove('oculto');
    var nom = { P1: 'P1 Esencial', P2: 'P2 Gestión', P3: 'P3 PRO', C: 'Complementos' }, actual = (location.pathname.split('/').pop() || '');
    b.onclick = function () {
      var m = document.createElement('div'); m.className = 'vao-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Aplicaciones');
      var html = '<div><h2 style="margin:0 0 6px">Aplicaciones</h2><div class="vao-apps"><a href="' + VAO.urlPos() + '"><span class="i">🛒</span>Vender (POS)</a>';
      ['P1', 'P2', 'P3', 'C'].forEach(function (g) { var l = vis.filter(function (a) { return a.grupo === g; }); if (!l.length) return;
        html += '<h3>' + nom[g] + '</h3>' + l.map(function (a) { return '<a href="' + VAO.esc(a.destino) + '?p=' + encodeURIComponent(PREFIJO) + '"' + (a.destino === actual ? ' class="actual" aria-current="page"' : '') + '><span class="i">' + VAO.esc(a.icono) + '</span>' + VAO.esc(a.nombre) + '</a>'; }).join(''); });
      m.innerHTML = html + '</div><div class="vao-fila" style="margin-top:10px"><button class="vao-btn" id="vaoAppsCerrar">Cerrar</button></div></div>';
      document.body.appendChild(m); m.addEventListener('click', function (e) { if (e.target === m) m.remove(); }); m.querySelector('#vaoAppsCerrar').onclick = function () { m.remove(); };
    };
  };
  VAO.vacio = function (icono, texto) { return '<div class="vao-vacio"><span class="i">' + icono + '</span>' + VAO.esc(texto) + '</div>'; };

  // Operador: quién hace la operación (se recuerda en este equipo, nunca se guarda un PIN)
  VAO.operador = function (v) { var k = 'vao_operador_' + PREFIJO; try { if (v !== undefined) localStorage.setItem(k, v); return localStorage.getItem(k) || ''; } catch (e) { return v || ''; } };
  // Anulación con vista previa (regla C2): motivo + operador → «Ver qué cambia» (no escribe) → «Confirmar». Mismo número de operación.
  // opts: { titulo, accion, datos, describir(previa) → html, alTerminar() }
  VAO.anular = function (opts) {
    var opId = VAO.opId('ANU'), m = document.createElement('div'); m.className = 'vao-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div><h2 style="margin:0 0 8px">↩️ ' + VAO.esc(opts.titulo) + '</h2><p class="vao-msg aviso">El registro original no se borra: se agrega una anulación con tu motivo y queda en el historial.</p>' +
      '<div class="vao-campo"><label>Motivo (obligatorio)</label><input id="anMotivo" maxlength="200"></div><div class="vao-campo"><label>Quién la hace</label><input id="anOperador" maxlength="60" value="' + VAO.esc(VAO.operador()) + '"></div>' +
      '<div id="anPrevia"></div><div id="anMsg" class="oculto"></div><div class="vao-fila"><button class="vao-btn primario" id="anVer">Ver qué cambia</button><button class="vao-btn" id="anCerrar">Cerrar</button></div></div>';
    document.body.appendChild(m);
    var cerrar = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) cerrar(); });
    m.querySelector('#anCerrar').addEventListener('click', cerrar);
    var paso = 'ver', btn = m.querySelector('#anVer');
    btn.addEventListener('click', function () {
      var motivo = m.querySelector('#anMotivo').value.trim(), oper = m.querySelector('#anOperador').value.trim();
      if (motivo.length < 3) { VAO.msg(m.querySelector('#anMsg'), 'Escribí el motivo.', 'error'); return; }
      if (!oper) { VAO.msg(m.querySelector('#anMsg'), 'Escribí quién hace la anulación.', 'error'); return; }
      VAO.operador(oper); btn.disabled = true;
      VAO.api(opts.accion, Object.assign({}, opts.datos, { motivo: motivo, operador: oper, opId: opId, confirmar: paso === 'confirmar' })).then(function (r) {
        btn.disabled = false;
        if (!r.success) { VAO.msg(m.querySelector('#anMsg'), r.error || 'No se pudo.', 'error'); return; }
        if (r.vistaPrevia) { m.querySelector('#anPrevia').innerHTML = '<div class="vao-tarjeta" style="border-top-color:var(--naranja)"><b>Qué va a pasar</b>' + opts.describir(r.previa) + '</div>';
          VAO.msg(m.querySelector('#anMsg'), 'Vista previa: todavía no se cambió nada.', 'info'); paso = 'confirmar'; btn.textContent = 'Confirmar anulación'; btn.classList.add('peligro'); btn.classList.remove('primario'); return; }
        cerrar(); VAO.toast(r.mensaje, 'ok'); if (opts.alTerminar) opts.alTerminar(r);
      }).catch(function () { btn.disabled = false; VAO.msg(m.querySelector('#anMsg'), VAO.sinConexion, 'error'); });
    });
    m.querySelector('#anMotivo').focus();
  };


  // Productos del comercio (una vez por pantalla) y buscador común
  VAO.productos = function () { if (VAO._prods) return Promise.resolve(VAO._prods); return VAO.api('getProductos', {}).then(function (r) { VAO._prods = (r && r.productos) || []; return VAO._prods; }); };
  VAO.buscador = function (input, caja, alElegir, extra) {
    input = typeof input === 'string' ? document.getElementById(input) : input; caja = typeof caja === 'string' ? document.getElementById(caja) : caja;
    input.addEventListener('input', function () {
      var q = input.value.trim().toUpperCase(); if (q.length < 2) { caja.classList.add('oculto'); return; }
      var pal = q.split(/\s+/), r = (VAO._prods || []).filter(function (p) { var t = (p.name + ' ' + p.codigo).toUpperCase(); return pal.every(function (w) { return t.indexOf(w) !== -1; }); }).slice(0, 12);
      caja.innerHTML = r.length ? r.map(function (p) { return '<button type="button" data-id="' + p.id + '"><span>' + VAO.esc(p.name) + '</span><small>' + (extra ? extra(p) : 'stock ' + p.stock) + '</small></button>'; }).join('') : '<div style="padding:10px;color:var(--suave)">Sin resultados</div>';
      caja.classList.remove('oculto');
      caja.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { var p = VAO._prods.filter(function (x) { return String(x.id) === b.dataset.id; })[0]; input.value = ''; caja.classList.add('oculto'); alElegir(p); }); });
    });
  };

  // Pestañas simples: botones [data-tab] y paneles [data-panel]
  VAO.pestanas = function (cont, alCambiar) {
    var root = typeof cont === 'string' ? document.getElementById(cont) : cont;
    var bs = root.querySelectorAll('[data-tab]');
    bs.forEach(function (b) { b.addEventListener('click', function () { VAO.irA(root, b.dataset.tab); if (alCambiar) alCambiar(b.dataset.tab); }); });
  };
  VAO.irA = function (root, tab) {
    root.querySelectorAll('[data-tab]').forEach(function (x) { var on = x.dataset.tab === tab; x.classList.toggle('activo', on); x.setAttribute('aria-selected', on); });
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.classList.toggle('oculto', p.dataset.panel !== tab); });
  };
  // Compartir texto: WhatsApp (sin número = el usuario elige el contacto) o el menú del celular
  VAO.whatsapp = function (texto, telefono) { abrirWhatsAppVAO(telefono || '', texto); };   // v045.2: número internacional y primero WhatsApp Business
})();

// ===== V45.2 — REGLA DE ORO (dueño, 13/11/2026): WhatsApp abre PRIMERO WhatsApp Business; si no está, WhatsApp común =====
// · Número en formato internacional argentino: 54 + 9 + característica + número (sin 0 ni 15). Ej.: «0294 15 4907380» → 5492944907380.
// · Android: se pide WhatsApp Business (com.whatsapp.w4b); si no está instalado, el mismo pedido sigue por el enlace web,
//   que abre WhatsApp común. iPhone y computadora: enlace web (ahí no se puede elegir la aplicación).
function _telWaVAO_(t) {
    var d = String(t || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('549') === 0 && d.length === 13) return d;
    if (d.indexOf('54') === 0 && d.length === 12) return '549' + d.slice(2);   // celular argentino sin el 9
    if (d.charAt(0) === '0') d = d.slice(1);
    if (d.length === 12) { for (var k = 2; k <= 4; k++) if (d.substr(k, 2) === '15') { d = d.slice(0, k) + d.slice(k + 2); break; } }   // característica + 15 + número
    if (d.length === 10) return '549' + d;
    return d;   // otro país (por ejemplo Chile 569…): tal cual
}
function _urlWaVAO_(tel, texto) { var n = _telWaVAO_(tel); return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : ''); }
function abrirWhatsAppVAO(tel, texto) {
    var web = _urlWaVAO_(tel, texto);
    if (/Android/i.test(navigator.userAgent || '')) {
        var n = _telWaVAO_(tel), q = (n ? 'phone=' + n : '') + (texto ? (n ? '&' : '') + 'text=' + encodeURIComponent(texto) : '');
        window.open('intent://send/?' + q + '#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=' + encodeURIComponent(web) + ';end', '_blank');
        return;
    }
    window.open(web, '_blank', 'noopener');
}
// Cualquier enlace https://wa.me/… de la página pasa por la misma regla.
document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="https://wa.me/"]') : null; if (!a) return;
    e.preventDefault(); var u = new URL(a.href); abrirWhatsAppVAO(u.pathname.replace(/\//g, ''), u.searchParams.get('text') || '');
}, true);
