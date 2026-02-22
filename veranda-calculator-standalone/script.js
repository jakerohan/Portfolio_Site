/* -------------------- Inline SVG fallback art -------------------- */
const FLAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Flat roof veranda">
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="100" y="130" width="1000" height="640" fill="#fff"/>
<line x1="120" y1="220" x2="1080" y2="220" stroke="#222" stroke-width="6"/>
<g stroke="#89a54f" stroke-width="10">
<line x1="250" y1="740" x2="250" y2="380"/>
<line x1="600" y1="740" x2="600" y2="380"/>
<line x1="950" y1="740" x2="950" y2="380"/>
</g>
<g stroke="#b55343" stroke-width="10">
<line x1="200" y1="360" x2="1000" y2="360"/>
<line x1="200" y1="740" x2="1000" y2="740"/>
</g>
<g stroke="#7fbf5c" stroke-width="6">
<line x1="220" y1="360" x2="220" y2="740"/>
<line x1="280" y1="360" x2="280" y2="740"/>
<line x1="340" y1="360" x2="340" y2="740"/>
<line x1="400" y1="360" x2="400" y2="740"/>
<line x1="460" y1="360" x2="460" y2="740"/>
<line x1="520" y1="360" x2="520" y2="740"/>
<line x1="560" y1="360" x2="560" y2="740"/>
<line x1="640" y1="360" x2="640" y2="740"/>
<line x1="700" y1="360" x2="700" y2="740"/>
<line x1="760" y1="360" x2="760" y2="740"/>
<line x1="820" y1="360" x2="820" y2="740"/>
<line x1="880" y1="360" x2="880" y2="740"/>
<line x1="940" y1="360" x2="940" y2="740"/>
</g>
<text x="600" y="120" text-anchor="middle" font-family="Arial" font-size="28" fill="#2ea3f2">Flat roof veranda (illustration)</text>
</svg>`;

const GABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Gable roof veranda">
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="100" y="130" width="1000" height="640" fill="#fff"/>
<line x1="120" y1="220" x2="1080" y2="220" stroke="#222" stroke-width="6"/>
<polygon points="200,380 600,240 1000,380 1000,740 200,740" fill="#fff" stroke="#8cbe3e" stroke-width="6"/>
<line x1="600" y1="240" x2="600" y2="740" stroke="#8cbe3e" stroke-width="4" stroke-dasharray="8 10"/>
<g stroke="#7fbf5c" stroke-width="6" opacity="0.85">
<line x1="240" y1="380" x2="600" y2="280"/>
<line x1="300" y1="380" x2="600" y2="300"/>
<line x1="360" y1="380" x2="600" y2="320"/>
<line x1="420" y1="380" x2="600" y2="340"/>
<line x1="780" y1="380" x2="600" y2="340"/>
<line x1="840" y1="380" x2="600" y2="320"/>
<line x1="900" y1="380" x2="600" y2="300"/>
<line x1="960" y1="380" x2="600" y2="280"/>
</g>
<g stroke="#89a54f" stroke-width="10">
<line x1="280" y1="740" x2="280" y2="380"/>
<line x1="920" y1="740" x2="920" y2="380"/>
<line x1="600" y1="740" x2="600" y2="380"/>
</g>
<text x="600" y="120" text-anchor="middle" font-family="Arial" font-size="28" fill="#8cbe3e">Gable roof veranda (illustration)</text>
</svg>`;

/* -------------------- Pricing -------------------- */
function getCityFromPostcode(postcode){
const first=(postcode||"").trim().charAt(0);
switch(first){
case "5": return "Adelaide metro";
case "3": return "Melbourne metro";
case "2": return "Sydney metro";
case "4": return "Brisbane metro";
default: return null;
}
}

const priceTable = {
"Adelaide metro": {
timber: { flat: { min: 400, max: 660 }, gable: { min: 450, max: 780 } },
steel: { flat: { min: 380, max: 660 }, gable: { min: 550, max: 940 } }
},
"Melbourne metro": {
timber: { flat: { min: 410, max: 720 }, gable: { min: 450, max: 830 } },
steel: { flat: { min: 420, max: 700 }, gable: { min: 610, max: 1050 } }
},
"Sydney metro": {
timber: { flat: { min: 520, max: 830 }, gable: { min: 530, max: 1120 } },
steel: { flat: { min: 550, max: 760 }, gable: { min: 630, max: 1150 } }
},
"Brisbane metro": {
timber: { flat: { min: 450, max: 800 }, gable: { min: 480, max: 1100 } },
steel: { flat: { min: 470, max: 740 }, gable: { min: 620, max: 1100 } }
}
};

function formatMoney(value){
return value.toLocaleString("en-AU",{maximumFractionDigits:0});
}

