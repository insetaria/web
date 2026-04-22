// ============================
// ENTRY
// ============================

window.addEventListener("DOMContentLoaded", () => {
    load();
});


// ============================
// SCRIPT LOADER
// ============================

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}


// ============================
// ROUTING
// ============================

function getRoute() {

    let rawPath = null;

    // 1. PRIORIDAD: query param del 404 hack
    const params = new URLSearchParams(window.location.search);
    const qPath = params.get("path");

    if (qPath) {
        rawPath = qPath;
    } else {
        rawPath = window.location.pathname;
    }

    // 2. limpiar base /info
    rawPath = rawPath.replace(/^\/info/, '');

    // 3. limpiar query residual
    rawPath = rawPath.split('?')[0];

    // 4. normalizar slashes
    rawPath = rawPath.replace(/\/+/g, '/');

    const parts = rawPath.split('/').filter(Boolean);

    const entity = parts[0] || null;
    const slug = parts[1] || null;

    // 5. canonical correcto
    if (entity && slug) {
        const canonical = document.createElement("link");
        canonical.rel = "canonical";
        canonical.href = `https://insectaria.com/${entity}/${slug}`;
        document.head.appendChild(canonical);
    }

    console.log("[ROUTE DEBUG]", { rawPath, entity, slug });

    return { entity, slug };
}


// ============================
// NORMALIZER
// ============================

function normalize(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}


// ============================
// FINDER
// ============================

function findItem(collection, slug, fields = []) {
    if (!collection || !slug) return null;

    const slugNorm = normalize(slug);
    const slugTokens = slugNorm.split('-');

    let bestMatch = null;
    let bestScore = -1;

    for (const item of collection) {

        const base = fields.map(f => item[f] || "").join(" ");
        const itemNorm = normalize(base);

        // 1. MATCH EXACTO (prioridad máxima)
        if (itemNorm === slugNorm) {
            return item;
        }

        const itemTokens = itemNorm.split('-');

        // 2. calcular coincidencias de tokens
        let score = 0;

        for (const token of slugTokens) {
            if (itemTokens.includes(token)) {
                score++;
            }
        }

        // 3. penalización suave por tamaño (evita matches raros)
        const lengthDiff = Math.abs(itemTokens.length - slugTokens.length);
        score -= lengthDiff * 0.1;

        // 4. guardar mejor match
        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    }

    // 5. umbral mínimo (evita falsos positivos)
    if (bestScore > 0) {
        return bestMatch;
    }

    return null;
}


// ============================
// WAIT APP DATA (FIX REAL)
// ============================

function waitForAppData() {
    return new Promise((resolve, reject) => {

        if (window.appData) {
            return resolve(window.appData);
        }

        let done = false;

        const timeout = setTimeout(() => {
            if (done) return;
            console.error("[ERROR] appData timeout");
            reject("appData timeout");
        }, 5000);

        const handler = () => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            document.removeEventListener("appDataReady", handler);
            resolve(window.appData);
        };

        document.addEventListener("appDataReady", handler, { once: true });
    });
}


// ============================
// LOAD
// ============================

function extractGidFromRawPath(rawPath) {
    if (!rawPath) return null;

    const decoded = decodeURIComponent(rawPath);

    const match = decoded.match(/[?&]gid=([^&]+)/);
    return match ? match[1] : null;
}

async function load() {
    try {

        const params = new URLSearchParams(window.location.search);

        const rawPath = params.get("path") || "";

        // ============================
        // 🔥 FIX CRÍTICO: EXTRAER GID
        // ============================

        let gid = params.get("gid");

        if (!gid && rawPath) {
            const decoded = decodeURIComponent(rawPath);
            const match = decoded.match(/[?&]gid=([^&]+)/);
            if (match) gid = match[1];
        }

        console.log("[LOAD DEBUG]", {
            gid,
            rawPath,
            search: window.location.search
        });

        // ============================
        // ENV LOAD
        // ============================

        if (gid) {
            window.APP_GID = gid;
            await loadScript("/prototype.js");
        } else {
            await loadScript("/database.js");
        }

        // ============================
        // WAIT DB
        // ============================

        await waitForAppData();

        if (!window.appData) {
            throw new Error("appData no disponible");
        }

        window.database = cleanAppData();

        // ============================
        // ROUTE
        // ============================

        const { entity, slug } = getRoute();

        console.log("[ROUTE]", { entity, slug });

        if (!entity || !slug) {
            return renderNotFound();
        }

        route(entity, slug);

        cleanURL(entity, slug, window.APP_GID);

    } catch (err) {
        console.error("[LOAD ERROR]", err);
        renderError();
    }
}


// ============================
// ROUTER
// ============================

function route(entity, slug) {
    let item = null;

    switch (entity) {

        case "predators":
            item = findItem(database.predators, slug, ["name", "state"]);
            if (item) return renderPredator(item);
            break;

        case "services":
            item = findItem(database.services, slug, ["title"]);
            if (item) return renderService(item);
            break;

        case "projects":
            item = findItem(database.projects, slug, ["title"]);
            if (item) return renderProject(item);
            break;

        default:
            return renderNotFound();
    }

    renderNotFound();
}

function cleanURL(entity, slug, gid = null) {
    if (!entity || !slug) return;
    let url = `/${entity}/${slug}`;
    if (gid) {
        url += `?gid=${gid}`;
    }
    window.history.replaceState({}, "", url);
}


// ============================
// RENDERS (SAFE)
// ============================

function renderPredator(predator) {
    if (!predator) return renderNotFound();

    document.body.innerHTML = `
        <div class="container">
            <h1><i>${predator.name}</i> - ${predator.state}</h1>

            ${predator.image ? `
                <img src="https://www.insectaria.com/${predator.image}" style="max-width:400px;">
            ` : ""}

            <p>${predator.description || ""}</p>

            ${predator.sheet
                ? predator.sheet.split('\n').map(p => `<p>${p}</p>`).join('')
                : ""
            }
        </div>
    `;
}

function renderService(item) {
    if (!item) return renderNotFound();
    document.body.innerHTML = `<h1>${item.title}</h1>`;
}

function renderProject(item) {
    if (!item) return renderNotFound();
    document.body.innerHTML = `<h1>${item.title}</h1>`;
}


// ============================
// FALLBACKS
// ============================

function renderNotFound() {
    document.body.innerHTML = `
        <div style="text-align:center">
            <h2>Contenido no encontrado</h2>
            <a href="/">Volver al inicio</a>
        </div>
    `;
}

function renderError() {
    document.body.innerHTML = `
        <div style="text-align:center">
            <h2>Error cargando contenido</h2>
            <p>info@insectaria.com</p>
        </div>
    `;
}


// ============================
// UTILITIES (FIXED)
// ============================

function isEnabled(dateStr, filterFutureDates = false){
    if (!dateStr) return false;

    let enabled = true;

    if (filterFutureDates) {
        const activationDate = new Date(dateStr.split('/').reverse().join('-'));
        enabled = activationDate <= new Date();
    }

    return enabled;
}


// ============================
// CLEAN DATA
// ============================

function cleanAppData() {
    const original = window.appData;
    if (!original) return null;

    const result = {};

    for (const key in original) {
        const value = original[key];

        if (Array.isArray(value)) {
            result[key] = value
                .filter(item => !item?.enabled || isEnabled(item.enabled, true))
                .map(item => ({ ...item }));
        } else {
            result[key] = value;
        }
    }

    return result;
}