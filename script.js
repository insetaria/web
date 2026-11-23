var autoScrolling = null;

function smoothScroll(target, duration = 800) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return;

    Array.from(document.querySelectorAll('.menu-item'))
        .filter(item => item.getAttribute('href')?.startsWith('#'))
        .forEach(item => {
            const href = item.getAttribute('href');
            if (href === `#${targetElement.id}`) {
                autoScrolling = item;
                autoScrolling.parentElement.classList.add('active');
            } else {
                item.parentElement.classList.remove('active');
            }
            
        });

    const menuHeight = document.getElementById('menu')?.offsetHeight || 0;
    const targetPosition = Math.round(targetElement.offsetTop - menuHeight);
    const startPosition = Math.round(window.pageYOffset);
    const distance = targetPosition - startPosition;

    if (Math.abs(distance) < 2) {
        activateMenuLink();
        return;
    }

    const adjustedDuration = Math.min(Math.abs(distance) * 0.8, duration);
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeOutQuad(timeElapsed, startPosition, distance, adjustedDuration);
        window.scrollTo(0, run);
        if (timeElapsed < adjustedDuration) {
            requestAnimationFrame(animation);
        } else {
            activateMenuLink(targetElement);
        }
    }

    function easeOutQuad(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    }

    requestAnimationFrame(animation);

    function activateMenuLink() {
        if(autoScrolling){
            autoScrolling.parentElement.classList.add('active');
            autoScrolling = null;
        }
    }
}

function renderParagraphs(text) {
    if (!text) return '';
    const blockTags = /^<(hr|h[1-6]|ul|ol|li|div|table|blockquote|pre|figure)\b/i;
    return text.split('\n').map(line => {
        const t = line.trim();
        if (!t) return `<p class="spacer"></p>`;
        if (blockTags.test(t)) return t;
        return `<p>${t}</p>`;
    }).join('');
}

function updateActiveMenu() {
    if(autoScrolling) return;
    const menuItems = Array.from(document.querySelectorAll('.menu-item'))
        .filter(item => item.getAttribute('href')?.startsWith('#'));

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;

    const viewportCenter = scrollY + (windowHeight / 2);

    let closestItem = null;
    let closestDistance = Infinity;

    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        const section = document.querySelector(href);

        if (!section) return;

        const sectionTop = section.offsetTop;
        const sectionCenter = sectionTop + (section.offsetHeight / 2);

        const distance = Math.abs(sectionCenter - viewportCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });

    menuItems.forEach(link => link.parentElement.classList.remove('active'));

    if (closestItem) {
        closestItem.parentElement.classList.add('active');
    }

    const nearBottom = scrollY + windowHeight >= fullHeight - 10;

    if (nearBottom) {
        const anyActive = menuItems.some(i => i.parentElement.classList.contains('active'));
        if (!anyActive) {
            const lastItem = menuItems[menuItems.length - 1];
            if (lastItem) lastItem.parentElement.classList.add('active');
        }
    }
}


function renderMenu() {
    const container = document.getElementById('menu-container') || document.createElement('nav');
    container.id = 'menu';
    container.role = 'navigation';
    container.innerHTML = `
        <div class="logo">
            <a href="${getBasePath()}${getGidSuffix()}" class="nolink">
                <img src="${getBasePath()}assets/img/logos/logo.png" width="auto" height="35px" alt="Insectaria" title="Insectaria" style="cursor: pointer;display: list-item; text-align: -webkit-match-parent;">
            </a>
        </div>
        <div class="menu-group">
            <div id="hamburger"><span></span><span></span><span></span></div>
            <ul class="menu-list">
                ${database.menu
                    .map(item => {
                        var attributes = ''
                        if(item.link){
                            const isExternal = item.link.startsWith('http');
                            const isAnchor = item.link.startsWith('#');
                            const isDetail = detectPage().type === "detail";
                            let finalHref = item.link;
                            if (isAnchor && isDetail) {
                                finalHref = `${getBasePath()}${getGidSuffix()}${item.link}`;
                            }
                            attributes = isExternal
                                ? `href="${item.link}" target="_blank" rel="noopener noreferrer"`
                                : `href="${finalHref}"`;
                        }

                        const content = item.text.startsWith("icofont") 
                            ? `<i class="${item.text}"></i>` 
                            : item.text;

                        return `<li><a ${attributes} class="menu-item nolink">${content}</a></li>`;
                    })
                    .join('')}
            </ul>
        </div>
    `;
    
    if (!document.getElementById('menu-container')) {
        document.body.appendChild(container);
    }

    const menuElement = document.getElementById('menu');
    
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.onclick = () => menuElement.classList.toggle('show');
    }

    const menuItems = container.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    smoothScroll(targetElement, 1000);
                }
            } 
            
            if (menuElement) menuElement.classList.remove('show');
        });
    });
    window.addEventListener('scroll', updateActiveMenu);
}

// Hero layouts: the full-screen original plus low full-width banners (no visible h1: subtitle as
// the lead, text lines beside/under it). Every layout cross-fades the Fondo images (one per line).
const HERO_VARIANTS = {
    clasico: { label: "Pantalla completa", banner: false },
    banner: { label: "Banner", banner: true },
    "banner-divisor": { label: "Banner con divisor", banner: true },
    "banner-centrado": { label: "Banner centrado", banner: true },
};
const HERO_INTERVAL_DEFAULT = 4;
let heroSlideshowTimer = null;

