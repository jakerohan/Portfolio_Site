
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

/* -------------------- Safe canvas width -------------------- */
function getSafeWidth(){
const wrapper = document.querySelector('.vp-plan-wrapper');
const container = document.querySelector('.vp-container');

let w = Math.round(wrapper?.getBoundingClientRect?.().width || 0);
if(!w) w = Math.round(container?.getBoundingClientRect?.().width || 0);

const vw = Math.max(280, Math.round((window.innerWidth || document.documentElement.clientWidth || 360) * 0.96));
if(!w) w = vw;
w = Math.min(w, vw, 900); // cap at container max-width
w = Math.max(w, 240);
return w;
}

/* ==================== Isometric 3D drawing ==================== */

const POST_HEIGHT = 2.5; // metres — fixed until we add customer input
const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

/*
 * Returns evenly-spaced positions along a span such that no gap exceeds 6m.
 * Always includes 0 and spanM. Interior posts added when spanM > 6m.
 */
function getPostPositions(spanM) {
    const numInterior = Math.max(0, Math.ceil(spanM / 6) - 1);
    const positions = [0];
    for (let i = 1; i <= numInterior; i++) {
        positions.push(i * spanM / (numInterior + 1));
    }
    positions.push(spanM);
    return positions;
}

/*
 * Compute canvas origin and uniform scale so the isometric drawing fits
 * within the canvas with equal margins on all sides.
 *
 * Coordinate system:
 *   x  = width direction  (0 = left,  widthM = right)
 *   z  = depth direction  (0 = front/fascia,  depthM = back/house)
 *   y  = height           (0 = ground, postH = eave level)
 *
 * Projection (viewer at front-left — house wall recedes to upper-right):
 *   screenX = ox + (x + z) * COS30 * scale
 *   screenY = oy + (x - z) * SIN30 * scale - y * scale
 */
function computeDrawOrigin(widthM, depthM, postH, ridgeH, canvasW, canvasH) {
    const margin = 32;
    const availW = canvasW - margin * 2;
    const availH = canvasH - margin * 2;

    // Bounding box at scale=1, with (x=0,z=0,y=0) as the raw origin:
    //   min screenX: front-left corner (x=0, z=0) → 0
    //   max screenX: back-right corner (x=widthM, z=depthM) → (widthM+depthM)*COS30
    //   min screenY: back-left eave (x=0, z=depthM, y=postH+ridgeH) → -depthM*SIN30-(postH+ridgeH)
    //   max screenY: front-right ground (x=widthM, z=0, y=0) → widthM*SIN30
    const totalWidthUnscaled  = (widthM + depthM) * COS30;
    const minSYUnscaled       = -(depthM * SIN30 + postH + ridgeH); // conservative; covers gable peak
    const maxSYUnscaled       = widthM * SIN30;
    const totalHeightUnscaled = maxSYUnscaled - minSYUnscaled;

    const scale = Math.min(availW / totalWidthUnscaled, availH / totalHeightUnscaled);

    // Centre the drawing. The raw origin (0,0,0) has sx=0, sy=0.
    const drawingW = totalWidthUnscaled * scale;
    const drawingH = totalHeightUnscaled * scale;
    const ox = (canvasW - drawingW) / 2;
    const oy = (canvasH - drawingH) / 2 + (-minSYUnscaled) * scale;

    return { ox, oy, scale };
}

/*
 * Main drawing entry point. Called from updateCalculator() on every input change.
 */
