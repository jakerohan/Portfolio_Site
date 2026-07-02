gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Smooth scroll — skipped entirely under reduced motion =====
let lenis = null;
if (!prefersReducedMotion) {
    lenis = new Lenis({ duration: 1.0, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

// ===== Hero =====
function initHero() {
    if (prefersReducedMotion) return;
    const heroImage = document.querySelector('.hero-bg img');
    const heroTitle = document.querySelector('.hero-title');
    const heroMeta = document.querySelector('.hero-meta');

    gsap.from(heroImage, { scale: 1.12, duration: 2.2, ease: 'power2.out' });
    gsap.from([heroTitle, heroMeta], {
        opacity: 0, y: 50, duration: 1.2, ease: 'power3.out', stagger: 0.15, delay: 0.3,
    });
    gsap.to(heroImage, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
}

// ===== Strips: hover-scoped wheel + mouse drag + progress + counter =====
// Wheel behaviour: while the pointer is over a strip that can still
// move in the wheel's direction, the wheel scrolls the strip sideways
// (smoothed with a short tween). At either end the event is left alone,
// so it bubbles up to Lenis and the page scrolls vertically — no trap.
// Touch devices never hit this path: native overflow-x handles swiping.
function initStrips() {
    // Each wheel tick moves the strip 3x the scrolled distance —
    // sideways travel is long, so 1:1 felt sluggish
    const wheelSpeedMultiplier = 3;

    document.querySelectorAll('[data-strip]').forEach((strip) => {
        const stripFooter = strip.parentElement.querySelector('.strip-footer');
        const progressBar = stripFooter.querySelector('.strip-progress-bar');
        const counter = stripFooter.querySelector('[data-counter]');
        const frameTotal = strip.querySelectorAll('figure').length;

        // Proxy object lets GSAP smooth scrollLeft without a plugin
        const scrollProxy = { value: strip.scrollLeft };
        let targetScrollLeft = strip.scrollLeft;

        const maxScrollLeft = () => strip.scrollWidth - strip.clientWidth;

        const animateToTarget = () => {
            if (prefersReducedMotion) {
                strip.scrollLeft = targetScrollLeft;
                scrollProxy.value = targetScrollLeft;
                return;
            }
            gsap.to(scrollProxy, {
                value: targetScrollLeft,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true,
                onUpdate: () => { strip.scrollLeft = scrollProxy.value; },
            });
        };

        // --- Wheel capture with end pass-through ---
        strip.addEventListener('wheel', (event) => {
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const limit = maxScrollLeft();
            const scrollingForward = delta > 0;
            const atStart = targetScrollLeft <= 0 && !scrollingForward;
            const atEnd = targetScrollLeft >= limit && scrollingForward;

            // Nothing to scroll, or at an end going outward → let the page have it
            if (limit <= 0 || atStart || atEnd) return;

            event.preventDefault();
            event.stopPropagation(); // keep it away from Lenis
            targetScrollLeft = Math.min(limit, Math.max(0, targetScrollLeft + delta * wheelSpeedMultiplier));
            animateToTarget();
        }, { passive: false });

        // --- Mouse drag (touch uses native overflow scrolling) ---
        let pointerIsDown = false;
        let dragStartX = 0;
        let scrollStartLeft = 0;
        let dragDistance = 0;

        strip.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'mouse') return;
            pointerIsDown = true;
            dragStartX = event.clientX;
            scrollStartLeft = strip.scrollLeft;
            dragDistance = 0;
            strip.classList.add('dragging');
            gsap.killTweensOf(scrollProxy);
        });
        strip.addEventListener('pointermove', (event) => {
            if (!pointerIsDown) return;
            const delta = event.clientX - dragStartX;
            dragDistance = Math.max(dragDistance, Math.abs(delta));
            // Capture only once a real drag starts — capturing on pointerdown
            // retargets the follow-up click away from the figure (broke the lightbox)
            if (dragDistance > 6 && !strip.hasPointerCapture(event.pointerId)) {
                strip.setPointerCapture(event.pointerId);
            }
            strip.scrollLeft = scrollStartLeft - delta;
        });
        const endDrag = () => {
            if (!pointerIsDown) return;
            pointerIsDown = false;
            strip.classList.remove('dragging');
            // Re-sync the wheel target with wherever the drag finished
            targetScrollLeft = strip.scrollLeft;
            scrollProxy.value = strip.scrollLeft;
        };
        strip.addEventListener('pointerup', endDrag);
        strip.addEventListener('pointercancel', endDrag);

        // Suppress the click that follows a real drag (lightbox guard)
        strip.addEventListener('click', (event) => {
            if (dragDistance > 6) { event.stopPropagation(); event.preventDefault(); }
        }, true);

        // Sync wheel target with native touch scrolling; drive progress + counter
        strip.addEventListener('scroll', () => {
            if (!pointerIsDown && !gsap.isTweening(scrollProxy)) {
                targetScrollLeft = strip.scrollLeft;
                scrollProxy.value = strip.scrollLeft;
            }
            const limit = maxScrollLeft();
            if (limit <= 0) return;
            const scrollFraction = strip.scrollLeft / limit;
            if (progressBar) gsap.set(progressBar, { scaleX: scrollFraction });
            if (counter) {
                const currentFrame = Math.min(frameTotal, Math.round(scrollFraction * (frameTotal - 1)) + 1);
                const pad = (n) => String(n).padStart(2, '0');
                counter.innerHTML = `<b>${pad(currentFrame)}</b> / ${pad(frameTotal)}`;
            }
        }, { passive: true });
    });
}

// ===== Collapsible sets =====
function initCollapse() {
    document.querySelectorAll('.cat').forEach((section) => {
        const toggleButton = section.querySelector('[data-toggle]');
        const body = section.querySelector('[data-body]');
        if (!toggleButton || !body) return;

        toggleButton.addEventListener('click', () => {
            const collapsing = toggleButton.getAttribute('aria-expanded') === 'true';
            toggleButton.setAttribute('aria-expanded', String(!collapsing));
            toggleButton.textContent = collapsing ? 'Show' : 'Hide';

            gsap.to(body, {
                height: collapsing ? 0 : 'auto',
                opacity: collapsing ? 0 : 1,
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: 'power3.inOut',
                // Page height changed — recalc scroll-linked animations
                onComplete: () => ScrollTrigger.refresh(),
            });
        });
    });
}

// ===== Reveals: play once, not scrubbed =====
function initReveals() {
    if (prefersReducedMotion) return; // CSS already forces these visible
    document.querySelectorAll('[data-reveal]').forEach((element) => {
        gsap.to(element, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
    });
}

// ===== Lightbox: portal open, true aspect ratio, zoom + pan, arrows =====
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const stage = document.getElementById('lightboxStage');
    const stageImg = document.getElementById('lightboxImg');
    const counter = document.getElementById('lightboxCounter');
    const prevButton = lightbox.querySelector('[data-lb-prev]');
    const nextButton = lightbox.querySelector('[data-lb-next]');
    const closeButton = lightbox.querySelector('[data-lb-close]');

    let galleryFigures = []; // figures of the strip the open photo belongs to
    let currentIndex = 0;
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;

    const pad = (n) => String(n).padStart(2, '0');

    // Size the stage to the photo's own aspect ratio, fitted to the viewport
    const fitStageToRatio = (ratio) => {
        let width = window.innerWidth * 0.84;
        let height = width / ratio;
        const maxHeight = window.innerHeight * 0.82;
        if (height > maxHeight) { height = maxHeight; width = height * ratio; }
        stage.style.width = `${Math.round(width)}px`;
        stage.style.height = `${Math.round(height)}px`;
    };

    // Keep the image edges from pulling inside the stage while zoomed
    const clampPan = () => {
        const maxPanX = (zoomLevel - 1) * stage.clientWidth / 2;
        const maxPanY = (zoomLevel - 1) * stage.clientHeight / 2;
        panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
        panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
    };

    const applyZoom = (animate = true) => {
        stage.classList.toggle('zoomed', zoomLevel > 1);
        gsap.to(stageImg, {
            scale: zoomLevel,
            x: panX,
            y: panY,
            duration: animate && !prefersReducedMotion ? 0.3 : 0,
            ease: 'power2.out',
        });
    };

    const resetZoom = () => { zoomLevel = 1; panX = 0; panY = 0; applyZoom(false); };

    const showImage = (index) => {
        currentIndex = (index + galleryFigures.length) % galleryFigures.length;
        const figure = galleryFigures[currentIndex];
        const thumbImg = figure.querySelector('img');
        // Lazy neighbours may not have loaded yet — fall back to the layout ratio
        const fallbackRatio = figure.classList.contains('tall') ? 2 / 3 : 3 / 2;
        const ratio = thumbImg.naturalWidth
            ? thumbImg.naturalWidth / thumbImg.naturalHeight
            : fallbackRatio;

        resetZoom();
        fitStageToRatio(ratio);

        // Show the already-cached thumb instantly, swap in high-res when ready
        stageImg.src = thumbImg.currentSrc || thumbImg.src;
        const fullResSrc = (thumbImg.currentSrc || thumbImg.src).replace('/thumbs/', '/full_res/');
        const indexAtRequest = currentIndex;
        const loader = new Image();
        loader.onload = () => { if (currentIndex === indexAtRequest) stageImg.src = fullResSrc; };
        loader.src = fullResSrc;

        counter.innerHTML = `<b>${pad(currentIndex + 1)}</b> / ${pad(galleryFigures.length)}`;
    };

    const openLightbox = (figures, index, clickedFigure) => {
        galleryFigures = figures;
        showImage(index);
        lightbox.classList.add('active');
        if (lenis) lenis.stop();

        // Portal: the stage grows out of the clicked thumbnail's position
        if (!prefersReducedMotion) {
            const fromRect = clickedFigure.getBoundingClientRect();
            const toRect = stage.getBoundingClientRect();
            gsap.from(stage, {
                x: (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2),
                y: (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2),
                scale: fromRect.width / toRect.width,
                duration: 0.55,
                ease: 'power3.out',
            });
        }
    };

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        if (lenis) lenis.start();
    };

    // Every strip becomes a gallery; each figure opens at its own index
    document.querySelectorAll('[data-strip]').forEach((strip) => {
        const figures = Array.from(strip.querySelectorAll('figure'));
        figures.forEach((figure, index) => {
            figure.style.cursor = 'zoom-in';
            figure.addEventListener('click', () => openLightbox(figures, index, figure));
        });
    });

    prevButton.addEventListener('click', () => showImage(currentIndex - 1));
    nextButton.addEventListener('click', () => showImage(currentIndex + 1));
    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
        if (!lightbox.classList.contains('active')) return;
        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowLeft') showImage(currentIndex - 1);
        if (event.key === 'ArrowRight') showImage(currentIndex + 1);
    });

    // --- Wheel zoom, anchored to the cursor ---
    stage.addEventListener('wheel', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = stage.getBoundingClientRect();
        const cursorX = event.clientX - rect.left - rect.width / 2;
        const cursorY = event.clientY - rect.top - rect.height / 2;
        const previousZoom = zoomLevel;
        zoomLevel = Math.min(4, Math.max(1, zoomLevel * Math.exp(-event.deltaY * 0.002)));
        // Keep the point under the cursor stationary while zooming
        const zoomRatio = zoomLevel / previousZoom;
        panX = cursorX - (cursorX - panX) * zoomRatio;
        panY = cursorY - (cursorY - panY) * zoomRatio;
        if (zoomLevel === 1) { panX = 0; panY = 0; }
        clampPan();
        applyZoom();
    }, { passive: false });

    // --- Drag to pan while zoomed; plain click toggles zoom ---
    let panPointerDown = false;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;
    let panDistance = 0;

    stage.addEventListener('pointerdown', (event) => {
        panPointerDown = true;
        panDistance = 0;
        panStartX = event.clientX;
        panStartY = event.clientY;
        panOriginX = panX;
        panOriginY = panY;
        if (zoomLevel > 1) {
            stage.classList.add('panning');
            stage.setPointerCapture(event.pointerId);
        }
    });
    stage.addEventListener('pointermove', (event) => {
        if (!panPointerDown || zoomLevel <= 1) return;
        const deltaX = event.clientX - panStartX;
        const deltaY = event.clientY - panStartY;
        panDistance = Math.max(panDistance, Math.abs(deltaX), Math.abs(deltaY));
        panX = panOriginX + deltaX;
        panY = panOriginY + deltaY;
        clampPan();
        gsap.set(stageImg, { x: panX, y: panY });
    });
    const endPan = () => { panPointerDown = false; stage.classList.remove('panning'); };
    stage.addEventListener('pointerup', endPan);
    stage.addEventListener('pointercancel', endPan);

    stage.addEventListener('click', (event) => {
        if (panDistance > 6) return; // that was a pan, not a click
        if (zoomLevel === 1) {
            // Zoom in, keeping the clicked point under the cursor
            const rect = stage.getBoundingClientRect();
            zoomLevel = 2;
            panX = -(event.clientX - rect.left - rect.width / 2);
            panY = -(event.clientY - rect.top - rect.height / 2);
            clampPan();
        } else {
            zoomLevel = 1;
            panX = 0;
            panY = 0;
        }
        applyZoom();
    });
}

// ===== Anchor links via Lenis (native fallback under reduced motion) =====
function initAnchors() {
    if (!lenis) return;
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const target = document.getElementById(anchor.getAttribute('href').slice(1));
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target, { duration: 1.2 });
        });
    });
}

function init() {
    initHero();
    initStrips();
    initCollapse();
    initReveals();
    initLightbox();
    initAnchors();
    window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
