// ===== Configuration =====
const CONFIG = {
    imagePath: 'images/',
    thumbPath: 'images/thumbs/',
    intersectionThreshold: 0.1,
    parallaxStrength: 0.08
};

// ===== State Management =====
const state = {
    images: [],
    currentLightboxIndex: 0,
    isLightboxOpen: false
};

// ===== Utility Functions =====
function shuffleArray(array) {
    // Fisher-Yates shuffle algorithm
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== Image Loading =====
async function loadImageList() {
    const images = [
        '10.jpg', '11.jpg', '12.jpg', '13.jpg', '15.jpg', '16.jpg', '1.jpg', '2.jpg',
        '3556406180_93aa3a2a6f_b.jpg', '3556408452_b95f5e6a00_b.jpg',
        '3646453252_5ebbbaa6cc_b.jpg', '3911324557_c5b7657d06_o.jpg',
        '3911325279_5a1b019b57_o.jpg', '3918750780_4f56e2d4ff_o.jpg', '3.jpg',
        '4217578583_2154f925f6_b.jpg', '4217582363_5ffb9d1879_b.jpg',
        '4270665723_6269b82b61_o.jpg', '4271411366_24c0f7794b_o.jpg',
        '4271411842_17d27ee197_o.jpg', '4271412004_d7afa00504_o.jpg',
        '4322250322_808082a083_b.jpg', '4439001487_888b6abb1f_b.jpg',
        '4.jpg', '5.jpg', '6.jpg', '7done.jpg', '7.jpg', '8.jpg', '9 Buterfly.jpg', '9.jpg',
        'a (1 of 1) (2).jpg', 'a (1 of 1)-4.jpg', 'a (1 of 1)-6.jpg', 'a (1 of 1)-8edit.jpg',
        'a (6 of 14)edit.jpg', 'abc (4 of 10).jpg', 'abc (8 of 10).jpg',
        'grampians sep15-4 copy.jpg', 'HOMAGE_ROHAN_04.jpg',
        'IMG_2151.jpg', 'IMG_4478.jpg', 'IMG_9361.jpg', 'IMG_9364.jpg',
        'IMG_9374.jpg', 'IMG_9658.jpg', 'IMG_9695.jpg', 'IMG_9702.jpg', 'IMG_9788.jpg',
        'IMGP0810.JPG', 'IMGP0812.JPG', 'IMGP3623.jpg',
        'instagram-1-2.jpg', 'instagram-1-4.jpg', 'instagram-1-6.jpg',
        'instagram-1-7.jpg', 'instagram-1-9.jpg', 'instagram-1done.jpg',
        'kids.jpg', 'liv skate-2 copy.jpg', 'luca (6 of 6).jpg',
        'Massa-8266.jpg', 'Massa-8432.jpg',
        'Mori (10 of 14).jpg', 'Mori (12 of 14).jpg', 'Mori (13 of 14).jpg',
        'Mori (1 of 14).jpg', 'Mori (2 of 14).jpg', 'Mori (3 of 14).jpg',
        'Mori (4 of 14).jpg', 'Mori (5 of 14).jpg', 'Mori (6 of 14).jpg',
        'Mori (7 of 14).jpg', 'Mori (8 of 14).jpg',
        'pbpic3545130.jpg', 'phoebus (12 of 28).jpg', 'phoebus (6 of 28).jpg',
        'rainbow1edit2.jpg', 'randoms-1.jpg', 'sdfs.jpg',
        'STUDIO_ROHAN_02.jpg', 'Sunset.jpg',
        'Untitled_Panorama1.jpg', 'Untitled_Panorama1-resize.jpg',
        'wine with mel edits-4 copy.jpg'
    ];

    // Shuffle the images for random order on each page load
    const shuffledImages = shuffleArray(images);

    state.images = shuffledImages.map((filename, index) => ({
        filename,
        thumb: CONFIG.thumbPath + filename,
        full: CONFIG.imagePath + filename,
        alt: generateAltText(filename),
        index
    }));

    return state.images;
}

function generateAltText(filename) {
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png)$/i, '');
    return `Photography image ${nameWithoutExt}`;
}