function renderHero(section, variantOverride) {
    const variantKey = variantOverride || resolveSectionVariant("hero", HERO_VARIANTS, "clasico");
    const variant = HERO_VARIANTS[variantKey];
    const heroSection = document.getElementById('hero') || document.createElement('section');
    heroSection.id = 'hero';
    heroSection.role= 'main';
    heroSection.className = `hero--${variantKey}${variant.banner ? " hero-banner" : ""}`;

    // Fondo: one image per line (cross-fade); a color line (#…, rgb…, hsl…) sets the base color;
    // "# <url>" (hash + space) comments a line out
    const backgrounds = splitLines(section.background).filter(line => !/^#(\s|$)/.test(line));
    const isColor = v => /^(#|rgba?\(|hsla?\()/i.test(v);
    const images = backgrounds.filter(v => !isColor(v));
    heroSection.style.backgroundImage = "";
    heroSection.style.backgroundColor = backgrounds.find(isColor) || "";

    const lines = splitLines(section.text);
    const content = variant.banner
        ? `<h1 class="visually-hidden">${section.title}</h1>
            <div class="hero-banner-content">
                ${section.subtitle && section.subtitle !== "--" ? `<h2 class="hero-lead">${section.subtitle}</h2>` : ""}
                ${lines.length ? `<h3 class="hero-side">${lines.join("<br>")}</h3>` : ""}
            </div>`
        : `<h1>${section.title}</h1>
            <h2>${section.subtitle}</h2>
            ${lines.map(line => `<h3>${line}</h3>`).join('')}`;
    heroSection.innerHTML = `
        ${images.map((img, i) => `<div class="hero-bg${i === 0 ? " is-active" : ""}" style="background-image: url('${resolveAsset(img)}')"></div>`).join("")}
        <div class="container">
            <a class="nolink" ${section.link ? `onclick="smoothScroll('${section.link}')"` : ''}>${content}</a>
        </div>
    `;
    if (section.font) {
        heroSection.style.color = section.font;
    }
    if (!document.getElementById('hero')) {
        document.body.append(heroSection);
    }
    startHeroSlideshow(heroSection);
    window.mountVariantSwitcher?.(heroSection, {
        key: "hero", variants: HERO_VARIANTS, current: variantKey, rerender: v => renderHero(section, v),
    });
}

/** Cycles the .hero-bg layers every config "hero_interval" seconds (CSS does the fade). */
function startHeroSlideshow(root) {
    clearInterval(heroSlideshowTimer);
    const layers = root.querySelectorAll(".hero-bg");
    if (layers.length < 2) return;
    const seconds = Number(database.config?.hero_interval) > 0 ? Number(database.config.hero_interval) : HERO_INTERVAL_DEFAULT;
    let current = 0;
    heroSlideshowTimer = setInterval(() => {
        if (!root.isConnected) return clearInterval(heroSlideshowTimer);
        layers[current].classList.remove("is-active");
        current = (current + 1) % layers.length;
        layers[current].classList.add("is-active");
    }, seconds * 1000);
}

function renderWhere(section) {
    const whereSection = document.getElementById('where') || document.createElement('section');

    whereSection.id = 'where';
    whereSection.role = 'contentinfo';

    if (section.background) {
        whereSection.style.backgroundColor = section.background;
    }

    if (section.font) {
        whereSection.style.color = section.font;
    }

    // Sheet "config" → carrousel_arrows; false when missing (e.g. database.js exported before it existed)
    const showArrows = database.config?.carrousel_arrows === true;

    whereSection.innerHTML = `
        <div class="container">
            ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ''}
            <div class="description">
                ${section.subtitle ? `<h3>${section.subtitle}</h3>` : ''}
                ${section.text ? `<p>${section.text}</p>` : ''}
            </div>
            <div class="where-content">
                ${database.crops && database.crops.length > 0 ?
                    `<div class="crops-carousel">
                     ${showArrows ? `<button type="button" class="crops-arrow crops-arrow-prev" aria-label="Anterior"><i class="icofont-rounded-left"></i></button>` : ''}
                     <div class="crops-content">
                        <div class="crops-track">
                            ${database.crops.map((crop, i) => `
                                <div class="crop-entry" data-crop-index="${i}">
                                    ${crop.image ? `
                                        <img
                                            src="${resolveAsset(crop.image)}"
                                            alt="${crop.title}"
                                            class="crop-image"
                                        >` : ''
                                    }
                                    <h4>${crop.title}</h4>
                                    ${crop.text ? ` <p>${renderParagraphs(crop.text)}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                     </div>
                     ${showArrows ? `<button type="button" class="crops-arrow crops-arrow-next" aria-label="Siguiente"><i class="icofont-rounded-right"></i></button>` : ''}
                    </div>`
                : ''}
            </div>
        </div>
    `;

    if (!document.getElementById('where')) {
        document.body.append(whereSection);
    }

    const cards = whereSection.querySelectorAll('.crop-entry');

    cards.forEach((card, index) => {
        const crop = database.crops[index];

        if (crop.modal && crop.sheet) {
            card.style.cursor = 'pointer';
            card.classList.add('hoverable');
            card.addEventListener('click', () => {
                const modalContent = `
                    <div>
                        ${renderModalImageBlock(crop.image, crop.modalImage, crop.title)}
                        ${renderParagraphs(crop.sheet)}
                    </div>
                `;

                modal(crop.title, modalContent);
            });
        }
    });

    initCropsCarousel(whereSection);
}

/**
 * Order of the crops in the carousel when `visible` crops fit on screen, as indexes into `crops`.
 * Each crop may ask for a 1-based position in `order<visible>` (Sheet columns "Orden 1".."Orden 5").
 * Crops with a valid position are placed first, in row order; a taken position moves the crop to
 * the next free one (or the previous one, at the end). A position past the end means "last".
 * Crops without a position fill the remaining gaps in row order. Invalid values (not a positive
 * integer) are ignored with a console warning. Always returns every index exactly once.
 * @param {Array<Object>} crops
 * @param {number} visible
 * @returns {number[]}
 */
function computeCropOrder(crops, visible) {
    const total = crops.length;
    const slots = new Array(total).fill(null);
    const placed = new Set();
    const key = 'order' + visible;

    crops.forEach((crop, i) => {
        const raw = String(crop[key] ?? '').trim();
        if (!raw) return;
        if (!/^\d+$/.test(raw) || Number(raw) < 1) {
            console.warn(`Cultivo "${crop.title}": "Orden ${visible}" = "${raw}" no es una posición válida; se ignora.`);
            return;
        }
        const wanted = Math.min(Number(raw), total) - 1;
        let slot = -1;
        for (let s = wanted; s < total && slot < 0; s++) if (slots[s] === null) slot = s;
        for (let s = wanted - 1; s >= 0 && slot < 0; s--) if (slots[s] === null) slot = s;
        slots[slot] = i;
        placed.add(i);
    });

    let next = 0;
    crops.forEach((_crop, i) => {
        if (placed.has(i)) return;
        while (slots[next] !== null) next++;
        slots[next] = i;
    });
    return slots;
}

function initCropsCarousel(scope) {
    const container = scope.querySelector('.crops-content');
    const track = scope.querySelector('.crops-track');
    if (!container || !track) return;
    const carousel = container.closest('.crops-carousel') || container;
    const prevButton = carousel.querySelector('.crops-arrow-prev');
    const nextButton = carousel.querySelector('.crops-arrow-next');

    const entries = Array.from(track.children);
    if (entries.length === 0) return;

    const total = entries.length;
    let index = 0;
    let currentX = 0;
    let intervalId = null;
    let isActive = false;
    let isHovering = false;
    let isTabVisible = !document.hidden;
    let isInViewport = false;

    function getVisible() {
        const v = getComputedStyle(container).getPropertyValue('--visible').trim();
        return parseInt(v, 10) || 1;
    }

    function shouldBeActive() {
        return total > getVisible();
    }

    function attachClickListener(node, crop) {
        if (crop && crop.modal && crop.sheet) {
            node.style.cursor = 'pointer';
            node.classList.add('hoverable');
            node.addEventListener('click', () => {
                const modalContent = `
                    <div>
                        ${renderModalImageBlock(crop.image, crop.modalImage, crop.title)}
                        ${renderParagraphs(crop.sheet)}
                    </div>
                `;
                modal(crop.title, modalContent);
            });
        }
    }

    function getStep() {
        const first = track.children[total];
        const second = track.children[total + 1];
        if (!first) return 0;
        if (!second) return first.offsetWidth;
        return second.offsetLeft - first.offsetLeft;
    }

    function basePosition() {
        return -getStep() * total;
    }

    function setX(x, animated = true) {
        currentX = x;
        track.style.transition = animated ? 'transform 0.6s ease' : 'none';
        track.style.transform = `translateX(${x}px)`;
    }

    function goToIndex(i, animated = true) {
        index = i;
        setX(basePosition() - getStep() * index, animated);
    }

    // Real on-screen translate (it differs from currentX while an animation is running).
    function readX() {
        try {
            return new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        } catch (e) {
            return currentX;
        }
    }

    // Freezes the track where it is and brings index back into 0..total-1 by jumping to the
    // identical clone, so a drag or arrow click in the middle of an animation never runs out
    // of clones. fromPosition: take the index from what is on screen instead of the target.
    function settle(fromPosition) {
        const step = getStep();
        if (!step) return;
        let x = readX();
        const i = fromPosition ? Math.round((basePosition() - x) / step) : index;
        const wrapped = ((i % total) + total) % total;
        x += (i - wrapped) * step;
        index = wrapped;
        setX(x, false);
        void track.offsetWidth; // apply the jump before the next animated move
    }

    function advance() {
        goToIndex(index + 1, true);
    }

    function moveBy(direction) {
        if (!isActive) return;
        stop();
        settle(false);
        goToIndex(index + direction, true);
        start();
    }

    function start() {
        stop();
        if (isActive && !isDragging && !isHovering && isTabVisible && isInViewport) {
            intervalId = setInterval(advance, 4000);
        }
    }

    function stop() {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }

    function activate() {
        if (isActive) return;
        isActive = true;

        const ordered = Array.from(track.children); // originals, in the current carousel order
        const clonesEnd = ordered.map(e => e.cloneNode(true));
        const clonesStart = ordered.map(e => e.cloneNode(true));
        clonesEnd.forEach(c => track.appendChild(c));
        clonesStart.reverse().forEach(c => track.insertBefore(c, track.firstChild));

        [...clonesEnd, ...clonesStart].forEach(node => attachClickListener(node, database.crops[Number(node.dataset.cropIndex)]));

        container.style.cursor = 'grab';
        container.style.userSelect = 'none';
        carousel.classList.add('is-active');

        requestAnimationFrame(() => {
            setX(basePosition() - getStep() * index, false);
            start();
        });
    }

    function deactivate() {
        if (!isActive) return;
        isActive = false;
        stop();

        Array.from(track.children).forEach(child => {
            if (!entries.includes(child)) track.removeChild(child);
        });

        index = 0;
        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';
        currentX = 0;

        container.style.cursor = '';
        container.style.userSelect = '';
        carousel.classList.remove('is-active');
    }

    function evaluate() {
        if (shouldBeActive()) {
            activate();
        } else {
            deactivate();
        }
    }

    track.addEventListener('transitionend', () => {
        if (!isActive) return;
        if (index >= total) {
            index = 0;
            setX(basePosition(), false);
        } else if (index < 0) {
            index = total - 1;
            setX(basePosition() - getStep() * index, false);
        }
    });

    // --- Drag / swipe ---
    // A short swipe is enough: past DRAG_THRESHOLD of a card (or a quick flick) moves one card
    // in that direction; mostly vertical touch gestures are left to the page scroll.
    const DRAG_THRESHOLD = 0.15;
    const FLICK_SPEED = 0.3;   // px per ms, averaged over the last FLICK_WINDOW ms
    const FLICK_WINDOW = 80;
    let isDragging = false;
    let dragDecided = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTranslate = 0;
    let dragStartIndex = 0;
    let moveSamples = []; // [time, clientX] of recent moves, to measure the flick speed
    let suppressNextClick = false;

    function onDragStart(clientX, clientY, isTouch) {
        if (!isActive) return;
        isDragging = true;
        dragDecided = !isTouch; // a mouse drag is always horizontal
        dragStartX = clientX;
        dragStartY = clientY;
        moveSamples = [[performance.now(), clientX]];
        stop();
        settle(true);
        dragStartIndex = index;
        dragStartTranslate = currentX;
        container.classList.add('dragging');
    }

    function cancelDrag() {
        isDragging = false;
        container.classList.remove('dragging');
        goToIndex(dragStartIndex, true);
        start();
    }

    function onDragMove(clientX, clientY) {
        if (!isActive || !isDragging) return;
        const delta = clientX - dragStartX;
        if (!dragDecided) {
            const dy = clientY - dragStartY;
            if (Math.abs(delta) < 6 && Math.abs(dy) < 6) return;
            if (Math.abs(dy) > Math.abs(delta)) { cancelDrag(); return; }
            dragDecided = true;
        }
        if (Math.abs(delta) > 3) {
            suppressNextClick = true;
        }
        const now = performance.now();
        moveSamples.push([now, clientX]);
        while (moveSamples.length > 2 && now - moveSamples[0][0] > FLICK_WINDOW) moveSamples.shift();
        setX(dragStartTranslate + delta, false);
    }

    function onDragEnd() {
        if (!isActive || !isDragging) return;
        isDragging = false;
        container.classList.remove('dragging');

        const step = getStep();
        const delta = currentX - dragStartTranslate;
        const steps = step ? -delta / step : 0;
        let moved = Math.trunc(steps);
        const rest = steps - moved;
        const first = moveSamples[0];
        const last = moveSamples[moveSamples.length - 1];
        const recent = performance.now() - last[0] < 100;
        const velocity = last[0] > first[0] ? (last[1] - first[1]) / (last[0] - first[0]) : 0;
        const flick = recent && Math.abs(velocity) > FLICK_SPEED && Math.sign(-velocity) === Math.sign(steps);
        if (Math.abs(rest) > DRAG_THRESHOLD || flick) moved += Math.sign(steps);
        goToIndex(dragStartIndex + moved, true);

        start();
    }

    container.addEventListener('click', (e) => {
        if (suppressNextClick) {
            e.preventDefault();
            e.stopPropagation();
            suppressNextClick = false;
        }
    }, true);

    // Browsers replay a tap as mouse events after touchend; ignore them or they would stop the
    // slide the swipe just started.
    let lastTouchTime = 0;
    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || performance.now() - lastTouchTime < 800) return;
        onDragStart(e.clientX, e.clientY, false);
    });
    window.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onDragEnd);

    container.addEventListener('touchstart', (e) => {
        lastTouchTime = performance.now();
        suppressNextClick = false;
        onDragStart(e.touches[0].clientX, e.touches[0].clientY, true);
    }, { passive: true });
    container.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    container.addEventListener('touchend', () => { lastTouchTime = performance.now(); onDragEnd(); });
    container.addEventListener('touchcancel', () => { if (isDragging) cancelDrag(); });

    if (prevButton) prevButton.addEventListener('click', () => moveBy(-1));
    if (nextButton) nextButton.addEventListener('click', () => moveBy(1));

    // Touch screens fire a fake mouseenter on tap and never the mouseleave: only real hover pauses.
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    container.addEventListener('mouseenter', () => { if (!canHover) return; isHovering = true; if (isActive && !isDragging) stop(); });
    container.addEventListener('mouseleave', () => { isHovering = false; if (isActive && !isDragging) start(); });

    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (isActive) {
            if (isTabVisible) start();
            else stop();
        }
    });

    const observer = new IntersectionObserver(([entry]) => {
        isInViewport = entry.isIntersecting;
        if (isActive) {
            if (isInViewport) start();
            else stop();
        }
    }, { threshold: 0, rootMargin: '-80px 0px -80px 0px' });
    observer.observe(container);

    // The crop order depends on how many fit on screen: rebuild the track when that changes.
    let orderedFor = null;
    function applyOrder() {
        const visible = getVisible();
        if (visible === orderedFor) return false;
        orderedFor = visible;
        deactivate();
        computeCropOrder(database.crops, visible).forEach(i => track.appendChild(entries[i]));
        return true;
    }

    window.addEventListener('resize', () => {
        if (applyOrder()) { evaluate(); return; }
        const wasActive = isActive;
        evaluate();
        if (isActive && wasActive) {
            setX(basePosition() - getStep() * index, false);
        }
    });

    applyOrder();
    evaluate();
}

