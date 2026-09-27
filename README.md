# Cronograma de laboratorios · UTP

Sitio estático compatible con GitHub Pages. **Inicio** reúne los documentos frecuentes para verlos o descargarlos; **Cronograma** lee directamente el Excel mediante JavaScript. No hay Python, base de datos, servidor de aplicación, pasos de conversión ni botón para subir archivos.

## Avisos antes de cada clase

En **Inicio**, elige un ambiente (o todos) y pulsa **Descargar avisos (.ics)**. El navegador genera un archivo de calendario a partir de las clases futuras del Excel publicado. Cada evento tiene dos alarmas `VALARM`: 30 y 15 minutos antes de su hora de inicio en Perú. Al importarlo, el calendario convierte la hora a la zona horaria del dispositivo. No se necesita cuenta, token ni servicio adicional para generar el archivo.

Cada compañero debe **importar el .ics en su app de calendario** y permitir las notificaciones de esa app. La compatibilidad con las alarmas depende del calendario elegido y de su configuración. Google Calendar permite importar el archivo desde su versión web en una computadora; otros calendarios pueden abrirlo o recibirlo desde el teléfono. La web por sí sola no puede entregar avisos cuando está cerrada en GitHub Pages.

Cuando reemplaces el Excel, cada compañero deberá volver a descargar e importar el calendario. Los eventos importados no se actualizan solos. Conviene usar un calendario dedicado a estas clases y quitar la temporada anterior antes de importar una nueva, para evitar duplicados. El archivo incluye solo clases cuyo inicio todavía no ha ocurrido al pulsar el botón; si una comienza en menos de 30 minutos, el primer aviso ya habrá pasado.

## Publicar por primera vez

1. Sube el contenido de esta carpeta a la raíz de tu repositorio. Incluye `data`, `assets`, `vendor` y `.nojekyll`.
2. En **Settings → Pages**, elige **Deploy from a branch**, tu rama (por ejemplo `main`) y **/ (root)**.
3. Guarda y espera a que GitHub termine la publicación. Abre la dirección que muestra Pages.

Todos los recursos usan rutas relativas: funciona tanto en `usuario.github.io/` como en `usuario.github.io/nombre-del-repositorio/`.

## Añadir documentos a Inicio

1. Coloca cada PDF nuevo en `documentos/` con un nombre de archivo estable, preferiblemente sin espacios ni tildes.
2. Añade un objeto en `documents.js` con `title`, `description`, `category`, `detail`, `file` y `downloadName`. Usa como `file` la ruta relativa al PDF dentro de la carpeta; las tarjetas y el contador se generan automáticamente.
3. Publica ambos archivos en el repositorio y espera el despliegue de GitHub Pages. La pestaña Inicio mostrará el nuevo documento con botones **Ver PDF** y **Descargar**.

El primer documento es `documentos/registro-asistencia-induccion-seguridad-laboratorios-utp.pdf`, el registro de asistencia a la inducción de seguridad. El navegador sirve el PDF directamente desde GitHub Pages, sin conversión. Como se publica para descarga, cualquier persona con acceso al sitio podrá obtenerlo.

## Actualizar o cambiar de temporada

1. Descarga el Excel nuevo.
2. Reemplaza en el repositorio el archivo `data/actual/GUIAS X SEMANA Y HORARIOS.xlsx`, conservando exactamente su nombre y ubicación.
3. Confirma el cambio (commit) y espera a que termine la publicación de GitHub Pages.
4. Abre el visor o pulsa **Actualizar horarios**. El navegador vuelve a descargar el Excel y extrae sus semanas, fechas, ambientes y clases. No tienes que modificar código ni ejecutar un script.

El archivo nuevo debe conservar la estructura de la plantilla: hojas `W01`, `W02`, etc.; filas `SEMANA 01`, `SEMANA 02`, etc. con fechas de Excel; cabecera `HORA`, días y ambientes; clases con rangos como `08:00 - 09:30`. El año y las fechas se leen del documento. Reemplazar el Excel sustituye el período disponible; no acumula archivos de temporadas anteriores.

La consulta evita la caché del navegador. La nueva versión debe haber terminado de publicarse en GitHub antes de verse; un commit todavía en despliegue no actualiza inmediatamente el sitio.

## Archivos del sitio

- `index.html`, `styles.css`, `styles-extra.css`, `app.js`: interfaz, vista de lista y vista en paralelo.
- `documents.js` y `site.js`: catálogo de documentos y navegación entre Inicio y Cronograma.
- `documentos/`: archivos descargables que deben publicarse junto al sitio.
- `excel.js`: interpretación de las hojas semanales.
- `message.js`: texto para copiar con la hora peruana calculada desde el reloj del dispositivo.
- `timeline.js`: distribución horaria de las clases simultáneas.
- `calendar.js`: generación local del archivo .ics con los avisos de 30 y 15 minutos.
- `data/actual/GUIAS X SEMANA Y HORARIOS.xlsx`: fuente vigente que debes reemplazar. El archivo con el mismo nombre directamente en `data/` es una copia anterior que el visor ya no consulta; estaba abierto y bloqueado al actualizar este proyecto.
- `vendor/`: lector SheetJS 0.20.3 y su licencia. Se sirve desde el mismo sitio; no depende de un CDN durante la consulta.
- `assets/`: iconos e imagen del campus.
- `.nojekyll`: publicación de archivos estáticos sin procesamiento Jekyll.
- `tools/verificar.cjs`: comprobación opcional de desarrollo (`node tools/verificar.cjs`); no se ejecuta en Pages.
- `tools/preview.cjs`: servidor de vista previa local opcional, sin dependencias.

## Detalles de la plantilla actual

Falta W04. En el Excel nuevo, W16 ya tiene la fecha correcta (23–29 de noviembre de 2026) y W17 comienza el 30 de noviembre. El visor detecta fechas repetidas entre semanas y muestra un error claro si aparecen en una futura copia.

Como el navegador descarga el Excel, **el archivo completo publicado será accesible**, incluso las hojas que no se muestran en el visor. La copia actual contiene correos institucionales en la hoja `Docentes`; puedes quitar esa hoja de la copia que publiques sin afectar el cronograma.

## Vista previa local

Abrir `index.html` con doble clic no permite descargar el Excel por las restricciones `file://` del navegador. Usa un servidor estático de tu editor o, si tienes Node.js, ejecuta `node tools/preview.cjs` y abre `http://127.0.0.1:8765/LAB_HORARIOS/`. Esto es solo para la vista previa local; GitHub Pages ya sirve los archivos por HTTPS.

## Créditos y documentación

- Imagen del campus Tacna: [sitio oficial de UTP](https://www.utp.edu.pe/descubre-utp/).
- SheetJS: [distribución oficial para navegador](https://docs.sheetjs.com/docs/getting-started/installation/standalone/), licencia Apache 2.0 en `vendor/LICENSE-SheetJS.txt`.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) publica sitios estáticos de HTML, CSS y JavaScript.
