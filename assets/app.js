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
    { key: 'copetran',    nombre: 'Copetran',            color: '#1c4a8a', iniciales: 'CO', menor: 'Samuel David',   codigo: 'PAA-28062026-45454', estado: 'vencido' },
    { key: 'brasilia',    nombre: 'Expreso Brasilia',    color: '#e2001a', iniciales: 'EB', menor: 'Javier Sosa',    codigo: 'PAA-04072026-64913', estado: 'vencido' },
    { key: 'ochoa',       nombre: 'Rápido Ochoa',        color: '#c8102e', iniciales: 'RO', menor: 'Juan C. Pérez',  codigo: 'PAA-11072026-79846', estado: 'activo'  },
    { key: 'berlinas',    nombre: 'Berlinas del Fonce',  color: '#003a70', iniciales: 'BF', menor: 'Gaus Junior',    codigo: 'PAA-29062026-25425', estado: 'vencido' },
    { key: 'bolivariano', nombre: 'Expreso Bolivariano', color: '#0a6b3b', iniciales: 'XB', menor: 'Eduard N.',      codigo: 'PNN-2026-78753',     estado: 'activo'  },
  ];
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
  const modalBadge = document.getElementById('modalBadge');
  const modalEstado = document.getElementById('modalEstado');
  const modalDownload = document.getElementById('modalDownload');
  let modalToken = 0;

  async function openModal(key) {
    const e = EMPRESAS.find((x) => x.key === key);
    if (!e) return;
    const token = ++modalToken;

    modalTitle.textContent = e.nombre;
    modalSub.textContent = 'Permiso de viaje · ' + e.codigo;
    modalBadge.textContent = e.iniciales;
    modalBadge.style.background = e.color;
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
