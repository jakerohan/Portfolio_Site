// ===== Smooth scroll with Lenis =====
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
});

// Connect Lenis to GSAP ScrollTrigger so they stay in sync
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ===== Register GSAP plugins =====
gsap.registerPlugin(ScrollTrigger);

// ===== Auto-detect image format from filename suffix =====
// Reads _wide, _tall, _square, _ultrawide from the filename and applies
// the matching CSS class (fmt-wide, fmt-tall, fmt-square, fmt-ultrawide)
function applyFormatClasses() {
    const formatPattern = /_(wide|tall|square|ultrawide)\./i;

    document.querySelectorAll('.editorial-image img, .horizontal-image img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        const match = src.match(formatPattern);
        const figure = img.closest('.editorial-image') || img.closest('.horizontal-image');

        if (match && figure) {
            const format = match[1].toLowerCase();
            figure.classList.add(`fmt-${format}`);
        }
    });
}

// ===== Hero parallax on scroll =====
function initHeroParallax() {
    const heroLines = document.querySelectorAll('.hero-line');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    // Parallax the hero text at different speeds as user scrolls away
    heroLines.forEach((line) => {
        const speed = parseFloat(line.dataset.speed) || 1;
        gsap.to(line, {
            yPercent: -50 * speed,
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });
    });

    // Fade out subtitle and scroll indicator
    gsap.to([heroSubtitle, scrollIndicator], {
        opacity: 0,
        yPercent: -30,
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: '40% top',
            scrub: true,
        },
    });
}

// ===== Scroll-scrubbed image reveals =====
function initScrollReveals() {
    const revealElements = document.querySelectorAll('[data-scroll-reveal]');

    revealElements.forEach((element) => {
        gsap.to(element, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: element,
                start: 'top 85%',
                end: 'top 40%',
                scrub: 0.8,
            },
        });
    });
}

// ===== Section heading word animations =====
function initHeadingAnimations() {
    const headings = document.querySelectorAll('.section-heading');

    headings.forEach((heading) => {
        const words = heading.querySelectorAll('.heading-word');

        words.forEach((word, wordIndex) => {
            gsap.from(word, {
                opacity: 0,
                y: 60,
                rotateX: -15,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: heading,
                    start: 'top 80%',
                    end: 'top 50%',
                    scrub: 0.6,
                },
                delay: wordIndex * 0.1,
            });
        });
    });
}

// ===== Horizontal scroll galleries (supports multiple) =====
function initHorizontalScroll() {
    const horizontalSections = document.querySelectorAll('.horizontal-section');

    horizontalSections.forEach((section) => {
        const trigger = section.querySelector('.horizontal-trigger');
        const track = section.querySelector('.horizontal-track');
        const heading = section.querySelector('.horizontal-heading');

        if (!trigger || !track) return;

        // Use functional values so dimensions are recalculated on refresh
        const getScrollWidth = () => {
            const totalTrackWidth = track.scrollWidth;
            const headingWidth = heading ? heading.offsetWidth : 0;
            return headingWidth + totalTrackWidth;
        };

        gsap.to(trigger, {
            x: () => -(getScrollWidth() - window.innerWidth),
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: () => `+=${getScrollWidth()}`,
                scrub: 1,
                pin: true,
                pinSpacing: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            },
        });
    });

    // Ensure all horizontal images are fully visible
    const horizontalImages = document.querySelectorAll('.horizontal-image');
    horizontalImages.forEach((image) => {
        gsap.set(image, { opacity: 1, scale: 1, rotateY: 0 });
    });
}

// ===== Cursor-responsive tilt =====
function initCursorTilt() {
    const tiltElements = document.querySelectorAll('.tilt-hover');
    const maxRotation = 6; // degrees
    const maxShift = 5; // pixels for subtle translate

    tiltElements.forEach((element) => {
        element.addEventListener('mousemove', (event) => {
            const rect = element.getBoundingClientRect();
            const elementCenterX = rect.left + rect.width / 2;
            const elementCenterY = rect.top + rect.height / 2;

            // Normalise mouse position relative to element center (-1 to 1)
            const normalizedX = (event.clientX - elementCenterX) / (rect.width / 2);
            const normalizedY = (event.clientY - elementCenterY) / (rect.height / 2);

            // Rotate opposite to mouse direction for natural "looking at cursor" feel
            const rotateY = normalizedX * maxRotation;
            const rotateX = -normalizedY * maxRotation;
            const translateX = normalizedX * maxShift;
            const translateY = normalizedY * maxShift;

            gsap.to(element, {
                rotateX: rotateX,
                rotateY: rotateY,
                x: translateX,
                y: translateY,
                transformPerspective: 800,
                duration: 0.4,
                ease: 'power2.out',
            });
        });

        element.addEventListener('mouseleave', () => {
            gsap.to(element, {
                rotateX: 0,
                rotateY: 0,
                x: 0,
                y: 0,
                duration: 0.7,
                ease: 'elastic.out(1, 0.5)',
            });
        });
    });
}

// ===== Image parallax within containers =====
function initImageParallax() {
    // Only apply to editorial section images, not horizontal gallery
    const editorialImages = document.querySelectorAll('.editorial .editorial-image img');

    editorialImages.forEach((img) => {
        // Scale up slightly so parallax movement doesn't show edges
        gsap.set(img, { scale: 1.15, transformOrigin: 'center center' });

        gsap.to(img, {
            yPercent: -10,
            ease: 'none',
            scrollTrigger: {
                trigger: img.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
        });
    });
}

// ===== Lightbox =====
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.querySelector('.lightbox-close');

    // Click on any gallery image to open lightbox with full-res version
    document.querySelectorAll('.editorial-image img, .horizontal-image img').forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (event) => {
            event.stopPropagation();
            // Swap thumbs/ for full_res/ to load the high-res version
            const fullResSrc = img.src.replace('/thumbs/', '/full_res/');
            lightboxImg.src = fullResSrc;
            lightbox.classList.add('active');
            lenis.stop();
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        lenis.start();
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

// ===== Smooth anchor links =====
function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = anchor.getAttribute('href').slice(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                lenis.scrollTo(targetElement, { offset: 0, duration: 1.5 });
            }
        });
    });
}

// ===== Init everything =====
function init() {
    // Apply format classes first so CSS sizing is correct before layout
    applyFormatClasses();

    // Init non-scroll-dependent features immediately
    initHeroParallax();
    initCursorTilt();
    initLightbox();
    initSmoothAnchors();

    // Wait for all images to load before setting up scroll-dependent animations
    // This ensures ScrollTrigger has correct dimensions for all horizontal sections
    window.addEventListener('load', () => {
        initScrollReveals();
        initHeadingAnimations();
        initHorizontalScroll();
        initImageParallax();

        // Extra refresh after a short delay to catch any late layout shifts
        setTimeout(() => ScrollTrigger.refresh(), 200);
    });
}

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