function drawIsometric(widthM, depthM, attachSide, roofStyle) {
    const canvas = document.getElementById('planCanvas');
    const ctx    = canvas.getContext('2d');

    // Read the canvas's actual CSS-rendered width (CSS sets width:100%).
    // Fall back to getSafeWidth() only if layout hasn't resolved yet.
    const cssWidth  = Math.round(canvas.getBoundingClientRect().width) || getSafeWidth();
    const cssHeight = Math.round(cssWidth * 0.78);

    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    canvas.width        = Math.round(cssWidth  * dpr);
    canvas.height       = Math.round(cssHeight * dpr);
    // Do not set style.width — CSS width:100% keeps it aligned with the form above.
    canvas.style.height = cssHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!widthM || !depthM || widthM <= 0 || depthM <= 0) return;

    const postH = POST_HEIGHT;

    // Gable ridge follows the longest dimension.
    // ridgeAlongX=true  → ridge runs left-right (x-axis), pitched across depthM
    // ridgeAlongX=false → ridge runs front-back (z-axis), pitched across widthM
    const ridgeAlongX   = (widthM >= depthM);
    const pitchedSpan   = ridgeAlongX ? depthM : widthM;
    const ridgeH        = (roofStyle === 'gable')
                          ? Math.max(0.5, Math.min(1.8, pitchedSpan / 5))
                          : 0;

    const { ox, oy, scale } = computeDrawOrigin(widthM, depthM, postH, ridgeH, cssWidth, cssHeight);

    /* Projection closure — viewer at front-left, house wall recedes to upper-right */
    const proj = (x, z, y) => ({
        x: ox + (x + z) * COS30 * scale,
        y: oy + (x - z) * SIN30 * scale - y * scale,
    });

    /* Line-drawing closure (uses current ctx stroke settings) */
    const line = (x1, z1, y1, x2, z2, y2) => {
        const p1 = proj(x1, z1, y1);
        const p2 = proj(x2, z2, y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    };

    /* Post positions along width (all rows) and depth (side columns) */
    const xPosts    = getPostPositions(widthM);
    const zPosts    = getPostPositions(depthM);
    const zInterior = zPosts.filter(z => z > 0 && z < depthM); // interior side-column posts

    /* Scaled line weights */
    const lw = {
        slab:   1.5,
        post:   Math.max(2,   scale * 0.15),
        beam:   Math.max(1.5, scale * 0.12),
        rafter: Math.max(1.2, scale * 0.09),
        purlin: Math.max(1.0, scale * 0.07),
        wall:   1.5,
        hatch:  0.8,
    };

    /* ------------------------------------------------------------------ */
    /* 1. GROUND SLAB OUTLINE                                              */
    /* ------------------------------------------------------------------ */
    const sm = 0.35; // slab overhang beyond structure (metres)
    const slabCorners = [
        proj(-sm,          -sm,          0),
        proj(widthM + sm,  -sm,          0),
        proj(widthM + sm,  depthM + sm,  0),
        proj(-sm,          depthM + sm,  0),
    ];
    ctx.strokeStyle = '#c8a05a';
    ctx.lineWidth   = lw.slab;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(slabCorners[0].x, slabCorners[0].y);
    slabCorners.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    /* ------------------------------------------------------------------ */
    /* 2. HOUSE WALL (drawn before posts so posts overlay the edge)        */
    /* ------------------------------------------------------------------ */
    if (attachSide !== 'none') {
        // Four corners of the wall face in world coordinates
        let wallCorners;
        if (attachSide === 'back') {
            wallCorners = [
                proj(0,        depthM, 0),
                proj(widthM,   depthM, 0),
                proj(widthM,   depthM, postH),
                proj(0,        depthM, postH),
            ];
        } else if (attachSide === 'left') {
            wallCorners = [
                proj(0, depthM, 0),
                proj(0, 0,      0),
                proj(0, 0,      postH),
                proj(0, depthM, postH),
            ];
        } else { // right
            wallCorners = [
                proj(widthM, 0,      0),
                proj(widthM, depthM, 0),
                proj(widthM, depthM, postH),
                proj(widthM, 0,      postH),
            ];
        }

        const wallPath = () => {
            ctx.beginPath();
            ctx.moveTo(wallCorners[0].x, wallCorners[0].y);
            wallCorners.forEach(c => ctx.lineTo(c.x, c.y));
            ctx.closePath();
        };

        // Fill
        ctx.fillStyle = '#dde0dd';
        wallPath();
        ctx.fill();

        // Diagonal hatch (clip to wall shape, draw parallel lines across bounding box)
        ctx.save();
        wallPath();
        ctx.clip();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth   = lw.hatch;
        const xs = wallCorners.map(c => c.x);
        const ys = wallCorners.map(c => c.y);
        const bx0 = Math.min(...xs) - 10;
        const bx1 = Math.max(...xs) + 10;
        const by0 = Math.min(...ys) - 10;
        const by1 = Math.max(...ys) + 10;
        const hatchSpacing = Math.max(7, scale * 0.35);
        const diagH = by1 - by0;
        for (let d = bx0 - diagH; d < bx1 + diagH; d += hatchSpacing) {
            ctx.beginPath();
            ctx.moveTo(d,          by0);
            ctx.lineTo(d + diagH,  by1);
            ctx.stroke();
        }
        ctx.restore();

        // Wall outline
        ctx.strokeStyle = '#555';
        ctx.lineWidth   = lw.wall;
        wallPath();
        ctx.stroke();
    }

    /* ------------------------------------------------------------------ */
    /* 3. BACK ROW POSTS + BEAM  (far side — drawn before roof)           */
    /* ------------------------------------------------------------------ */
    if (attachSide !== 'back') {
        ctx.strokeStyle = '#89a54f';
        ctx.lineWidth   = lw.post;
        for (const xp of xPosts) {
            if (attachSide === 'left'  && xp === 0)      continue;
            if (attachSide === 'right' && xp === widthM) continue;
            line(xp, depthM, 0, xp, depthM, postH);
        }
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(0, depthM, postH, widthM, depthM, postH);
    } else {
        // Attached at back: ledger plate along top of wall
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(0, depthM, postH, widthM, depthM, postH);
    }

    /* ------------------------------------------------------------------ */
    /* 4. RIGHT SIDE BEAM + INTERMEDIATE SIDE POSTS (x=widthM — far side) */
    /* ------------------------------------------------------------------ */
    if (attachSide !== 'right') {
        // Intermediate posts along the right side for deep structures (depthM > 6m)
        ctx.strokeStyle = '#89a54f';
        ctx.lineWidth   = lw.post;
        for (const zp of zInterior) {
            line(widthM, zp, 0, widthM, zp, postH);
        }
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(widthM, 0, postH, widthM, depthM, postH);
    }

    /* ------------------------------------------------------------------ */
    /* 5. ROOF MEMBERS                                                     */
    /* ------------------------------------------------------------------ */
    if (roofStyle === 'flat') {
        drawFlatRoof(ctx, proj, line, lw, widthM, depthM, postH, xPosts);
    } else {
        drawGableRoof(ctx, proj, line, lw, widthM, depthM, postH, ridgeH, ridgeAlongX, xPosts);
    }

    /* ------------------------------------------------------------------ */
    /* 6. LEFT SIDE BEAM + INTERMEDIATE SIDE POSTS (x=0 — near side)      */
    /* ------------------------------------------------------------------ */
    if (attachSide !== 'left') {
        // Intermediate posts along the left side for deep structures (depthM > 6m)
        ctx.strokeStyle = '#89a54f';
        ctx.lineWidth   = lw.post;
        for (const zp of zInterior) {
            line(0, zp, 0, 0, zp, postH);
        }
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(0, 0, postH, 0, depthM, postH);
    }

    /* ------------------------------------------------------------------ */
    /* 7. FRONT POSTS  (near side — drawn after roof and side beams)       */
    /* ------------------------------------------------------------------ */
    ctx.strokeStyle = '#89a54f';
    ctx.lineWidth   = lw.post;
    for (const xp of xPosts) {
        if (attachSide === 'left'  && xp === 0)      continue;
        if (attachSide === 'right' && xp === widthM) continue;
        line(xp, 0, 0, xp, 0, postH);
    }

    /* ------------------------------------------------------------------ */
    /* 8. FRONT FASCIA BEAM                                                */
    /* ------------------------------------------------------------------ */
    ctx.strokeStyle = '#b55343';
    ctx.lineWidth   = lw.beam;
    line(0, 0, postH, widthM, 0, postH);

    /* ------------------------------------------------------------------ */
    /* 9. DIMENSION LABELS                                                 */
    /* ------------------------------------------------------------------ */
    drawIsoDimensions(ctx, proj, widthM, depthM, postH);
}

