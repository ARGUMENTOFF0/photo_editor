const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const els = {
  file: document.getElementById('fileInput'), emptyFile: document.getElementById('emptyFileInput'), wm: document.getElementById('wmInput'),
  empty: document.getElementById('emptyState'), status: document.getElementById('statusText'), dimensions: document.getElementById('dimensions'),
  width: document.getElementById('widthInput'), height: document.getElementById('heightInput'), keepRatio: document.getElementById('keepRatio'),
  opacity: document.getElementById('opacity'), opacityOut: document.getElementById('opacityOut'), wmSize: document.getElementById('wmSize'), wmSizeOut: document.getElementById('wmSizeOut'), wmPosition: document.getElementById('wmPosition'),
  text: document.getElementById('textInput'), textSize: document.getElementById('textSize'), textOpacity: document.getElementById('textOpacity'), textColor: document.getElementById('textColor'),
  filter: document.getElementById('filterSelect'), format: document.getElementById('format'), quality: document.getElementById('quality')
};

let state = {
  image: null,
  watermark: null,
  width: 0,
  height: 0,
  rotation: 0,
  flipX: 1,
  flipY: 1,
  watermark: null,
  wmX: 0.88,
  wmY: 0.88,
  texts: [],
  selectedText: null,
  dragging: null,
  dragOffsetX: 0,
  dragOffsetY: 0
};

