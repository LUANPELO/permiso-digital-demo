# Permiso Digital — Landing de demostración

Página estática para mostrar el proyecto **Permiso Digital** (permisos de viaje para
menores de edad, 100 % digitales) con:

- Un **carrusel coverflow** de los 5 formatos oficiales (Copetran, Expreso Brasilia,
  Rápido Ochoa, Berlinas del Fonce, Expreso Bolivariano). Se desliza y, al hacer clic,
  abre el **PDF real** en un visor con todas sus páginas.
- El **tutorial interactivo** (Tango) del flujo de creación de un permiso.

Todo es estático: no necesita servidor ni base de datos. Las librerías (Swiper y PDF.js)
están incluidas localmente en `vendor/`.

## Estructura

```
index.html          Página principal
assets/styles.css   Estilos (identidad navy + amarillo del sistema)
assets/app.js       Carrusel (Swiper) + visor de PDF (PDF.js) + modal
pdfs/               Los 5 PDFs de ejemplo (uno por empresa)
vendor/             Swiper 11 + PDF.js 3.11 (locales)
.nojekyll           Evita el procesado Jekyll de GitHub Pages
```

## Ver en local

```bash
# desde la carpeta que contiene landing/
node serve-landing.js       # abre http://localhost:4173
# o cualquier servidor estático, p. ej.:
npx serve landing
```

> No sirve abrir `index.html` con doble clic (`file://`): el visor de PDF necesita
> cargarse por HTTP. Usa un servidor estático.

## Publicar en GitHub Pages

1. Crear un repositorio (p. ej. `permiso-digital-demo`) y subir el contenido de esta
   carpeta a la raíz.
2. En **Settings → Pages**, elegir la rama `main` y carpeta `/ (root)`.
3. La página queda en `https://<usuario>.github.io/permiso-digital-demo/`.

## Nota de datos

Los PDFs usan **datos de ejemplo ficticios** (nombres y documentos inventados). No
corresponden a personas reales. Antes de publicar, revisa que no haya información
sensible real en los documentos incluidos.