/* ---------------------------------------------------------------------- */
/* Flat roof: purlins (x-direction) + rafters (z-direction at each post)  */
/* ---------------------------------------------------------------------- */
function drawFlatRoof(ctx, proj, line, lw, widthM, depthM, postH, xPosts) {
    // Purlins run in x-direction at evenly spaced z positions.
    // Draw back-to-front so closer purlins paint over further ones.
    ctx.strokeStyle = '#7fbf5c';
    ctx.lineWidth   = lw.purlin;
    const numPurlins = Math.max(2, Math.round(depthM / 0.9));
    for (let i = numPurlins - 1; i >= 1; i--) {
        const zp = (i / numPurlins) * depthM;
        line(0, zp, postH, widthM, zp, postH);
    }

    // Rafters run in z-direction, one per post x position.
    // Draw right-to-left (large x first) so near-side rafters paint over far-side ones.
    ctx.strokeStyle = '#b55343';
    ctx.lineWidth   = lw.rafter;
    for (const xp of [...xPosts].reverse()) {
        line(xp, 0, postH, xp, depthM, postH);
    }
}

/* ---------------------------------------------------------------------- */
/* Gable roof                                                              */
/* ---------------------------------------------------------------------- */
function drawGableRoof(ctx, proj, line, lw, widthM, depthM, postH, ridgeH, ridgeAlongX, xPosts) {
    if (ridgeAlongX) {
        // Ridge runs in x-direction at z = depthM/2
        const rz = depthM / 2;

        // Height on slope at any z:
        //   front slope (z 0 → rz):  postH + ridgeH * z / rz
        //   back  slope (z rz → depthM): postH + ridgeH * (depthM - z) / rz
        const frontSlopeH = z => postH + ridgeH * z / rz;
        const backSlopeH  = z => postH + ridgeH * (depthM - z) / rz;

        // Back-slope purlins (draw first — further from viewer)
        ctx.strokeStyle = '#7fbf5c';
        ctx.lineWidth   = lw.purlin;
        const numHalf = Math.max(2, Math.round(rz / 0.9));
        for (let i = 1; i < numHalf; i++) {
            const zp = rz + (i / numHalf) * (depthM - rz);
            const yp = backSlopeH(zp);
            line(0, zp, yp, widthM, zp, yp);
        }

        // Back-slope rafters — right-to-left (large x first)
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.rafter;
        for (const xp of [...xPosts].reverse()) {
            line(xp, depthM, postH, xp, rz, postH + ridgeH);
        }

        // Ridge beam
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(0, rz, postH + ridgeH, widthM, rz, postH + ridgeH);

        // Front-slope rafters — right-to-left (large x first)
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.rafter;
        for (const xp of [...xPosts].reverse()) {
            line(xp, 0, postH, xp, rz, postH + ridgeH);
        }

        // Front-slope purlins
        ctx.strokeStyle = '#7fbf5c';
        ctx.lineWidth   = lw.purlin;
        for (let i = numHalf - 1; i >= 1; i--) {
            const zp = (i / numHalf) * rz;
            const yp = frontSlopeH(zp);
            line(0, zp, yp, widthM, zp, yp);
        }

        // Gable-end triangles (structural framing at x=0 and x=widthM)
        ctx.strokeStyle = '#89a54f';
        ctx.lineWidth   = lw.beam;
        for (const xp of [0, widthM]) {
            const pts = [
                proj(xp, 0,      postH),
                proj(xp, rz,     postH + ridgeH),
                proj(xp, depthM, postH),
            ];
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
        }

    } else {
        // Ridge runs in z-direction at x = widthM/2
        const rx = widthM / 2;

        const leftSlopeH  = x => postH + ridgeH * x / rx;
        const rightSlopeH = x => postH + ridgeH * (widthM - x) / rx;

        // Right-slope purlins first (further left in isometric = lower x → draw after)
        // Actually right slope (x from rx to widthM) is CLOSER to viewer — draw last.
        // Left slope (x from 0 to rx) is further — draw first.
        ctx.strokeStyle = '#7fbf5c';
        ctx.lineWidth   = lw.purlin;
        const numHalf = Math.max(2, Math.round(rx / 0.9));

        // Left slope (further — draw first)
        for (let i = 1; i < numHalf; i++) {
            const xp = (i / numHalf) * rx;
            const yp = leftSlopeH(xp);
            line(xp, 0, yp, xp, depthM, yp);
        }

        // Left-slope rafters
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.rafter;
        const numRafters = Math.max(3, Math.round(depthM / 0.9));
        for (let i = 0; i <= numRafters; i++) {
            const zp = (i / numRafters) * depthM;
            line(0, zp, postH, rx, zp, postH + ridgeH);
        }

        // Ridge beam
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.beam;
        line(rx, 0, postH + ridgeH, rx, depthM, postH + ridgeH);

        // Right-slope rafters
        ctx.strokeStyle = '#b55343';
        ctx.lineWidth   = lw.rafter;
        for (let i = 0; i <= numRafters; i++) {
            const zp = (i / numRafters) * depthM;
            line(widthM, zp, postH, rx, zp, postH + ridgeH);
        }

        // Right-slope purlins (closer — draw after)
        ctx.strokeStyle = '#7fbf5c';
        ctx.lineWidth   = lw.purlin;
        for (let i = numHalf - 1; i >= 1; i--) {
            const xp = rx + (i / numHalf) * (widthM - rx);
            const yp = rightSlopeH(xp);
            line(xp, 0, yp, xp, depthM, yp);
        }

        // Gable-end triangles at z=0 (front) and z=depthM (back)
        ctx.strokeStyle = '#89a54f';
        ctx.lineWidth   = lw.beam;
        for (const zp of [0, depthM]) {
            const pts = [
                proj(0,      zp, postH),
                proj(rx,     zp, postH + ridgeH),
                proj(widthM, zp, postH),
            ];
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
        }
    }
}

