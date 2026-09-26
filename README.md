# Cronograma de laboratorios · UTP

Sitio estático compatible con GitHub Pages. El navegador descarga y lee directamente el Excel mediante JavaScript. No hay Python, base de datos, servidor de aplicación, pasos de conversión ni botón para subir archivos.

## Publicar por primera vez

1. Sube el contenido de esta carpeta a la raíz de tu repositorio. Incluye `data`, `assets`, `vendor` y `.nojekyll`.
2. En **Settings → Pages**, elige **Deploy from a branch**, tu rama (por ejemplo `main`) y **/ (root)**.
3. Guarda y espera a que GitHub termine la publicación. Abre la dirección que muestra Pages.

Todos los recursos usan rutas relativas: funciona tanto en `usuario.github.io/` como en `usuario.github.io/nombre-del-repositorio/`.

## Actualizar o cambiar de temporada

1. Descarga el Excel nuevo.
2. Reemplaza en el repositorio el archivo `data/GUIAS X SEMANA Y HORARIOS.xlsx`, conservando exactamente su nombre y ubicación.
3. Confirma el cambio (commit) y espera a que termine la publicación de GitHub Pages.
4. Abre el visor o pulsa **Actualizar horarios**. El navegador vuelve a descargar el Excel y extrae sus semanas, fechas, ambientes y clases. No tienes que modificar código ni ejecutar un script.

El archivo nuevo debe conservar la estructura de la plantilla: hojas `W01`, `W02`, etc.; filas `SEMANA 01`, `SEMANA 02`, etc. con fechas de Excel; cabecera `HORA`, días y ambientes; clases con rangos como `08:00 - 09:30`. El año y las fechas se leen del documento. Reemplazar el Excel sustituye el período disponible; no acumula archivos de temporadas anteriores.

La consulta evita la caché del navegador. La nueva versión debe haber terminado de publicarse en GitHub antes de verse; un commit todavía en despliegue no actualiza inmediatamente el sitio.

## Archivos del sitio

- `index.html`, `styles.css`, `app.js`: interfaz y navegación.
- `excel.js`: interpretación de las hojas semanales.
- `data/GUIAS X SEMANA Y HORARIOS.xlsx`: fuente que debes reemplazar.
- `vendor/`: lector SheetJS 0.20.3 y su licencia. Se sirve desde el mismo sitio; no depende de un CDN durante la consulta.
- `assets/`: iconos e imagen del campus.
- `.nojekyll`: publicación de archivos estáticos sin procesamiento Jekyll.
- `tools/verificar.cjs`: comprobación opcional de desarrollo (`node tools/verificar.cjs`); no se ejecuta en Pages.
- `tools/preview.cjs`: servidor de vista previa local opcional, sin dependencias.

## Detalles de la plantilla actual

Falta W04. W16 no tiene su fila SEMANA 16; su fecha se calcula cuando las otras semanas definen un inicio de ciclo coherente. El visor señala esa condición. Si el calendario es ambiguo, la semana sin fecha no se presenta como confirmada.

Como el navegador descarga el Excel, **el archivo completo publicado será accesible**, incluso las hojas que no se muestran en el visor. La copia actual contiene correos institucionales en la hoja `Docentes`; puedes quitar esa hoja de la copia que publiques sin afectar el cronograma.

## Vista previa local

Abrir `index.html` con doble clic no permite descargar el Excel por las restricciones `file://` del navegador. Usa un servidor estático de tu editor o, si tienes Node.js, ejecuta `node tools/preview.cjs` y abre `http://127.0.0.1:8765/LAB_HORARIOS/`. Esto es solo para la vista previa local; GitHub Pages ya sirve los archivos por HTTPS.

## Créditos y documentación

- Imagen del campus Tacna: [sitio oficial de UTP](https://www.utp.edu.pe/descubre-utp/).
- SheetJS: [distribución oficial para navegador](https://docs.sheetjs.com/docs/getting-started/installation/standalone/), licencia Apache 2.0 en `vendor/LICENSE-SheetJS.txt`.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) publica sitios estáticos de HTML, CSS y JavaScript.
