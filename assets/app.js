/* =========================================================================
   Permiso Digital — Landing
   Carrusel coverflow (Swiper) + render de PDF real (PDF.js) + modal.
   ========================================================================= */
(function () {
  'use strict';

  // ── PDF.js worker ──────────────────────────────────────────────────────
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

  // ── Datos de cada empresa (los PDF viven en pdfs/<key>.pdf) ─────────────
  const EMPRESAS = [
    { key: 'copetran',    nombre: 'Copetran',            color: '#1c4a8a', logo: 'copetran.svg',    codigo: 'PAA-28062026-45454' },
    { key: 'brasilia',    nombre: 'Expreso Brasilia',    color: '#e2001a', logo: 'brasilia.png',    codigo: 'PAA-04072026-64913' },
    { key: 'ochoa',       nombre: 'Rápido Ochoa',        color: '#c8102e', logo: 'ochoa.png',       codigo: 'PAA-11072026-79846' },
    { key: 'berlinas',    nombre: 'Berlinas del Fonce',  color: '#003a70', logo: 'berlinas.png',    codigo: 'PAA-29062026-25425' },
    { key: 'bolivariano', nombre: 'Expreso Bolivariano', color: '#0a6b3b', logo: 'bolivariano.jpg', codigo: 'PNN-2026-78753'     },
  ];
  const logoPath = (e) => 'assets/logos/' + e.logo;
  const pdfPath = (key) => 'pdfs/' + key + '.pdf';

  // ── Caché de documentos PDF cargados (para no recargarlos dos veces) ────
  const docCache = new Map();
  function loadDoc(key) {
    if (!docCache.has(key)) {
      docCache.set(key, pdfjs.getDocument(pdfPath(key)).promise);
    }
    return docCache.get(key);
  }

  // Renderiza una página del PDF a un canvas con un ancho objetivo (px CSS).
  async function renderPage(doc, pageNum, canvas, targetWidth) {
    const page = await doc.getPage(pageNum);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const base = page.getViewport({ scale: 1 });
    const scale = (targetWidth / base.width) * dpr;
    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.aspectRatio = (viewport.width / viewport.height).toFixed(4);
    const ctx = canvas.getContext('2d', { alpha: false });
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  }

  // ── Construir slides del carrusel ───────────────────────────────────────
  const wrapper = document.getElementById('permitWrapper');
  EMPRESAS.forEach((e) => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.dataset.key = e.key;
    slide.innerHTML =
      '<div class="slide-top" style="background:' + e.color + '"></div>' +
      '<div class="slide-canvas-wrap">' +
        '<div class="slide-loading"><div class="spinner"></div>Cargando…</div>' +
        '<span class="zoom-hint">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>' +
          'Clic para ampliar</span>' +
        '<canvas></canvas>' +
      '</div>' +
      '<div class="slide-foot">' +
        '<div class="co">' + e.nombre + '<small>Permiso de viaje</small></div>' +
        '<span class="open-ico">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>' +
        '</span>' +
      '</div>';
    slide.addEventListener('click', () => openModal(e.key));
    wrapper.appendChild(slide);
  });

  // ── Inicializar Swiper (efecto coverflow) ───────────────────────────────
  const swiper = new Swiper('#permitSwiper', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    initialSlide: 0,
    loop: true,
    speed: 480,
    coverflowEffect: { rotate: 26, stretch: 0, depth: 160, modifier: 1, slideShadows: false },
    keyboard: { enabled: true },
    navigation: { prevEl: '#prevBtn', nextEl: '#nextBtn' },
  });

  // Nombre de la empresa activa bajo el carrusel
  const activeName = document.getElementById('activeName');
  function refreshActive() {
    const slide = swiper.slides[swiper.activeIndex];
    const key = slide && slide.dataset.key;
    const e = EMPRESAS.find((x) => x.key === key);
    if (e) activeName.innerHTML = e.nombre + '<small>Toca para abrir el PDF</small>';
  }
  swiper.on('slideChange', refreshActive);
  refreshActive();

  // ── Render de la portada (página 1) de cada slide, perezoso ─────────────
  const rendered = new Set();
  async function renderSlide(slide) {
    const key = slide.dataset.key;
    if (!key || rendered.has(key)) return;
    rendered.add(key);
    const canvas = slide.querySelector('canvas');
    const loading = slide.querySelector('.slide-loading');
    try {
      const doc = await loadDoc(key);
      await renderPage(doc, 1, canvas, 600);
      if (loading) loading.remove();
    } catch (err) {
      rendered.delete(key);
      if (loading) loading.innerHTML = '<span style="color:#b3261e">No se pudo cargar</span>';
      console.error('Error renderizando', key, err);
    }
  }
  function renderVisible() {
    document.querySelectorAll('#permitWrapper .swiper-slide').forEach((s) => {
      // slides visibles o cercanos (coverflow muestra vecinos)
      if (s.classList.contains('swiper-slide-visible') || s.classList.contains('swiper-slide-active')) {
        renderSlide(s);
      }
    });
  }
  // Con loop, Swiper duplica slides: renderiza todos los que existan.
  document.querySelectorAll('#permitWrapper .swiper-slide').forEach(renderSlide);
  swiper.on('slideChangeTransitionStart', renderVisible);

  // ── Modal con el PDF completo ───────────────────────────────────────────
  const modal = document.getElementById('pdfModal');
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');
  const modalSub = document.getElementById('modalSub');
  const modalLogo = document.getElementById('modalLogo');
  const modalEstado = document.getElementById('modalEstado');
  const modalDownload = document.getElementById('modalDownload');
  let modalToken = 0;

  async function openModal(key) {
    const e = EMPRESAS.find((x) => x.key === key);
    if (!e) return;
    const token = ++modalToken;

    modalTitle.textContent = e.nombre;
    modalSub.textContent = 'Permiso de viaje · ' + e.codigo;
    modalLogo.src = logoPath(e);
    modalLogo.alt = e.nombre;
    modalEstado.textContent = 'Formato oficial';
    modalEstado.className = 'badge-estado activo';
    modalDownload.href = pdfPath(key);
    modalDownload.setAttribute('download', 'permiso-' + key + '.pdf');

    modalBody.innerHTML = '<div class="modal-loading"><div class="spinner"></div>Cargando PDF…</div>';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    try {
      const doc = await loadDoc(key);
      if (token !== modalToken) return; // se abrió otro entretanto
      modalBody.innerHTML = '';
      for (let n = 1; n <= doc.numPages; n++) {
        const canvas = document.createElement('canvas');
        modalBody.appendChild(canvas);
        await renderPage(doc, n, canvas, 720);
        if (token !== modalToken) return;
      }
    } catch (err) {
      if (token !== modalToken) return;
      modalBody.innerHTML = '<div class="modal-loading" style="color:#b3261e">No se pudo cargar el PDF.</div>';
      console.error('Error abriendo PDF', key, err);
    }
  }

  function closeModal() {
    modalToken++; // cancela renders en curso
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

  // ── Menú móvil ──────────────────────────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle) {
    navToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
    siteNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => siteNav.classList.remove('open')));
  }
})();