/* ---------------------------------------------------------------------- */
/* Dimension labels                                                        */
/* ---------------------------------------------------------------------- */
function drawIsoDimensions(ctx, proj, widthM, depthM, postH) {
    ctx.font         = 'bold 11px Arial';
    ctx.fillStyle    = '#444';
    ctx.textBaseline = 'middle';

    // Width label: centred below the front fascia beam
    const wMid = proj(widthM / 2, 0, 0);
    ctx.textAlign = 'center';
    ctx.fillText(widthM.toFixed(1) + ' m', wMid.x, wMid.y + 16);

    // Depth label: to the left of the left side, midway along depth
    const dMid = proj(0, depthM / 2, 0);
    ctx.textAlign = 'right';
    ctx.fillText(depthM.toFixed(1) + ' m', dMid.x - 8, dMid.y);
}

/* -------------------- Resize handling -------------------- */
let lastWidth = 0;
function watchResize(){
    const redraw = () => {
        const canvas = document.getElementById('planCanvas');
        const w = Math.round(canvas.getBoundingClientRect().width);
        if(w !== lastWidth){
            lastWidth = w;
            updateCalculator();
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


/* -------------------- Calculator -------------------- */
function updateCalculator(){
    const postcode    = (document.getElementById('postcode').value    || "").trim();
    const city        = getCityFromPostcode(postcode) || "Unknown area";
    const vWidthM     = Math.max(0, parseFloat(document.getElementById('vWidth').value));
    const vDepthM     = Math.max(0, parseFloat(document.getElementById('vDepth').value));
    const frameType   = document.getElementById('frameType').value;
    const roofStyle   = document.getElementById('roofStyle').value;
    const attachSide  = document.getElementById('attachSide').value;

    const area = (isFinite(vWidthM) ? vWidthM : 0) * (isFinite(vDepthM) ? vDepthM : 0);

    const err = document.getElementById('postcodeError');
    if(!getCityFromPostcode(postcode) && postcode.length === 4){
        err.classList.add('is-visible');
    } else {
        err.classList.remove('is-visible');
    }

    let rate = null;
    if(priceTable[city] && priceTable[city][frameType]){
        rate = priceTable[city][frameType][roofStyle];
    }

    if(!rate || area === 0){
        document.getElementById('estimateValue').innerHTML = "Please enter a postcode above to view your estimate";
        document.getElementById('estimateSub').textContent = "Please enter your postcode above for a price estimate";
    } else {
        const min = area * rate.min;
        const max = area * rate.max;
        document.getElementById('estimateValue').innerHTML =
            `$<span id="minPrice">${formatMoney(min)}</span> – $<span id="maxPrice">${formatMoney(max)}</span>`;
        document.getElementById('estimateSub').textContent =
            `For a high quality attached veranda / patio roof installed in ${city}.`;
    }

    document.getElementById('metaRoof').textContent     = roofStyle === "flat" ? "Flat roof" : "Gable roof";
    document.getElementById('metaFrame').textContent    = frameType === "steel" ? "Colorbond steel" : "Timber";
    document.getElementById('metaLocation').textContent = city;

    // Isometric structural drawing
    drawIsometric(
        isFinite(vWidthM) ? vWidthM : 0,
        isFinite(vDepthM) ? vDepthM : 0,
        attachSide,
        roofStyle
    );

}

/* -------------------- Wiring -------------------- */
function wireAutoUpdate(){
    ['postcode','vWidth','vDepth','frameType','roofStyle','attachSide'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        ['input','change','blur','keyup'].forEach(evt => {
            el.addEventListener(evt, updateCalculator);
        });
    });
    const form = document.querySelector('.vp-form');
    form.addEventListener('input',  updateCalculator);
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
        requestAnimationFrame(() => requestAnimationFrame(updateCalculator));
    }, {once:true, passive:true});

    window.addEventListener('pageshow', updateCalculator, {passive:true});
});