// ============================================================
//  Section layout variants. A section with several layouts declares a table {key: {label, …}};
//  prod uses config "<section>_variant" (or the section's default), the prototype adds a switcher
//  (window.mountVariantSwitcher / window.getPreviewVariant, defined only in prototype.js).
// ============================================================

function normalizeVariantKey(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "-");
}

/** Layout key: prototype pick > config "<sectionKey>_variant" > `fallback` (prototype: first layout if none). */
function resolveSectionVariant(sectionKey, variants, fallback = null) {
    const picked = normalizeVariantKey(window.getPreviewVariant?.(sectionKey));
    if (variants[picked]) return picked;
    const raw = database.config?.[`${sectionKey}_variant`];
    const configured = normalizeVariantKey(raw);
    if (variants[configured]) return configured;
    if (configured) console.warn(`Config "${sectionKey}_variant" = "${raw}": diseño desconocido (${Object.keys(variants).join(", ")}).`);
    return fallback || (window.APP_GID ? Object.keys(variants)[0] : null);
}

function splitLines(text) {
    return String(text ?? "").split("\n").map(line => line.trim()).filter(line => line && line !== "--");
}

// ============================================================
//  Temas (#topics): a set of topics, each with its own paragraphs; clicking a topic shows its
//  content inside the section. Several layouts (TOPICS_VARIANTS) share one selection controller.
//  Prod renders only the layout named in config "topics_variant" (none → section hidden); the
//  prototype adds a layout switcher (prototype.js) and falls back to the first layout.
// ============================================================