function setStatus(text) { els.status.textContent = text; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function getPointerPosition(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width / r.width,
    y: (e.clientY - r.top) * canvas.height / r.height
  };
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.width = img.naturalWidth;
      state.height = img.naturalHeight;
      state.rotation = 0;
      state.flipX = 1;
      state.flipY = 1;
      state.texts = [];
      state.selectedText = null;
      state.wmX = 0.88;
      state.wmY = 0.88;
      els.width.value = state.width;
      els.height.value = state.height;
      els.empty.style.display = 'none';
      canvas.style.display = 'block';
      setStatus(file.name);
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadWatermark(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.watermark = img;
      state.wmX = 0.88;
      state.wmY = 0.88;
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawBaseImage() {
  const img = state.image;
  if (!img) return;
  ctx.save();
  ctx.filter = els.filter.value;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(state.rotation * Math.PI / 180);
  ctx.scale(state.flipX, state.flipY);
  const rotated = Math.abs(state.rotation % 180) === 90;
  const drawW = rotated ? canvas.height : canvas.width;
  const drawH = rotated ? canvas.width : canvas.height;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
  ctx.filter = 'none';
}

function watermarkRect() {
  if (!state.watermark) return null;
  const percent = Number(els.wmSize.value) / 100;
  const w = canvas.width * percent;
  const h = state.watermark.naturalHeight * (w / state.watermark.naturalWidth);
  return { x: state.wmX * canvas.width - w / 2, y: state.wmY * canvas.height - h / 2, w, h };
}

function drawWatermark() {
  const r = watermarkRect();
  if (!r) return;
  ctx.save();
  ctx.globalAlpha = Number(els.opacity.value) / 100;
  ctx.drawImage(state.watermark, r.x, r.y, r.w, r.h);
  ctx.restore();
}

function drawTexts() {
  state.texts.forEach((t, i) => {
    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.font = `800 ${t.size}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.color;
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = Math.max(2, t.size * .08);
    ctx.fillText(t.text, t.x * canvas.width, t.y * canvas.height);
    if (i === state.selectedText) {
      const width = ctx.measureText(t.text).width;
      ctx.globalAlpha = .8;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#e22';
      ctx.lineWidth = Math.max(2, t.size * .035);
      ctx.strokeRect(t.x * canvas.width - width / 2 - 8, t.y * canvas.height - t.size / 2 - 8, width + 16, t.size + 16);
    }
    ctx.restore();
  });
}

function render() {
  if (!state.image) return;
  canvas.width = Math.max(1, Math.round(state.width));
  canvas.height = Math.max(1, Math.round(state.height));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBaseImage();
  drawWatermark();
  drawTexts();
  els.dimensions.textContent = `${canvas.width} × ${canvas.height}px`;
}

function syncSizeInputs() {
  els.width.value = Math.round(state.width);
  els.height.value = Math.round(state.height);
}

els.width.addEventListener('input', () => {
  if (!state.image || !els.keepRatio.checked) return;
  const ratio = state.width / state.height;
  els.height.value = Math.max(1, Math.round(Number(els.width.value) / ratio));
});
els.height.addEventListener('input', () => {
  if (!state.image || !els.keepRatio.checked) return;
  const ratio = state.width / state.height;
  els.width.value = Math.max(1, Math.round(Number(els.height.value) * ratio));
});

els.opacity.addEventListener('input', () => { els.opacityOut.textContent = `${els.opacity.value}%`; render(); });
els.wmSize.addEventListener('input', () => { els.wmSizeOut.textContent = `${els.wmSize.value}%`; render(); });
els.wmPosition.addEventListener('change', () => {
  const positions = { tl:[.12,.12], tr:[.88,.12], bl:[.12,.88], br:[.88,.88], c:[.5,.5] };
  [state.wmX, state.wmY] = positions[els.wmPosition.value] || [.88,.88];
  render();
});
els.filter.addEventListener('change', render);
els.textOpacity.addEventListener('input', () => {
  if (state.selectedText !== null) {
    state.texts[state.selectedText].opacity = Number(els.textOpacity.value) / 100;
    render();
  }
});

function rotate(direction) {
  if (!state.image) return;
  state.rotation = (state.rotation + direction + 360) % 360;
  if (Math.abs(state.rotation % 180) === 90) [state.width, state.height] = [state.height, state.width];
  syncSizeInputs();
  render();
}
document.getElementById('rotateLeft').onclick = () => rotate(-90);
document.getElementById('rotateRight').onclick = () => rotate(90);
document.getElementById('flipX').onclick = () => { state.flipX *= -1; render(); };
document.getElementById('flipY').onclick = () => { state.flipY *= -1; render(); };

document.getElementById('resizeBtn').onclick = () => {
  if (!state.image) return;
  const w = Number(els.width.value), h = Number(els.height.value);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return;
  state.width = Math.round(w);
  state.height = Math.round(h);
  render();
};

document.getElementById('addTextBtn').onclick = () => {
  const value = els.text.value.trim();
  if (!value || !state.image) return;
  state.texts.push({ text:value, size:Number(els.textSize.value)||48, color:els.textColor.value, opacity:Number(els.textOpacity.value)/100, x:.5, y:.5 });
  state.selectedText = state.texts.length - 1;
  els.text.value = '';
  render();
};

function hitTestText(p) {
  for (let i = state.texts.length - 1; i >= 0; i--) {
    const t = state.texts[i];
    ctx.save();
    ctx.font = `800 ${t.size}px Arial, sans-serif`;
    const width = ctx.measureText(t.text).width;
    ctx.restore();
    const x = t.x * canvas.width, y = t.y * canvas.height;
    if (p.x >= x - width/2 - 12 && p.x <= x + width/2 + 12 && p.y >= y - t.size/2 - 12 && p.y <= y + t.size/2 + 12) return i;
  }
  return null;
}

function hitTestWatermark(p) {
  const r = watermarkRect();
  if (!r) return false;
  return p.x >= r.x && p.x <= r.x+r.w && p.y >= r.y && p.y <= r.y+r.h;
}

canvas.addEventListener('pointerdown', e => {
  if (!state.image) return;
  canvas.setPointerCapture(e.pointerId);
  const p = getPointerPosition(e);
  const textIndex = hitTestText(p);
  if (textIndex !== null) {
    state.selectedText = textIndex;
    const t = state.texts[textIndex];
    state.dragging = 'text';
    state.dragOffsetX = p.x - t.x * canvas.width;
    state.dragOffsetY = p.y - t.y * canvas.height;
    els.textOpacity.value = Math.round(t.opacity*100);
    render();
    return;
  }
  if (hitTestWatermark(p)) {
    state.dragging = 'watermark';
    state.dragOffsetX = p.x - state.wmX * canvas.width;
    state.dragOffsetY = p.y - state.wmY * canvas.height;
    render();
    return;
  }
  state.selectedText = null;
  state.dragging = null;
  render();
});

canvas.addEventListener('pointermove', e => {
  if (!state.dragging) return;
  const p = getPointerPosition(e);
  if (state.dragging === 'text') {
    const t = state.texts[state.selectedText];
    t.x = clamp((p.x - state.dragOffsetX) / canvas.width, 0, 1);
    t.y = clamp((p.y - state.dragOffsetY) / canvas.height, 0, 1);
  } else if (state.dragging === 'watermark') {
    state.wmX = clamp((p.x - state.dragOffsetX) / canvas.width, 0, 1);
    state.wmY = clamp((p.y - state.dragOffsetY) / canvas.height, 0, 1);
  }
  render();
});
canvas.addEventListener('pointerup', () => state.dragging = null);
canvas.addEventListener('pointercancel', () => state.dragging = null);

els.file.addEventListener('change', e => loadImageFile(e.target.files[0]));
els.emptyFile.addEventListener('change', e => loadImageFile(e.target.files[0]));
els.wm.addEventListener('change', e => loadWatermark(e.target.files[0]));

document.getElementById('exportBtn').onclick = () => {
  if (!state.image) { alert('Сначала загрузите изображение.'); return; }
  render();
  const type = `image/${els.format.value}`;
  const quality = Number(els.quality.value) / 100;
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arg-toolkit.${els.format.value === 'jpeg' ? 'jpg' : els.format.value}`;
    a.click();
    URL.revokeObjectURL(url);
  }, type, quality);
};

document.getElementById('resetBtn').onclick = () => {
  state.image = null; state.watermark = null; state.width = 0; state.height = 0; state.rotation = 0; state.flipX = 1; state.flipY = 1; state.texts = []; state.selectedText = null;
  ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; els.empty.style.display='block';
  els.file.value=''; els.wm.value=''; setStatus('Изображение не загружено'); els.dimensions.textContent='—';
};

const dropZone = document.getElementById('dropZone');
['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.style.borderColor='#e22'; }));
['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.style.borderColor=''; }));
dropZone.addEventListener('drop', e => { const file=e.dataTransfer.files[0]; if(file) loadImageFile(file); });