/* =========================================================================
   Simulación interactiva de la interfaz de AGENTE (validación en terminal).
   Réplica fiel del flujo real: buscar → estado → ficha → decisión.
   ========================================================================= */
(function () {
  'use strict';
  const screen = document.getElementById('agentScreen');
  if (!screen) return;

  const PERMISOS = [
    { key: 'ochoa', empresa: 'Rápido Ochoa', color: '#c8102e', iniciales: 'RO', codigo: 'PAA-11072026-79846',
      estado: 'ACTIVO',
      menor: { nombre: 'Juan Carlos Pérez', doc: 'Tarjeta de Identidad 454546444', edad: '16 años' },
      aut:   { nombre: 'Luis Prueba', cedula: '1234567890', calidad: 'Padre' },
      viaje: { fecha: '25 jul 2026', origen: 'Medellín', destino: 'Caucasia' } },
    { key: 'bolivariano', empresa: 'Expreso Bolivariano', color: '#0a6b3b', iniciales: 'BO', codigo: 'PNN-2026-78753',
      estado: 'ACTIVO',
      menor: { nombre: 'Eduard Newgate', doc: 'Registro Civil 152644845454', edad: '7 años' },
      aut:   { nombre: 'Luis Ángel Pérez López', cedula: '9999999999', calidad: 'Padre' },
      viaje: { fecha: '1 ago 2026', origen: 'Medellín', destino: 'Sucre' } },
    { key: 'copetran', empresa: 'Copetran', color: '#1c4a8a', iniciales: 'CT', codigo: 'PAA-28062026-45454',
      estado: 'VENCIDO',
      menor: { nombre: 'Samuel David', doc: 'Tarjeta de Identidad 5545454', edad: '14 años' },
      aut:   { nombre: 'Juan Carlos Pérez Ochoa', cedula: '72345891', calidad: 'Padre' },
      viaje: { fecha: '30 jun 2026', origen: 'Barranquilla', destino: 'Medellín' } },
    { key: 'brasilia', empresa: 'Expreso Brasilia', color: '#e2001a', iniciales: 'EB', codigo: 'PAA-04072026-64913',
      estado: 'VENCIDO',
      menor: { nombre: 'Javier Sosa', doc: 'Tarjeta de Identidad 4545445454', edad: '16 años' },
      aut:   { nombre: 'Luis Prueba', cedula: '1234567890', calidad: 'Padre' },
      viaje: { fecha: '10 jul 2026', origen: 'El Carmen de Bolívar', destino: 'Condoto' } },
    { key: 'berlinas', empresa: 'Berlinas del Fonce', color: '#003a70', iniciales: 'BF', codigo: 'PAA-29062026-25425',
      estado: 'VENCIDO',
      menor: { nombre: 'Gaus Junior', doc: 'Tarjeta de Identidad 10125425', edad: '14 años' },
      aut:   { nombre: 'Juan Carlos Pérez Ochoa', cedula: '72345891', calidad: 'Padre' },
      viaje: { fecha: '30 jun 2026', origen: 'Sahagún', destino: 'Ayapel' } },
  ];

  // Verificación por ESTADO del permiso (sin selfie ni biometría: eso ya no se usa).
  const ESTADOS = {
    ACTIVO:  { label: 'Válido',   cls: 'valido',  agente: 'Pendiente de tramitar', tramitable: true,
               d: 'El permiso es auténtico y está vigente para la empresa, ruta y fecha indicadas.' },
    VENCIDO: { label: 'Vencido',  cls: 'vencido', agente: 'Fuera de vigencia',      tramitable: false,
               d: 'La fecha de vigencia del permiso ya pasó. No puede autorizarse el abordaje.' },
    USADO:   { label: 'Ya usado', cls: 'usado',   agente: 'Ya tramitado',           tramitable: false,
               d: 'Este permiso ya fue utilizado y tramitado por un agente.' },
    ANULADO: { label: 'Anulado',  cls: 'anulado', agente: 'Anulado',                tramitable: false,
               d: 'El permiso fue anulado y no es válido.' },
  };
  const DEC = {
    aprobar:  { et: 'Aprobar',                     ds: 'La documentación es correcta. El menor puede abordar.',                  cls: 'aprobar',  res: 'Permiso aprobado' },
    revision: { et: 'Requiere revisión adicional', ds: 'Hay dudas. El permiso queda en revisión para un supervisor.',            cls: 'revision', res: 'Permiso en revisión' },
    rechazar: { et: 'Rechazar',                    ds: 'La documentación no es válida o no coincide. El menor no puede abordar.', cls: 'rechazar', res: 'Permiso rechazado' },
  };

  const I = {
    qr:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-3M17 21h.01"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    cam:    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7l1.5-2.5h3L15 7"/><circle cx="12" cy="13.5" r="3.2"/></svg>',
    back:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    arrow:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    check:  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/></svg>',
    xmark:  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    warn:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    clock:  '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>',
    checkbig:'<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/></svg>',
    shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    big: {
      aprobar:  '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/></svg>',
      revision: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
      rechazar: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    },
  };

  // Header idéntico al real (HeaderAgente): escudo + marca + empresa DINÁMICA + agente + salir + tabs.
  function appbar() {
    const emp = state.permit ? state.permit.empresa : 'Terminal de validación';
    return '<div class="ag-appbar">' +
      '<div class="ag-appbar-top">' +
        '<span class="ag-shield">' + I.shield + '</span>' +
        '<div class="ag-brand"><strong>Permiso Digital</strong><small>' + emp + '</small></div>' +
        '<div class="ag-user"><span class="ag-uname">Agente autorizado</span>' +
        '<button class="ag-salir" type="button">' + I.logout + ' Salir</button></div>' +
      '</div>' +
      '<div class="ag-tabs"><a class="on">Escanear</a><a>Historial</a></div>' +
    '</div>';
  }

  let state = { view: 'buscar', permit: null, decision: null, obs: '', error: '' };
  const find = (k) => PERMISOS.find((p) => p.key === k);

  function row(k, v) { return '<div class="ag-row"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }

  function viewBuscar() {
    const chips = PERMISOS.map((p) =>
      '<button class="ag-chip" data-key="' + p.key + '"><span class="dotc" style="background:' + p.color + '"></span>' +
      '<span class="cc"><b>' + p.empresa + '</b><span>' + p.codigo + '</span></span>' +
      '<span class="arrow">' + I.arrow + '</span></button>'
    ).join('');
    return appbar() + '<div class="ag-body">' +
      '<div><p class="ag-h1">Validar permiso</p><p class="ag-sub">Escanee el código o ingréselo manualmente.</p></div>' +
      '<div class="ag-grid2">' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          '<div class="ag-card"><h4>' + I.qr + ' Escáner de cámara</h4>' +
            '<div class="ag-scan" data-scan><div class="laser"></div>' + I.cam + '<span>Toca para simular el escaneo</span></div></div>' +
          '<div class="ag-card"><h4>' + I.search + ' Buscar por código</h4>' +
            '<div class="ag-field"><input class="ag-input" id="agCodigo" placeholder="Ej: PNN-2026-78753" autocomplete="off">' +
            '<button class="ag-btn ag-btn-primary" data-buscar>Buscar</button></div>' +
            (state.error ? '<p class="ag-hint" style="color:#d92d20;font-weight:600">' + state.error + '</p>'
                         : '<p class="ag-hint">El código está impreso en el permiso.</p>') + '</div>' +
        '</div>' +
        '<div class="ag-card"><h4>Permisos de demostración</h4><div class="ag-chips">' + chips + '</div></div>' +
      '</div>' +
    '</div>';
  }

  function viewValidar() {
    const p = state.permit, e = ESTADOS[p.estado] || ESTADOS.ACTIVO;
    const icoEstado = p.estado === 'ACTIVO' ? I.checkbig : p.estado === 'VENCIDO' ? I.clock : I.xmark;

    let panel;
    if (e.tramitable) {
      const opts = ['aprobar', 'revision', 'rechazar'].map((k) => {
        const d = DEC[k], sel = state.decision === k;
        const ic = k === 'aprobar' ? I.check : k === 'rechazar' ? I.xmark : I.warn;
        return '<button class="ag-opt ' + (sel ? 'sel ' + d.cls : '') + '" data-dec="' + k + '">' +
          '<span class="oi">' + ic + '</span><span><b>' + d.et + '</b><p>' + d.ds + '</p></span></button>';
      }).join('');
      const necesitaObs = state.decision && state.decision !== 'aprobar';
      const obsBlock = state.decision
        ? '<label style="display:block;font-size:12px;font-weight:600;margin:4px 0 6px">' +
          (necesitaObs ? 'Motivo u observación <span style="color:#dc2626">*</span>' : 'Observación (opcional)') + '</label>' +
          '<textarea class="ag-textarea" id="agObs" rows="2" placeholder="Describa brevemente...">' + state.obs + '</textarea>'
        : '';
      const confirmClase = state.decision ? DEC[state.decision].cls : '';
      const confirmOk = state.decision && (state.decision === 'aprobar' || state.obs.trim());
      panel = '<div class="ag-sec"><h5>Registrar decisión</h5>' + opts +
        '<div id="agObsWrap" style="margin:6px 0 10px">' + obsBlock + '</div>' +
        '<div class="ag-disclaimer">Al confirmar, usted como agente asume la responsabilidad de esta validación según los protocolos de su empresa y la normativa del <strong>Ministerio de Transporte de Colombia</strong>.</div>' +
        '<button class="ag-confirm ' + confirmClase + '" id="agConfirm" ' + (confirmOk ? '' : 'disabled') + ' style="margin-top:10px">' +
        (state.decision ? 'Confirmar: ' + DEC[state.decision].et : 'Seleccione una decisión') + '</button>' +
        '</div>';
    } else {
      panel = '<div class="ag-bloqueado"><span class="oi">' + I.warn + '</span>' +
        '<div><b>No se puede tramitar</b><p>' + e.d + ' El menor no puede abordar con este permiso.</p></div></div>';
    }

    return appbar() + '<div class="ag-body">' +
      '<button class="ag-back" data-back>' + I.back + ' Volver</button>' +
      '<div><p class="ag-h1">Verificación de permiso</p><p class="ag-sub">Código: <b style="font-family:ui-monospace,monospace">' + p.codigo + '</b></p></div>' +
      '<div class="ag-status ' + e.cls + '"><span class="si">' + icoEstado + '</span>' +
        '<div class="stx"><div class="st">' + e.label + '</div><div class="sc">' + p.codigo + '</div><div class="sa">' + e.agente + '</div></div>' +
        '<span class="ag-emp" style="background:' + p.color + '">' + p.iniciales + '</span></div>' +
      '<div class="ag-grid2">' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="ag-sec"><h5>Empresa</h5>' + row('Nombre', p.empresa) + row('Tipo', 'Transporte intermunicipal') + '</div>' +
        '<div class="ag-sec"><h5>Menor de edad</h5>' + row('Nombre', p.menor.nombre) + row('Documento', p.menor.doc) + row('Edad', p.menor.edad) + '</div>' +
        '<div class="ag-sec"><h5>Viaje</h5>' + row('Fecha', p.viaje.fecha) + row('Origen', p.viaje.origen) + row('Destino', p.viaje.destino) + '</div>' +
        '<div class="ag-sec"><h5>Quien autoriza</h5>' + row('Nombre', p.aut.nombre) + row('Cédula', p.aut.cedula) + row('Calidad', p.aut.calidad) + '</div>' +
      '</div>' +
      '<div>' + panel + '</div>' +
      '</div>' +
      '<div class="ag-validez">' + I.shield + '<span>Permiso válido según la Circular Externa 20244000000557 de la Superintendencia de Transporte (ago. 2024). Válido únicamente para la empresa, ruta y fecha indicadas.</span></div>' +
    '</div>';
  }

  function viewResultado() {
    const p = state.permit, d = DEC[state.decision];
    const ahora = new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return appbar() + '<div class="ag-result ' + d.cls + '"><div class="rico">' + I.big[d.cls] + '</div>' +
      '<h3>' + d.res + '</h3>' +
      '<div class="rmeta">' +
        '<div><span>Código</span><span>' + p.codigo + '</span></div>' +
        '<div><span>Decisión</span><span>' + d.et + '</span></div>' +
        '<div><span>Agente</span><span>Agente · ' + p.empresa + '</span></div>' +
        '<div><span>Fecha y hora</span><span>' + ahora + '</span></div>' +
      '</div>' +
      '<button class="ag-btn ag-btn-primary" data-reset style="width:100%">Validar otro permiso</button></div>';
  }

  function render() {
    screen.innerHTML = state.view === 'buscar' ? viewBuscar() : state.view === 'validar' ? viewValidar() : viewResultado();
    screen.scrollTop = 0;
  }
  function go(view, patch) { state = Object.assign(state, { view: view, error: '' }, patch || {}); render(); }

  function actualizarConfirm() {
    const btn = screen.querySelector('#agConfirm');
    if (!btn) return;
    const ok = state.decision && (state.decision === 'aprobar' || state.obs.trim());
    btn.disabled = !ok;
  }

  screen.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-key]');
    if (chip) return go('validar', { permit: find(chip.dataset.key), decision: null, obs: '' });
    if (e.target.closest('[data-scan]')) return go('validar', { permit: PERMISOS[Math.floor(Math.random() * PERMISOS.length)], decision: null, obs: '' });
    if (e.target.closest('[data-buscar]')) return buscar();
    if (e.target.closest('[data-back]')) return go('buscar', { permit: null, decision: null, obs: '' });
    if (e.target.closest('[data-reset]')) return go('buscar', { permit: null, decision: null, obs: '' });
    const opt = e.target.closest('[data-dec]');
    if (opt) { state.decision = opt.dataset.dec; state.obs = ''; render(); return; }
    if (e.target.closest('#agConfirm') && !e.target.closest('#agConfirm').disabled) return go('resultado');
  });
  screen.addEventListener('input', (e) => { if (e.target.id === 'agObs') { state.obs = e.target.value; actualizarConfirm(); } });
  screen.addEventListener('keydown', (e) => { if (e.target.id === 'agCodigo' && e.key === 'Enter') { e.preventDefault(); buscar(); } });

  function buscar() {
    const input = screen.querySelector('#agCodigo');
    const val = (input ? input.value : '').trim().toUpperCase();
    if (!val) return;
    const p = PERMISOS.find((x) => x.codigo.toUpperCase() === val || x.codigo.toUpperCase().indexOf(val) !== -1);
    if (p) return go('validar', { permit: p, decision: null, obs: '' });
    state.error = 'Permiso no encontrado. Verifique el código.';
    render();
  }

  render();
})();