/**
 * Layouts for the topics section. Each builds the markup from the topic list: triggers carry
 * data-topic="<i>", panels data-topic-panel="<i>". `collapsible` lets a click close the open topic.
 */
const TOPICS_VARIANTS = {
    pestanas: {
        label: "Pestañas",
        collapsible: false,
        build: items => `
            <div class="topics-tabs" role="tablist">${items.map((t, i) => topicTrigger(t, i, "topics-tab", "tab")).join("")}</div>
            <div class="topics-panels">${items.map((t, i) => topicPanel(t, i)).join("")}</div>`,
    },
    lateral: {
        label: "Lista lateral",
        collapsible: false,
        build: items => `
            <div class="topics-side">
                <div class="topics-side-list" role="tablist">${items.map((t, i) => topicTrigger(t, i, "topics-side-item", "tab")).join("")}</div>
                <div class="topics-panels">${items.map((t, i) => topicPanel(t, i)).join("")}</div>
            </div>`,
    },
    tarjetas: {
        label: "Tarjetas",
        collapsible: true,
        build: items => `
            <div class="topics-cards">${items.map((t, i) => topicTrigger(t, i, "topics-card", "button")).join("")}</div>
            <div class="topics-panels">${items.map((t, i) => topicPanel(t, i)).join("")}</div>`,
    },
    acordeon: {
        label: "Acordeón",
        collapsible: true,
        build: items => `
            <div class="topics-accordion">${items.map((t, i) => `
                <div class="topics-accordion-item">
                    ${topicTrigger(t, i, "topics-accordion-head", "button")}
                    ${topicPanel(t, i)}
                </div>`).join("")}
            </div>`,
    },
};

function topicTrigger(topic, index, cls, role) {
    const icon = topic.icon && topic.icon !== "--" ? `<i class="${topic.icon} topics-icon"></i>` : "";
    const summary = topic.summary && topic.summary !== "--" ? `<span class="topics-summary">${topic.summary}</span>` : "";
    return `<button type="button" class="${cls}" data-topic="${index}" role="${role}">
        ${icon}<span class="topics-title">${topic.title}</span>${summary}
    </button>`;
}

function topicPanel(topic, index) {
    const image = topic.image && topic.image !== "--"
        ? `<img class="topics-image" src="${resolveAsset(topic.image)}" alt="${topic.title}" loading="lazy">` : "";
    return `<div class="topics-panel${image ? " has-image" : ""}" data-topic-panel="${index}" role="region" hidden>
        <div class="topics-text"><h3>${topic.title}</h3>${renderParagraphs(topic.text)}</div>${image}
    </div>`;
}

/** Section header + topics to render: Sheet data, else the prototype's sample (window.TOPICS_DEMO). */
function getTopicsData() {
    const section = database.sections.find(s => s.id === "#topics");
    const items = database.topics || [];
    if (section && items.length) return { section, items, demo: false };
    const demo = window.TOPICS_DEMO;
    if (demo) return { section: section || demo.section, items: items.length ? items : demo.items, demo: !items.length };
    return null;
}

/** Shows topic `index` (or none with -1) and syncs aria state of every trigger. */
function selectTopic(root, index) {
    root.querySelectorAll("[data-topic]").forEach(btn => {
        const on = Number(btn.dataset.topic) === index;
        btn.classList.toggle("is-active", on);
        btn.setAttribute(btn.getAttribute("role") === "tab" ? "aria-selected" : "aria-expanded", String(on));
    });
    root.querySelectorAll("[data-topic-panel]").forEach(panel => {
        panel.hidden = Number(panel.dataset.topicPanel) !== index;
    });
}

function renderTopics(variantOverride) {
    const data = getTopicsData();
    const variantKey = variantOverride || resolveSectionVariant("topics", TOPICS_VARIANTS);
    const existing = document.getElementById("topics");
    if (!data || !variantKey) {
        existing?.remove();
        document.querySelector('.variant-switcher[data-for="topics"]')?.remove();
        return;
    }
    const { section, items } = data;
    const variant = TOPICS_VARIANTS[variantKey];
    const sec = existing || document.createElement("section");
    sec.id = "topics";
    sec.role = "contentinfo";
    sec.className = `topics topics--${variantKey}`;
    const bg = section.background && section.background !== "--" ? section.background : "";
    sec.style.backgroundColor = bg && !/\.(jpe?g|png|webp|gif|svg)$/i.test(bg) ? bg : "";
    sec.style.backgroundImage = bg && /\.(jpe?g|png|webp|gif|svg)$/i.test(bg) ? `url(${resolveAsset(bg)})` : "";
    sec.style.color = section.font && section.font !== "--" ? section.font : "";
    const has = v => v && v !== "--";
    sec.innerHTML = `
        <div class="container">
            <div class="topics-header">
                ${has(section.title) ? `<h2 class="text-shadow">${section.title}</h2>` : ""}
                ${has(section.subtitle) ? `<h3>${section.subtitle}</h3>` : ""}
                ${has(section.text) ? `<div class="topics-intro">${renderParagraphs(section.text)}</div>` : ""}
            </div>
            <div class="topics-body">${variant.build(items)}</div>
        </div>`;
    if (!existing) {
        // Always right before the crops section, whatever was rendered first
        const where = document.getElementById("where");
        where ? where.before(sec) : document.body.append(sec);
    }
    let current = variant.collapsible ? -1 : 0;
    selectTopic(sec, current);
    sec.querySelectorAll("[data-topic]").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = Number(btn.dataset.topic);
            current = variant.collapsible && index === current ? -1 : index;
            selectTopic(sec, current);
            // On small screens the panel can open below the fold (e.g. under the cards grid)
            const panel = sec.querySelector(`[data-topic-panel="${current}"]`);
            if (panel && panel.getBoundingClientRect().top > window.innerHeight - 120) {
                panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
    });
    sec.querySelectorAll(".text-shadow").forEach(applyTextShadow);
    window.mountVariantSwitcher?.(sec, {
        key: "topics", variants: TOPICS_VARIANTS, current: variantKey,
        note: data.demo ? "contenido de ejemplo" : "", rerender: v => renderTopics(v),
    });
}

function renderAbout(section) {
    const aboutSection = document.getElementById('about') || document.createElement('section');
    aboutSection.id = 'about';
    aboutSection.role= 'contentinfo';
    if (section.background) aboutSection.style.backgroundColor = section.background;
    if (section.font) aboutSection.style.color = section.font;
    aboutSection.innerHTML = `
        <div class="container">
            <div class="about-content">
                ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ''}
                <div class="description">
                    <h3>${section.text}</h3>
                </div>
            </div>
            ${ database.methodology && database.methodology.length > 0 ?
            `<div class="methodology-content">
                ${database.methodology.map((methodology, index) => `
                <div class="methodology-entry">
                    <i class="${methodology.icon} methodology-icon"></i>
                    <h3>${methodology.text}</h3>
                </div>
                `).join('')}
            </div>`: ``
            }
        </div>
    `;
    if (!document.getElementById('about')) {
        document.body.append(aboutSection);
    }
}