/* -------------------- Plan drawing (hard-clamped to viewport) -------------------- */
function getSafeWidth(){
// Measure wrapper → container → viewport; clamp to viewport so it can't explode
const wrapper = document.querySelector('.vp-plan-wrapper');
const container = document.querySelector('.vp-container');

let w = Math.round(wrapper?.getBoundingClientRect?.().width || 0);
if(!w) w = Math.round(container?.getBoundingClientRect?.().width || 0);

const vw = Math.max(280, Math.round((window.innerWidth || document.documentElement.clientWidth || 360) * 0.96)); // ≤ 96vw
if(!w) w = vw;
w = Math.min(w, vw, 760); // never exceed viewport; cap tablet upper bound
w = Math.max(w, 240); // keep sensible minimum
return w;
}

function drawPlan(houseWidthM, vWidthM, vDepthM){
const canvas = document.getElementById('planCanvas');
const ctx = canvas.getContext('2d');

const cssWidth = getSafeWidth();
const aspect = 420/260; // design aspect
const cssHeight = Math.round(cssWidth / aspect); // maintain proportions

const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
canvas.style.width = cssWidth + "px";
canvas.style.height = cssHeight + "px";

ctx.setTransform(dpr,0,0,dpr,0,0);
ctx.clearRect(0,0,cssWidth,cssHeight);

const marginSide=22, marginTop=26, marginBottom=26;
const availW = cssWidth - marginSide*2;
const availH = cssHeight - marginTop - marginBottom;

const scaleX = availW / houseWidthM;
const maxProjectionM = Math.max(vDepthM||0, 9);
const scaleY = availH / maxProjectionM;

const houseW = houseWidthM * scaleX;
const houseY = marginTop;
const houseX = (cssWidth - houseW) / 2;

// House baseline
ctx.strokeStyle="#000"; ctx.lineWidth=1.4;
ctx.beginPath(); ctx.moveTo(houseX,houseY); ctx.lineTo(houseX+houseW,houseY); ctx.stroke();

// House uprights
ctx.beginPath();
ctx.moveTo(houseX,houseY); ctx.lineTo(houseX,houseY-14);
ctx.moveTo(houseX+houseW,houseY); ctx.lineTo(houseX+houseW,houseY-14);
ctx.stroke();

// House label
ctx.font="bold 11px Arial"; ctx.fillStyle="#000"; ctx.textAlign="center";
ctx.fillText("HOUSE", houseX+houseW/2, houseY-16);

// Veranda rectangle
const vW = (vWidthM||0)*scaleX;
const vD = (vDepthM||0)*scaleY;
const vX = houseX + (houseW - vW)/2;
const vY = houseY;

ctx.strokeStyle= "#8cbe3e"; ctx.lineWidth=1.3;
if(vW>0 && vD>0){
ctx.strokeRect(vX, vY, vW, vD);
ctx.font="11px Arial"; ctx.fillStyle="#8cbe3e"; ctx.textAlign="center";
ctx.fillText("Proposed Veranda / Patio", vX+vW/2, vY+vD/2+4);
}

// House width dimension
const dimY = houseY - 3;
const arrow = 6;
ctx.strokeStyle="#000"; ctx.lineWidth=1;
ctx.beginPath();
ctx.moveTo(houseX,dimY); ctx.lineTo(houseX+arrow,dimY-3);
ctx.moveTo(houseX,dimY); ctx.lineTo(houseX+arrow,dimY+3);
ctx.moveTo(houseX+houseW,dimY); ctx.lineTo(houseX+houseW-arrow,dimY-3);
ctx.moveTo(houseX+houseW,dimY); ctx.lineTo(houseX+houseW-arrow,dimY+3);
ctx.moveTo(houseX,dimY); ctx.lineTo(houseX+houseW,dimY);
ctx.stroke();

ctx.font="11px Arial"; ctx.fillStyle="#000"; ctx.textAlign="center";
ctx.fillText(houseWidthM + " m", houseX+houseW/2, dimY-2);

// Veranda dimensions
if(vW>0 && vD>0){
ctx.fillStyle="#8cbe3e"; ctx.textAlign="center";
ctx.fillText(vWidthM + " m", vX+vW/2, vY+vD+12);
ctx.textAlign="left";
ctx.fillText(vDepthM + " m", vX+vW+8, vY+vD*0.5+4);
}
}

/* -------------------- Resize handling -------------------- */
let lastWidth = 0;
function watchResize(){
const redraw = () => {
const w = getSafeWidth();
if(w !== lastWidth){
lastWidth = w;
const vWidthM = parseFloat(document.getElementById('vWidth').value) || 0;
const vDepthM = parseFloat(document.getElementById('vDepth').value) || 0;
drawPlan(12, vWidthM, vDepthM);
}
};
const wrapper = document.querySelector('.vp-plan-wrapper');
if (typeof ResizeObserver === "function") {
const ro = new ResizeObserver(redraw);
ro.observe(wrapper);
} else {
window.addEventListener('resize', redraw, {passive:true});
}
window.addEventListener('orientationchange', () => setTimeout(redraw, 120), {passive:true});
document.addEventListener('visibilitychange', () => { if(!document.hidden) redraw(); });
}

