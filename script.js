const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const els = {
  file: document.getElementById("fileInput"),
  emptyFile: document.getElementById("emptyFileInput"),
  wm: document.getElementById("wmInput"),
  empty: document.getElementById("emptyState"),
  status: document.getElementById("statusText"),
  dimensions: document.getElementById("dimensions"),
  width: document.getElementById("widthInput"),
  height: document.getElementById("heightInput"),
  keepRatio: document.getElementById("keepRatio"),
  opacity: document.getElementById("opacity"),
  opacityOut: document.getElementById("opacityOut"),
  wmSize: document.getElementById("wmSize"),
  wmSizeOut: document.getElementById("wmSizeOut"),
  wmPosition: document.getElementById("wmPosition"),
  text: document.getElementById("textInput"),
  textSize: document.getElementById("textSize"),
  textOpacity: document.getElementById("textOpacity"),
  textColor: document.getElementById("textColor"),
  filter: document.getElementById("filterSelect"),
  format: document.getElementById("format"),
  quality: document.getElementById("quality")
};

let baseImage = null;
let watermark = null;
let rotation = 0;
let flipX = 1, flipY = 1;
let texts = [];

function setStatus(message) {
  els.status.textContent = message;
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      baseImage = img;
      rotation = 0; flipX = 1; flipY = 1;
      els.width.value = img.naturalWidth;
      els.height.value = img.naturalHeight;
      els.empty.style.display = "none";
      canvas.style.display = "block";
      setStatus(file.name);
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadWatermark(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => { watermark = img; render(); };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function rotatedDimensions(w, h) {
  return Math.abs(rotation % 180) === 90 ? {w:h,h:w} : {w,h};
}

function render() {
  if (!baseImage) return;

  const sourceW = baseImage.naturalWidth;
  const sourceH = baseImage.naturalHeight;
  const dims = rotatedDimensions(sourceW, sourceH);
  canvas.width = dims.w;
  canvas.height = dims.h;

  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.filter = els.filter.value;

  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(rotation * Math.PI/180);
  ctx.scale(flipX, flipY);
  ctx.drawImage(baseImage, -sourceW/2, -sourceH/2);
  ctx.restore();

  ctx.filter = "none";

  if (watermark) drawWatermark();
  drawTexts();

  els.dimensions.textContent = `${canvas.width} × ${canvas.height}px`;
}

function drawWatermark() {
  const percent = Number(els.wmSize.value)/100;
  const maxWidth = canvas.width * percent;
  const scale = maxWidth / watermark.naturalWidth;
  const w = watermark.naturalWidth * scale;
  const h = watermark.naturalHeight * scale;
  const margin = Math.max(12, canvas.width * .025);
  let x, y;

  switch(els.wmPosition.value){
    case "tl": x=margin; y=margin; break;
    case "tr": x=canvas.width-w-margin; y=margin; break;
    case "bl": x=margin; y=canvas.height-h-margin; break;
    case "c": x=(canvas.width-w)/2; y=(canvas.height-h)/2; break;
    default: x=canvas.width-w-margin; y=canvas.height-h-margin;
  }

  ctx.save();
  ctx.globalAlpha = Number(els.opacity.value)/100;
  ctx.drawImage(watermark,x,y,w,h);
  ctx.restore();
}

function drawTexts() {
  if (!texts.length) return;
  texts.forEach(t=>{
    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.fillStyle = t.color;
    ctx.font = `800 ${t.size}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = Math.max(2,t.size*.08);
    ctx.fillText(t.text, canvas.width/2, canvas.height/2);
    ctx.restore();
  });
}

function updateRatioFromWidth() {
  if (!baseImage || !els.keepRatio.checked) return;
  const ratio = canvas.width / canvas.height;
  els.height.value = Math.max(1, Math.round(Number(els.width.value) / ratio));
}

els.file.addEventListener("change", e => loadImageFile(e.target.files[0]));
els.emptyFile.addEventListener("change", e => loadImageFile(e.target.files[0]));
els.wm.addEventListener("change", e => loadWatermark(e.target.files[0]));

els.width.addEventListener("input", updateRatioFromWidth);

els.opacity.addEventListener("input", ()=>{
  els.opacityOut.textContent = `${els.opacity.value}%`; render();
});
els.wmSize.addEventListener("input", ()=>{
  els.wmSizeOut.textContent = `${els.wmSize.value}%`; render();
});
els.wmPosition.addEventListener("change", render);
els.filter.addEventListener("change", render);
els.textOpacity.addEventListener("input", render);

document.getElementById("rotateLeft").onclick = ()=>{rotation=(rotation+270)%360; render()};
document.getElementById("rotateRight").onclick = ()=>{rotation=(rotation+90)%360; render()};
document.getElementById("flipX").onclick = ()=>{flipX*=-1; render()};
document.getElementById("flipY").onclick = ()=>{flipY*=-1; render()};

document.getElementById("resizeBtn").onclick = ()=>{
  if(!baseImage) return;
  const w = Math.max(1, Number(els.width.value));
  const h = Math.max(1, Number(els.height.value));
  const off = document.createElement("canvas");
  off.width=w; off.height=h;
  const octx=off.getContext("2d");
  octx.drawImage(canvas,0,0,w,h);
  const img=new Image();
  img.onload=()=>{baseImage=img; rotation=0; flipX=1; flipY=1; render()};
  img.src=off.toDataURL("image/png");
};

document.getElementById("addTextBtn").onclick = ()=>{
  const text=els.text.value.trim();
  if(!text) return;
  texts.push({
    text,
    size:Number(els.textSize.value)||48,
    color:els.textColor.value,
    opacity:Number(els.textOpacity.value)/100
  });
  els.text.value="";
  render();
};

document.getElementById("exportBtn").onclick = ()=>{
  if(!baseImage){alert("Сначала загрузите изображение.");return}
  const type=`image/${els.format.value}`;
  const quality=Number(els.quality.value)/100;
  const url=canvas.toDataURL(type,quality);
  const a=document.createElement("a");
  a.href=url;
  a.download=`arg-toolkit.${els.format.value==="jpeg"?"jpg":els.format.value}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

document.getElementById("resetBtn").onclick = ()=>{
  baseImage=null; watermark=null; rotation=0; flipX=1; flipY=1; texts=[];
  ctx.clearRect(0,0,canvas.width,canvas.height);
  canvas.style.display="none"; els.empty.style.display="block";
  els.file.value=""; els.wm.value="";
  setStatus("Изображение не загружено"); els.dimensions.textContent="—";
};

const dropZone=document.getElementById("dropZone");
["dragenter","dragover"].forEach(ev=>dropZone.addEventListener(ev,e=>{
  e.preventDefault(); dropZone.style.borderColor="#e22";
}));
["dragleave","drop"].forEach(ev=>dropZone.addEventListener(ev,e=>{
  e.preventDefault(); dropZone.style.borderColor="";
}));
dropZone.addEventListener("drop",e=>{
  const file=e.dataTransfer.files[0];
  if(file) loadImageFile(file);
});