function renderServices(section) {
    const servicesSection = document.getElementById('services') || document.createElement('section');
    servicesSection.id = 'services';
    servicesSection.role = 'contentinfo';

    if (section.background){
        servicesSection.style.backgroundImage = `url(${resolveAsset(section.background)})`;
        servicesSection.classList.add('bg');
    }
    
    servicesSection.innerHTML = `
        <div class="container">
            <div class="grid">
                ${database.services.map((service, index) => `
                    <div class="service-card hover-bg">
                        <div class="card ${(service.modal && service.sheet) ? 'clickable-card hover-shadow' : ''}" 
                             data-index="${index}" 
                             ${service.image ? `style="--hover-bg: url('${resolveAsset(service.image)}')"` : ``}>
                            <div class="service-info">
                                <div class="icon"><i class="${service.icon} service-icon"></i></div>
                                <h4>${service.title}</h4>
                                <p>${service.text}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${database.services.length > 4 
                ? `<div id="services-trigger" style="display: none;">
                        <a href="${section.link}" class="nolink trigger-button" style="cursor: pointer;">${section.title}</a>
                   </div>` 
                : ``}
        </div> 
    `;

    const cards = servicesSection.querySelectorAll('.service-card');

    cards.forEach((wrapper, index) => {
        const card = wrapper.querySelector('.card');
        const service = database.services[index];

        if (service.modal && service.sheet) {
            card.style.cursor = 'pointer';

            card.addEventListener('click', () => {
                const modalContent = `
                    <div>
                        ${renderModalImageBlock(service.image, service.modalImage, service.title)}
                        ${renderParagraphs(service.sheet)}
                    </div>
                `;
                modal(service.title, modalContent);
            });
        }
    });
    
    if (database.services.length > 5) {
        const triggerContainer = servicesSection.querySelector('#services-trigger');
        const triggerLink = triggerContainer.querySelector('.trigger-button');
        
        let isExpanded = false;

        const updateVisibility = (showAll) => {
            cards.forEach((card, index) => {
                card.style.display = (showAll || index < 5) ? 'block' : 'none';
            });
            triggerLink.textContent = showAll ? section.subtitle : section.title;
            isExpanded = showAll;
        };

        triggerContainer.style.display = 'block';
        updateVisibility(false);

        triggerLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 

            if (!isExpanded) {
                updateVisibility(true);
            } else {
                updateVisibility(false);
                setTimeout(() => {
                    if (section.link) {
                        const target = document.querySelector(section.link);
                        if (target) {
                            smoothScroll(target, 1000);
                        }
                    }
                }, 10); 
            }
        });
    }

    if (section.font) servicesSection.style.color = section.font;
    if (!document.getElementById('services')) document.body.append(servicesSection);
}

function renderModalImageBlock(defaultImage, modalImages, alt) {
    let mainImageSrc = defaultImage;
    let thumbnailsHTML = '';
    
    if (modalImages && modalImages.trim() !== '') {
        const modalImagesArray = modalImages
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
            
        if (modalImagesArray.length > 0) {
            mainImageSrc = resolveAsset(modalImagesArray[0]);
        }
        if (modalImagesArray.length > 1) {
            thumbnailsHTML = modalImagesArray
                .map((src, index) => {
                    const isActive = index === 0 ? 'active' : '';
                    return `
                    <div class="modal-thumbnail-wrapper ${isActive}" 
                        onclick="
                            const container = this.closest('.modal-image-container');
                            const mainImg = container.querySelector('.modal-image');
                            const childImg = this.querySelector('.modal-thumbnail');
                            
                            if (childImg && mainImg.src !== childImg.src) {
                                const currentActive = container.querySelector('.modal-thumbnail-wrapper.active');
                                if (currentActive) currentActive.classList.remove('active');
                                
                                this.classList.add('active');
                                mainImg.src = childImg.src;
                            }
                        "
                    >
                        <img src="${resolveAsset(src)}" alt="Thumbnail" class="modal-thumbnail" />
                    </div>`;
                })
                .join('');
        }
    }
    
    // SVGs limpios para las flechas
    const expandIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon-expand"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0l-5.25-5.25" /></svg>`;
    const shrinkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon-shrink"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75v4.5m0 0H4.5m4.5 0L3.75 3.75M15 20.25v-4.5m0 0h4.5m-4.5 0l5.25 5.25" /></svg>`;

    const imageBlock = `
        <div class="modal-image-container">
            <div class="modal-image-rel-wrapper">
                <img src="${mainImageSrc}" alt="${alt || 'Modal Image'}" class="modal-image" />
                
                <button class="modal-resize-btn" onclick="this.closest('.modal-image-container').classList.toggle('is-expanded')">
                    ${expandIconSVG}
                    ${shrinkIconSVG}
                </button>
            </div>
            ${thumbnailsHTML ? `<div class="modal-thumbnails-gallery">${thumbnailsHTML}</div>` : ''}
        </div>
    `;
    return imageBlock;
}

function renderPredators(section) {
    const predatorsSection = document.getElementById('predators') || document.createElement('section');
    predatorsSection.id = 'portfolio';
    predatorsSection.role = 'contentinfo';
    predatorsSection.innerHTML = `
        <div class="container">
            <div>
                <h2 class="text-shadow">${section.title}</h2>
                <p>${section.text}</p>
            </div>
            <div class="grid">
                ${database.predators.map((predator, index) => {
                    const hasModal = predator.modal && (predator.sheet || predator.price || predator.modalImage);
                    const hasExternalPage = predator.page === true && predator.content;
                    const isClickable = hasModal || hasExternalPage;

                    return `
                    <div class="predator-card">
                        <div class="card ${isClickable ? 'clickable-card' : ''}" data-index="${index}">
                            ${predator.image ? `<div class="predator-image"><img src="${resolveAsset(predator.image)}" alt="${predator.name}"></div>` : ''}
                            <div class="predator-info">
                                <h3><i>${predator.name}</i></h3>
                                <h4>${predator.state}</h4>
                                <p>${predator.description}</p>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `;

    if (section.font) predatorsSection.style.color = section.font;
    if (!document.getElementById('predators')) document.body.append(predatorsSection);

    const cards = predatorsSection.querySelectorAll('.card.clickable-card');
    cards.forEach(card => {
        const index = card.getAttribute('data-index');
        const predator = database.predators[index];

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const slug = predator.id || slugify(predator.name);
            const hasPage = predator.page === true && predator.content;
            const detailUrl = hasPage ? buildDetailUrl("predators", slug) : null;

            if (predator.modal && (predator.price || predator.sheet || predator.modalImage)) {
                let priceTable = '';
                if (predator.price) {
                    const rows = predator.price.trim().split('\n');
                    const tableRows = rows.map(row => {
                        const cells = row.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
                        return `<tr>${cells}</tr>`;
                    }).join('');
                    priceTable = `
                        <table class="price-table">
                            <tbody class="price-table-body">
                                ${tableRows}
                            </tbody>
                        </table>
                        <br/>
                    `;
                }
                const pageLink = detailUrl
                    ? `<p style="margin-top:1rem; text-align: right;"><a href="#" onclick="window.open('${detailUrl}','_blank');return false" class="nolink"><strong style="padding-right: 2rem;">Más información 🠊</strong></a></p>`
                    : "";
                const modalContent = `
                    <div>
                        ${renderModalImageBlock(predator.image, predator.modalImage, predator.name)}
                        ${predator.sheet ? '<br/><hr/>' + renderParagraphs(predator.sheet) + '<br/><hr/>': ''}
                        ${priceTable}
                        ${pageLink}
                    </div>
                `;
                modal(`<i>${predator.name}</i> - ${predator.state}`, modalContent);

            } else if (detailUrl) {
                window.open(detailUrl, '_blank');
            }
        });
    });
}

function renderProjects(section) {
    const projectsSection = document.getElementById('projects') || document.createElement('section');
    projectsSection.id = 'projects';
    projectsSection.role = 'contentinfo';
    projectsSection.classList.add('bg');
    
    if (section.background) projectsSection.style.backgroundImage = `url(${resolveAsset(section.background)})`;
    if (section.font) projectsSection.style.color = section.font;

    projectsSection.innerHTML = `
        <div class="container">
            <div class="grid">
                ${database.projects.map(project => {
                    const hasLink = project.link && project.link.trim() !== "";
                    const cardContent = `
                        <div class="card">
                            <div class="project-info">
                                <h3>${project.title}</h3>
                                <p>${project.description}</p>
                                ${hasLink ? '<p>(<span>Ir al artículo</span>)</p>' : ""}
                            </div>
                        </div>
                    `;
                    return `
                        <div class="project-card">
                            ${hasLink 
                                ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="nolink">${cardContent}</a>` 
                                : cardContent
                            }
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    if (!document.getElementById('projects')) {
        document.body.append(projectsSection);
    }

    const projectCards = projectsSection.querySelectorAll('.project-card');
    let isExpanded = false;

    const updateProjectVisibility = (showAll) => {
        projectCards.forEach((card, index) => {
            card.style.display = (showAll || index < 3) ? 'block' : 'none';
        });
        const triggerButton = document.getElementById('projects-trigger');
        if (triggerButton) {
            triggerButton.textContent = showAll ? section.subtitle || "Mostrar menos" : section.title || "Mostrar más";
        }
        isExpanded = showAll;
    };

    if (database.projects.length > 3) {
        const container = projectsSection.querySelector('.container');
        const triggerHTML = `
            <div id="projects-trigger-container" style="text-align:center; margin-top:1rem;">
                <div id="projects-trigger" class="trigger-button card" style="cursor:pointer;">${section.title}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', triggerHTML);

        updateProjectVisibility(false);

        const triggerButton = document.getElementById('projects-trigger');
        triggerButton.addEventListener('click', () => {
            updateProjectVisibility(!isExpanded);
            if (!isExpanded) {
                const target = document.getElementById('projects');
                if (target) smoothScroll(target, 800);
            }
        });
    }
}

function renderIdi(section) {
    let idiSection = document.getElementById('idi');
    if (!idiSection) {
        idiSection = document.createElement('section');
        idiSection.id = 'idi';
        idiSection.role = 'contentinfo';
        document.body.appendChild(idiSection);
    }

    idiSection.innerHTML = `
        <div class="container">
            <div>
                <h2 class="text-shadow">${section.title}</h2>
                <p>${section.text}</p>
            </div>
            <div class="grid" id="idi-grid">
                ${database.idi.map((idi, index) => {
                    const hasLink = idi.link && idi.link.trim() !== "";
                    const hasModal = idi.modal && idi.sheet && idi.sheet.trim() !== "";
                    const classes = `class="card${(hasLink || hasModal) ? ' hover-shadow':''}"`;
                    const cardInner = `
                        <div ${classes}>
                            <h3>${idi.title}</h3>
                            ${idi.image ? `<img src="${resolveAsset(idi.image)}" class="idi-item-image">` : ''}
                            <p>${idi.description || ''}</p>
                            ${(hasLink && !hasModal) ? '<p>(<span>Ir al artículo</span>)</p>' : ''}
                        </div>
                    `;
                    return `
                        <div class="idi-card hover-bg" data-index="${index}">
                            ${(hasLink && !hasModal) ? `<a href="${idi.link}" target="_blank" rel="noopener noreferrer" class="nolink">${cardInner}</a>` : cardInner}
                        </div>
                    `;
                }).join('')}
            </div>
            ${database.idi.length > 3 
                ? `<div id="idi-trigger-container" style="text-align:center; margin-top: 1rem;">
                        <div id="idi-trigger" class="trigger-button card">Mostrar más</div>
                   </div>` 
                : ''}
        </div>
    `;

    const idiCards = idiSection.querySelectorAll('.idi-card');
    let isExpanded = false;

    const updateVisibility = (showAll) => {
        idiCards.forEach((card, index) => {
            card.style.display = (showAll || index < 3) ? 'block' : 'none';
        });
        const triggerButton = document.getElementById('idi-trigger');
        if (triggerButton) {
            triggerButton.textContent = showAll ? "Mostrar menos" : "Mostrar más";
        }
        isExpanded = showAll;
    };

    if (database.idi.length > 3) {
        updateVisibility(false);
        const triggerButton = document.getElementById('idi-trigger');
        triggerButton.addEventListener('click', () => {
            updateVisibility(!isExpanded);
            if (isExpanded) {
                const target = document.getElementById('idi');
                if (target) smoothScroll(target, 800);
            }
        });
    }

    idiCards.forEach(card => {
        const index = parseInt(card.getAttribute('data-index'), 10);
        const idi = database.idi[index];
        if (idi.sheet) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;

                const modalContent = `
                    <div>
                        ${renderModalImageBlock(idi.image, idi.modalImage, idi.title)}
                        ${renderParagraphs(idi.sheet)}
                        ${idi.link ? `<p>(<a href="${idi.link}" target="_blank" rel="noopener noreferrer">Ir al artículo</a>)</p>` : ''}
                    </div>
                `;
                modal(idi.title, modalContent);
            });
        }
    });
}