/* -------------------- Illustration switching (JPG → inline SVG fallback) -------------------- */
function plugImgFallback(img, svgContainer, inlineSVG){
const toSVG = () => {
svgContainer.hidden = false;
svgContainer.innerHTML = inlineSVG;
img.parentElement.hidden = true;
};

// If cached but broken:
if (img.complete && img.naturalWidth === 0) toSVG();

img.addEventListener('error', toSVG, {once:true});
}

function updateRoofIllustration(style){
const flatWrap = document.getElementById('flatWrap');
const gableWrap = document.getElementById('gableWrap');
const flatSVG = document.getElementById('flatSVG');
const gableSVG = document.getElementById('gableSVG');
const flatImg = document.getElementById('flatImg');
const gableImg = document.getElementById('gableImg');
const caption = document.getElementById('roofCaption');

// Wire fallbacks once
if (!flatImg.dataset.wired) {
plugImgFallback(flatImg, flatSVG, FLAT_SVG);
flatImg.dataset.wired = "1";
}
if (!gableImg.dataset.wired) {
plugImgFallback(gableImg, gableSVG, GABLE_SVG);
gableImg.dataset.wired = "1";
}

if(style === "gable"){
flatWrap.hidden = true;
flatSVG.hidden = true;
gableWrap.hidden = false;
caption.textContent = "Indicative illustration of a gable veranda roof. Final design and detailing will be confirmed with your site‑specific plans.";
}else{
gableWrap.hidden = true;
gableSVG.hidden = true;
flatWrap.hidden = false;
caption.textContent = "Indicative illustration of a flat veranda roof. Final design and detailing will be confirmed with your site‑specific plans.";
}
}

/* -------------------- Calculator -------------------- */
function updateCalculator(){
const houseWidthM = 12;

const postcode = (document.getElementById('postcode').value || "").trim();
const city = getCityFromPostcode(postcode) || "Unknown area";

const vWidthM = Math.max(0, parseFloat(document.getElementById('vWidth').value));
const vDepthM = Math.max(0, parseFloat(document.getElementById('vDepth').value));
const frameType = document.getElementById('frameType').value; // 'timber' | 'steel'
const roofStyle = document.getElementById('roofStyle').value; // 'flat' | 'gable'

const area = (isFinite(vWidthM)?vWidthM:0) * (isFinite(vDepthM)?vDepthM:0);

const err = document.getElementById('postcodeError');
if(!getCityFromPostcode(postcode) && postcode.length===4){
err.classList.add('is-visible');
} else {
err.classList.remove('is-visible');
}

let rate = null;
if(priceTable[city] && priceTable[city][frameType]){
rate = priceTable[city][frameType][roofStyle];
}

if(!rate || area===0){
document.getElementById('estimateValue').innerHTML = "Please enter a postcode above to view your estimate";
document.getElementById('estimateSub').textContent =
"Please enter your postcode above for a price estimate";
} else {
const min = area * rate.min;
const max = area * rate.max;
document.getElementById('estimateValue').innerHTML =
`$<span id="minPrice">${formatMoney(min)}</span> – $<span id="maxPrice">${formatMoney(max)}</span>`;
document.getElementById('estimateSub').textContent =
`For a high quality attached veranda / patio roof installed in ${city}.`;
}

document.getElementById('metaRoof').textContent =
roofStyle==="flat" ? "Flat roof" : "Gable roof";
document.getElementById('metaFrame').textContent =
frameType==="steel" ? "Colorbond steel" : "Timber";
document.getElementById('metaLocation').textContent = city;

// Draw plan with clamped width
drawPlan(houseWidthM, isFinite(vWidthM)?vWidthM:0, isFinite(vDepthM)?vDepthM:0);

// Illustration
updateRoofIllustration(roofStyle);
}

/* -------------------- Wiring -------------------- */
function wireAutoUpdate(){
['postcode','vWidth','vDepth','frameType','roofStyle'].forEach(id=>{
const el=document.getElementById(id);
if(!el) return;
['input','change','blur','keyup'].forEach(evt=>{
el.addEventListener(evt, updateCalculator);
});
});
const form = document.querySelector('.vp-form');
form.addEventListener('input', updateCalculator);
form.addEventListener('change', updateCalculator);
}

// Init + small retry to catch late layout on some Android/iOS viewers
document.addEventListener('DOMContentLoaded', () => {
wireAutoUpdate();
watchResize();

updateCalculator(); // first pass

let tries = 0;
const t = setInterval(() => {
tries++;
updateCalculator();
if (tries >= 6) clearInterval(t); // ~900ms total
}, 150);

window.addEventListener('load', () => {
updateCalculator();
requestAnimationFrame(()=>requestAnimationFrame(updateCalculator));
}, {once:true, passive:true});

window.addEventListener('pageshow', updateCalculator, {passive:true});
});