// ===== Gallery Rendering =====
function renderGallery(images) {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '';

    // Animation types to cycle through
    const animationTypes = ['slide', 'slide', 'flip', 'slide', 'flip'];

    images.forEach((image, index) => {
        const galleryItem = document.createElement('figure');
        galleryItem.className = 'gallery-item loading';

        // Vary animation types for visual interest
        const animationType = animationTypes[index % animationTypes.length];
        const direction = index % 2 === 0 ? 'left' : 'right';
        const animationClass = `${animationType}-${direction}`;

        galleryItem.classList.add(animationClass);
        galleryItem.dataset.index = index;

        // Create image element with lazy loading (use thumbnail for gallery)
        const img = document.createElement('img');
        img.dataset.src = image.thumb;
        img.alt = image.alt;
        img.loading = 'lazy';

        // Orientation detection happens in lazy loading onload handler

        galleryItem.addEventListener('click', () => openLightbox(index));

        galleryItem.appendChild(img);
        galleryGrid.appendChild(galleryItem);
    });

    initLazyLoading();
    initScrollAnimations();
}

// ===== Lazy Loading =====
function initLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;

                if (src) {
                    img.src = src;
                    img.onload = function() {
                        const galleryItem = this.parentElement;
                        galleryItem.classList.remove('loading');

                        // Detect orientation and apply class
                        if (this.naturalWidth < this.naturalHeight) {
                            galleryItem.classList.add('portrait');
                        } else {
                            galleryItem.classList.add('landscape');
                        }
                    };
                    img.onerror = () => {
                        img.parentElement.classList.remove('loading');
                    };

                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });

    document.querySelectorAll('.gallery-item img').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    const items = document.querySelectorAll('.gallery-item');
    const animatedItems = new Set();
    const fullyAnimatedItems = new Set();

    function checkItemsInView() {
        const windowHeight = window.innerHeight;

        items.forEach((item, index) => {
            if (animatedItems.has(index)) return;

            const rect = item.getBoundingClientRect();
            const itemTopRelativeToViewport = rect.top;
            const itemBottomRelativeToViewport = rect.bottom;

            // Trigger when item is within viewport (trigger earlier so animation completes before scrolling past)
            const triggerPoint = windowHeight * 1.2;

            if (itemTopRelativeToViewport < triggerPoint && itemBottomRelativeToViewport > 0) {
                item.classList.add('animate-in');
                animatedItems.add(index);

                // Mark as fully animated after transition completes (800ms)
                setTimeout(() => {
                    fullyAnimatedItems.add(index);
                }, 800);
            }
        });
    }

    // Apply parallax only to fully animated items
    function applyParallaxToAnimated() {
        const scrollPosition = window.pageYOffset;
        const windowHeight = window.innerHeight;

        fullyAnimatedItems.forEach(index => {
            const item = items[index];
            const itemTop = item.offsetTop;
            const itemHeight = item.offsetHeight;

            if (scrollPosition + windowHeight > itemTop && scrollPosition < itemTop + itemHeight) {
                const viewportCenter = scrollPosition + windowHeight / 2;
                const itemCenter = itemTop + itemHeight / 2;
                const distance = viewportCenter - itemCenter;
                const parallaxOffset = distance * CONFIG.parallaxStrength;

                item.style.transform = `translate3d(0, ${parallaxOffset}px, 0)`;
            }
        });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                checkItemsInView();
                applyParallaxToAnimated();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Check initially on load after a short delay to catch first item
    setTimeout(checkItemsInView, 100);
}

// ===== Lightbox Functionality =====
function openLightbox(index) {
    state.currentLightboxIndex = index;
    state.isLightboxOpen = true;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');

    const currentImage = state.images[index];
    lightboxImage.src = currentImage.full;
    lightboxCaption.textContent = currentImage.alt;

    lightbox.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.classList.remove('no-scroll');
    state.isLightboxOpen = false;
}

function navigateLightbox(direction) {
    const totalImages = state.images.length;

    if (direction === 'next') {
        state.currentLightboxIndex = (state.currentLightboxIndex + 1) % totalImages;
    } else if (direction === 'prev') {
        state.currentLightboxIndex = (state.currentLightboxIndex - 1 + totalImages) % totalImages;
    }

    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const currentImage = state.images[state.currentLightboxIndex];

    lightboxImage.style.opacity = '0';
    setTimeout(() => {
        lightboxImage.src = currentImage.full;
        lightboxCaption.textContent = currentImage.alt;
        lightboxImage.style.opacity = '1';
    }, 150);
}

// ===== Event Listeners =====
function initEventListeners() {
    document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-prev').addEventListener('click', () => navigateLightbox('prev'));
    document.querySelector('.lightbox-next').addEventListener('click', () => navigateLightbox('next'));

    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!state.isLightboxOpen) return;

        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigateLightbox('prev');
                break;
            case 'ArrowRight':
                navigateLightbox('next');
                break;
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ===== Initialization =====
async function init() {
    try {
        const images = await loadImageList();
        renderGallery(images);
        initEventListeners();
    } catch (error) {
        console.error('Failed to initialize portfolio:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