function renderContact(section) {
    const contactSection = document.getElementById('contact') || document.createElement('footer');
    contactSection.id = 'contact';
    contactSection.role = 'contentinfo';
    contactSection.classList.add('bg');
    if (section.background) contactSection.style.backgroundImage = `url(${resolveAsset(section.background)})`;
    if (section.font) contactSection.style.color = section.font;

    contactSection.innerHTML = `
        <div class="container">
            <a target="_blank" class='nolink' ${section.link ? `href='${section.link}'`:''}>
                <div class="icon"><i class="icofont-envelope"></i></div>
                <div class="contact-content">
                    ${section.title ? `<h2>${section.title}</h2>` : ''}
                    ${section.subtitle ? `<h3>${section.subtitle}</h3>`: ''}
                    ${section.text ? `<h3>${section.text}</h3>`: ''}
                </div>
            </a>
        </div>
    `;
    if (section.font) {
        contactSection.style.color = section.font;
    }
    if (!document.getElementById('contact')) {
        document.body.append(contactSection);
    }
}

function renderFooter(section) {
    if (!database.footer) return;

    const footerSection = document.getElementById('footer') || document.createElement('section');
    footerSection.id = 'footer';
    footerSection.role = 'contentinfo';

    footerSection.style.backgroundColor = section.background;
    footerSection.style.color = section.font;

    footerSection.innerHTML = `
        <div class="container">
            ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ''}
            <div>
                <img src="${getBasePath()}assets/img/logos/logo.png" width="auto" height="35px" alt="Insectaria" title="Insectaria" style="max-height: 60px; height: auto;aspect-ratio: 6 / 1; max-width: calc(100% - 1rem);">
            </div>
            ${section.subtitle ? `<h3>${section.subtitle}</h3>` : ''}
            ${section.text ? `<p>${section.text}</p><hl/><hr>` : ''}
            <div class="footer-list">
                ${database.footer.map(collab => `
                    <div class="footer-row">
                        ${collab.link 
                            ? `<a href="${collab.link}" target="_blank" rel="noopener noreferrer" class="nolink">`
                            : ''
                        }
                        ${collab.image 
                            ? `<img src="${resolveAsset(collab.image)}" alt="${collab.title}" class="footer-logo">`
                            : ''
                        }
                        ${collab.title
                            ? `<p class="footer-title">${collab.title || ''}</p>`
                            : ''
                        }
                        ${collab.description 
                            ? `<p class="footer-description">${collab.description}</p>`
                            : ''
                        }
                        ${collab.link ? `</a>` : ''}
                    </div>
                `).join('')}
            </div>
            
        </div>
    `;

    if (!document.getElementById('footer')) {
        document.body.append(footerSection);
    }
}

