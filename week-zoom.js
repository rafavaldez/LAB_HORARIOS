(() => {
  'use strict';

  window.HorariosWeekZoom = function setupWeekZoom({ shell, board, stage, grid, dialog, inline, controls }) {
    const { smaller, larger, fit, expand, close, level, fullCopy } = controls;
    let hours = 0, head;
    let scale = 1, fitted = 1, fitting = true, overviewHour = 75;
    let destroyed = false, sideways = false, nativeFullscreen = false;
    const root = document.documentElement;
    const limit = 2;
    const isFull = () => dialog.open;
    const point = (x, y) => {
      const rect = board.getBoundingClientRect();
      return {
        x: (sideways ? y - rect.top : x - rect.left) - board.clientLeft,
        y: (sideways ? rect.right - x : y - rect.top) - board.clientTop,
      };
    };
    const center = () => ({ x: board.clientWidth / 2, y: board.clientHeight / 2 });
    const origin = () => {
      const rect = stage.getBoundingClientRect();
      const pos = point(sideways ? rect.right : rect.left, rect.top);
      return { x: pos.x + board.scrollLeft, y: pos.y + board.scrollTop };
    };
    function draw() {
      grid.style.setProperty('--timeline-hour-height', fitting ? `${overviewHour}px` : '');
      grid.classList.toggle('is-compact', fitting && overviewHour < 46);
      grid.style.transform = `scale(${scale})`;
      stage.style.width = `${grid.offsetWidth * scale}px`;
      stage.style.height = `${grid.offsetHeight * scale}px`;
      const label = `${Math.round(scale / fitted * 100)} %`;
      if (level.textContent !== label) level.textContent = label;
      smaller.disabled = fitting;
      larger.disabled = scale >= limit;
      fit.setAttribute('aria-pressed', String(fitting));
    }
    function layout() {
      if (!head || !board.isConnected || !board.offsetWidth || !grid.offsetHeight) return;
      sideways = getComputedStyle(shell).transform !== 'none';
      const width = board.offsetWidth - 2;
      const cap = parseFloat(getComputedStyle(board).maxHeight) || Math.min(innerHeight * .5, 650);
      const height = (isFull() ? (hours ? board.offsetHeight : 140) : cap) - 2;
      if (height <= 0 || width <= 0) return;
      const widthScale = Math.min(1, width / grid.offsetWidth);
      const header = head.offsetHeight;
      overviewHour = hours ? Math.min(130, Math.max(22, Math.floor((height / widthScale - header - 1) / hours))) : 75;
      const overviewHeight = header + (hours ? hours * overviewHour : 70);
      fitted = Math.min(widthScale, (height - 1) / overviewHeight);
      if (fitting || scale <= fitted) { fitting = true; scale = fitted; }
      draw();
    }
    function changeZoom(value, from = center(), to = from) {
      const start = origin();
      const x = (board.scrollLeft + from.x - start.x) / scale;
      const y = (board.scrollTop + from.y - start.y) / scale;
      const header = head.offsetHeight;
      const track = grid.offsetHeight - header;
      scale = Math.max(fitted, Math.min(value, limit));
      fitting = scale <= fitted + 0.0001;
      draw();
      const next = origin();
      const anchoredY = y <= header ? y : header + (y - header) * (grid.offsetHeight - header) / track;
      board.scrollTo({ left: next.x + x * scale - to.x, top: next.y + anchoredY * scale - to.y, behavior: 'instant' });
    }
    function reset() {
      fitting = true; layout();
      board.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
    const zoomIn = () => changeZoom(Math.max(scale * 1.4, 0.8));
    const zoomOut = () => changeZoom(scale / 1.4);
    larger.onclick = zoomIn;
    smaller.onclick = zoomOut;
    fit.onclick = reset;
    function releaseFullscreen() {
      if (!nativeFullscreen) return;
      nativeFullscreen = false;
      screen.orientation?.unlock?.();
      if (document.fullscreenElement === root) document.exitFullscreen().catch(() => {});
    }
    function onFullscreenChange() {
      if (nativeFullscreen && document.fullscreenElement !== root && dialog.open) dialog.close();
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    expand.onclick = async () => {
      expand.disabled = true;
      // La pantalla completa nativa se abre antes del diálogo para que este quede encima.
      if (matchMedia('(max-width: 600px), (pointer: coarse) and (max-height: 600px)').matches &&
          root.requestFullscreen && !document.fullscreenElement) {
        try {
          await root.requestFullscreen();
          nativeFullscreen = document.fullscreenElement === root;
        } catch { /* El visor también funciona sin la pantalla completa nativa. */ }
      }
      if (destroyed) {
        releaseFullscreen();
        return;
      }
      dialog.append(shell);
      expand.hidden = true;
      close.hidden = false;
      fullCopy.hidden = false;
      dialog.showModal();
      reset();
      close.focus({ preventScroll: true });
      if (nativeFullscreen && screen.orientation?.lock) {
        try { await screen.orientation.lock('landscape'); }
        catch { /* En vertical, CSS gira el visor sin cambiar la orientación del dispositivo. */ }
      }
    };
    close.onclick = () => dialog.close();
    dialog.addEventListener('close', () => {
      releaseFullscreen();
      if (destroyed) return;
      inline.append(shell);
      expand.hidden = false;
      expand.disabled = false;
      close.hidden = true;
      fullCopy.hidden = true;
      fingers.clear(); dragged = false;
      reset();
      expand.focus({ preventScroll: true });
    });
    board.addEventListener('keydown', event => {
      if (event.target !== board || event.ctrlKey || event.metaKey || event.altKey) return;
      const action = { '+': zoomIn, '=': zoomIn, '-': zoomOut, '0': reset }[event.key];
      if (action) { event.preventDefault(); action(); }
    });

    // El gesto se limita a pantalla completa; en la página se conserva el desplazamiento del navegador.
    const fingers = new Map();
    let dragged = false;
    const pinch = () => {
      const [a, b] = fingers.values();
      return { distance: Math.hypot(b.x - a.x, b.y - a.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };
    board.addEventListener('pointerdown', event => {
      if (!isFull() || event.pointerType !== 'touch' || fingers.size >= 2) return;
      if (!fingers.size) dragged = false;
      fingers.set(event.pointerId, point(event.clientX, event.clientY));
      if (fingers.size === 2) {
        dragged = true;
        for (const id of fingers.keys()) board.setPointerCapture(id);
      }
    });
    board.addEventListener('pointermove', event => {
      const previous = fingers.get(event.pointerId);
      if (!previous) return;
      const next = point(event.clientX, event.clientY);
      if (fingers.size === 2) {
        const before = pinch(); fingers.set(event.pointerId, next); const after = pinch();
        if (before.distance > 0) changeZoom(scale * after.distance / before.distance, before.mid, after.mid);
      } else {
        if (!dragged && Math.hypot(next.x - previous.x, next.y - previous.y) < 7) return;
        dragged = true; board.setPointerCapture(event.pointerId);
        fingers.set(event.pointerId, next);
        board.scrollBy({ left: previous.x - next.x, top: previous.y - next.y, behavior: 'instant' });
      }
    });
    for (const type of ['pointerup', 'pointercancel']) board.addEventListener(type, event => fingers.delete(event.pointerId));
    board.addEventListener('lostpointercapture', event => { if (event.target === board) fingers.delete(event.pointerId); });
    board.addEventListener('click', event => {
      if (isFull() && event.detail && dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
    }, true);
    const observer = new ResizeObserver(layout);
    observer.observe(board);
    return {
      refresh(visibleHours) {
        hours = visibleHours;
        head = grid.querySelector('.week-clock-head');
        reset();
      },
      jump(column) {
        if (fitting) { scale = Math.min(limit, Math.max(1, fitted * 1.4)); fitting = false; draw(); }
        board.scrollTo({ left: origin().x + column.offsetLeft * scale - Math.max(0, (board.clientWidth - column.offsetWidth * scale) / 2), top: 0, behavior: 'instant' });
      },
      destroy() {
        destroyed = true;
        observer.disconnect();
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        if (dialog.open) dialog.close();
        releaseFullscreen();
      },
    };
  };
})();