function renderModal() {
    if (document.getElementById('modal')) return;
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.role = 'modal';
    modal.classList.add('hidden');
    modal.innerHTML = `
        <div class="modal-window">
            <button class="modal-close">✖</button>
            <h2 class="modal-title text-shadow"></h2>
            <hr>
            <div class="modal-content" id="modal-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
}
function modal(title, htmlContent) {
    const modal = document.getElementById('modal');
    document.querySelectorAll('.modal-title').forEach(item => {
        item.innerHTML = title;
        applyTextShadow(item);
    });
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = htmlContent;
    modalContent.scrollTop = 0;
    modal.classList.remove('hidden');
    scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
}
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}
function applyTextShadow(el) {
    const old = el.querySelector('.text-shadow-clone');
    if (old) old.remove();
    const clone = el.cloneNode(true);
    clone.classList.remove('text-shadow');
    clone.classList.add('text-shadow-clone');
    clone.removeAttribute('id');
    el.appendChild(clone);
}

function renderSectionSummary(section) {
    const sec = document.getElementById(section.id.replace('#', '')) || document.createElement('section');
    sec.id = section.id.replace('#', '');
    const slug = (section.id || "").replace(/^#/, "").trim();
    sec.innerHTML = `
        <div class="container section-summary">
            ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ""}
            ${section.subtitle ? `<h3>${section.subtitle}</h3>` : ""}
            ${section.text ? `<p>${section.text}</p>` : ""}
            <a href="${buildDetailUrl("sections", slug)}" class="section-summary-link">Ver historia completa</a>
        </div>
    `;
    if (section.background) sec.style.backgroundColor = section.background;
    if (section.font) sec.style.color = section.font;
    if (!document.getElementById(sec.id)) document.body.append(sec);
}

function renderSections() {
    
    renderMenu();
    
    const heroData = database.sections.find(s => s.id === "#hero");
    if (heroData) renderHero(heroData);

    renderTopics();

    const where = database.sections.find(s => s.id === "#where");
    if (where) renderWhere(where);

    const aboutData = database.sections.find(s => s.id === "#about");
    if (aboutData) renderAbout(aboutData);

    const servicesData = database.sections.find(s => s.id === "#services");
    if (servicesData) renderServices(servicesData);

    const portfolio = database.sections.find(s => s.id === "#portfolio");
    if (portfolio && database.predators) renderPredators(portfolio);

    const projects = database.sections.find(s => s.id === "#projects");
    if (projects) renderProjects(projects);

    const idi = database.sections.find(s => s.id === "#i+d+i");
    if (idi) renderIdi(idi);

    const roadmap = database.sections.find(s => s.id === "#roadmap");
    if (roadmap && roadmap.page && database.roadmap) renderSectionSummary(roadmap);

    const contactData = database.sections.find(s => s.id === "#contact");
    if (contactData) renderContact(contactData);

    const footer = database.sections.find(s => s.id === "#footer");
    if (footer && database.footer) renderFooter(footer);

    document.querySelectorAll(".text-shadow").forEach(item => {
        applyTextShadow(item);
    });

    renderModal();
}

function isEnabled(dateStr, filterFutureDates = false){
    if (!dateStr || dateStr == "") return false;
    var enabled = true;
    if(filterFutureDates == true){
        const activationDate = new Date(dateStr.split('/').reverse().join('-'));
        enabled = activationDate <= new Date();
    }
    return enabled;
};

function debug(data){
    console.log("database:", data);
    document.body.innerHTML = `
        <pre id="debug"></pre>
    `;
    document.getElementById("debug").textContent = JSON.stringify(data, null, 2);
}

function cleanAppData() {
  const original = window.appData;
  if (!original) return null;
  const result = {};
  for (const key in original) {
    if (Object.prototype.hasOwnProperty.call(original, key)) {
      const value = original[key];
      if (Array.isArray(value)) {
        result[key] = value
          .filter(item => {
            return !item.hasOwnProperty('enabled') || isEnabled(item.enabled, true);
          })
          .map(item => ({ ...item }));
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

function waitForAppDataAndDOM({ timeout = 10000, interval = 20 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        function check() {
            if (document.body && window.appData !== undefined && window.appData !== null) {
                return resolve(window.appData);
            }

            if (Date.now() - start > timeout) {
                return reject(new Error("Timeout esperando DOM o database"));
            }

            setTimeout(check, interval);
        }
        check();
    });
}

// ============================================================
//  Entorno y enlaces
// ============================================================

/**
 * Devuelve "?gid=..." si estamos en entorno prototipo, "" en producción.
 * Úsalo para construir enlaces que deben mantener el entorno.
 */
function getGidSuffix() {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get("gid");
    return gid ? `?gid=${encodeURIComponent(gid)}` : "";
}

/**
 * Devuelve la ruta base relativa hasta la raíz del sitio.
 * - En el index (/, /index.html)  -> "./"
 * - En una página secundaria (/predators/foo.html) -> "../"
 * Esto permite que los mismos assets/scripts se referencien bien
 * desde cualquier profundidad.
 */
function getBasePath() {
    const depth = window.location.pathname
        .split("/")
        .filter(Boolean)
        .filter(p => !p.endsWith(".html")).length;
    return depth === 0 ? "./" : "../".repeat(depth);
}

/**
 * Construye un enlace a una página de detalle, propagando el ?gid=...
 * si procede. Ejemplo: buildDetailUrl("predators", "anthocoris-nemoralis")
 *   -> "./predators/anthocoris-nemoralis.html?gid=XXXX"
 */
function buildDetailUrl(collection, slug) {
    return `${getBasePath()}${collection}/${slug}.html${getGidSuffix()}`;
}

/**
 * Resuelve la ruta de un asset (imagen, fondo...) proveniente de los datos.
 *  - URL absoluta (http://, https://, //...)  -> tal cual
 *  - Absoluta al dominio (/foo.png)            -> tal cual
 *  - Data URI (data:...)                       -> tal cual
 *  - Relativa (assets/..., ./assets/...)       -> prefijada con getBasePath()
 * Así funciona igual desde la home y desde /collection/slug.html.
 */
function resolveAsset(path) {
    if (!path) return "";
    const p = String(path).trim();
    if (
        /^(https?:)?\/\//i.test(p) ||   // http://, https://, //
        p.startsWith("/") ||             // /ruta-absoluta
        p.startsWith("data:")            // data URI
    ) {
        return p;
    }
    // relativa: quita "./" inicial si existe y antepone la base
    return `${getBasePath()}${p.replace(/^\.\//, "")}`;
}

// ============================================================
//  Detección de página actual
// ============================================================

/**
 * Analiza la URL y devuelve:
 *  - { type: "index" }                         si es la home
 *  - { type: "detail", collection, slug }      si es una página de detalle
 */
function detectPage() {
    const path = window.location.pathname;
    // Buscamos patrón /<collection>/<slug>.html
    const match = path.match(/\/([^/]+)\/([^/]+)\.html?$/i);
    if (match) {
        const collection = match[1].toLowerCase();
        const slug = match[2].toLowerCase();
        // Sólo consideramos detalle las colecciones conocidas
        const known = ["predators", "services", "projects", "idi", "sections"];
        if (known.includes(collection)) {
            return { type: "detail", collection, slug };
        }
    }
    return { type: "index" };
}

// ============================================================
//  Render de páginas de detalle
// ============================================================

function slugify(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

function findDetailItem(collection, slug) {
    const items = database[collection];
    if (!Array.isArray(items)) return null;
    return items.find(item => {
        // Fuente de verdad: item.id (calculado al parsear los datos).
        // Fallback al slug del name/title para compatibilidad con
        // database.js antiguos que todavía no tengan el campo id.
        if (item.id) return item.id === slug;
        const key = item.name || item.title || "";
        return slugify(key) === slug;
    }) || null;
}

function renderDetailPage(collection, slug) {
    if (!document.querySelector('link[data-detail-css]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${getBasePath()}item.css`;
        link.setAttribute("data-detail-css", "");
        document.head.appendChild(link);
    }
    renderMenu();
    const item = findDetailItem(collection, slug);
    const main = document.createElement("section");
    main.id = "detail";
    main.role = "main";
    main.classList.add("detail-page");
    if (!item) {
        main.innerHTML = `
            <div class="container">
                <h2>Contenido no encontrado</h2>
                <p>No se ha encontrado información para <code>${collection}/${slug}</code>.</p>
                <p><a href="${getBasePath()}${getGidSuffix()}" class="nolink">🠈 Volver al inicio</a></p>
            </div>
        `;
        document.body.appendChild(main);
        return;
    }
    const title = item.name || item.title || "";
    const subtitle = item.state || item.subtitle || "";
    const content = item.content || "";
    const image = resolveAsset(item.image);
    document.title = `${title} · Insectaria`;
    main.innerHTML = `
        <div class="container">
            <a href="${getBasePath()}${getGidSuffix()}" class="nolink back-link">🠈 Volver</a>
            ${image ? `<div class="detail-image"><img src="${image}" alt="${title}"></div>` : ""}
            <h1 class="text-shadow"><i>${title}</i></h1>
            ${subtitle ? `<h2>${subtitle}</h2>` : ""}
            <div class="detail-content">${renderParagraphs(content)}</div>
        </div>
    `;
    document.body.appendChild(main);
    const footerData = database.sections?.find(s => s.id === "#footer");
    if (footerData && database.footer) renderFooter(footerData);
    renderModal();
    document.querySelectorAll(".text-shadow").forEach(item => {
        applyTextShadow(item);
    });
}

function renderSectionDetailPage(slug) {
    renderMenu();
    const section = database.sections?.find(s => s.id === `#${slug}`);
    const items = database[slug];
    const main = document.createElement("section");
    main.id = "section-detail";
    main.role = "main";
    if (!section || !Array.isArray(items)) {
        main.innerHTML = `
            <div class="container">
                <h2>Contenido no encontrado</h2>
                <p>No se ha encontrado la sección <code>${slug}</code>.</p>
                <p><a href="${getBasePath()}${getGidSuffix()}" class="nolink">🠈 Volver al inicio</a></p>
            </div>
        `;
        document.body.appendChild(main);
        return;
    }
    document.title = `${section.title} · Insectaria`;
    main.style.background = section.background || "";
    main.style.color = section.font || "";
    main.classList.add("detail-page");
    main.innerHTML = `
        <div class="container">
            <a href="${getBasePath()}${getGidSuffix()}" class="back-link">🠈 Volver</a>
            <h1 class="text-shadow">${section.title}</h1>
            ${section.subtitle ? `<h2>${section.subtitle}</h2>` : ""}
            ${section.text ? `<p>${section.text}</p>` : ""}
            <div class="timeline">
                ${items.map((item, i) => `
                    <div class="timeline-item ${i % 2 === 0 ? 'left' : 'right'}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-date">${item.date}</div>
                        <div class="timeline-content">
                            ${item.image ? `<img src="${resolveAsset(item.image)}" alt="${item.title}" class="timeline-image">` : ""}
                            <h3>${item.title}</h3>
                            <p>${item.text}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(main);
    const footerData = database.sections?.find(s => s.id === "#footer");
    if (footerData && database.footer) renderFooter(footerData);
    renderModal();
    document.querySelectorAll(".text-shadow").forEach(item => {
        applyTextShadow(item);
    });
}

// ============================================================
//  Carga principal
// ============================================================

async function load() {
    try{
        // 404 redirect recovery (GitHub Pages SPA support)
        let pendingDetail = null;
        const savedUrl = sessionStorage.getItem("insectaria_404");
        if (savedUrl) {
            sessionStorage.removeItem("insectaria_404");
            try {
                const url = new URL(savedUrl);
                const match = url.pathname.match(/\/([^/]+)\/([^/]+)\.html?$/i);
                if (match) {
                    const collection = match[1].toLowerCase();
                    const slug = match[2].toLowerCase();
                    const known = ["predators", "services", "projects", "idi", "sections"];
                    const hasGid = url.search && url.search.includes("gid=");
                    if (known.includes(collection) && hasGid) {
                        pendingDetail = { collection, slug, href: url.pathname + url.search };
                    }
                }
            } catch (_) {}
        }

        const rawQuery = pendingDetail
            ? pendingDetail.href.includes("?")
                ? pendingDetail.href.slice(pendingDetail.href.indexOf("?"))
                : ""
            : window.location.search;
        const gid = new URLSearchParams(rawQuery).get("gid");
        const script = document.createElement("script");
        if (gid) {
            window.APP_GID = gid;
            script.src = `${getBasePath()}prototype.js`;
        } else {
            script.src = `${getBasePath()}database.js`;
             /*
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
            document.addEventListener('selectstart', function(e) {
                e.preventDefault();
            });
            document.addEventListener('dragstart', function(e) {
                e.preventDefault();
            });
            */
        }
        document.head.appendChild(script);
        await waitForAppDataAndDOM();
        window.database = cleanAppData();
        //debug(window.database);

        if (pendingDetail) {
            window.history.replaceState(
                { type: "detail", collection: pendingDetail.collection, slug: pendingDetail.slug },
                "",
                pendingDetail.href
            );
            if (pendingDetail.collection === "sections") {
                renderSectionDetailPage(pendingDetail.slug);
            } else {
                renderDetailPage(pendingDetail.collection, pendingDetail.slug);
            }
            return;
        }

        const page = detectPage();
        if (page.type === "detail") {
            if (page.collection === "sections") {
                renderSectionDetailPage(page.slug);
            } else {
                renderDetailPage(page.collection, page.slug);
            }
        } else {
            renderSections();
            requestAnimationFrame(() => {
                if (window.location.hash) {
                    smoothScroll(window.location.hash, 1000);
                }
            });
        }
    }catch(err){
        console.error(err);
        document.body.innerHTML = `<div style="text-align:center;"><h2>Error al cargar datos, vuelve más tarde.</h2><h3>info@insectaria.com</h3></div>`;
    }
}

load();