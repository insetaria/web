const HASH = "e5f30be69502a1f65f37f7c6a8e644b2b6bbad06864371edfde298174d2a8156";

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function buildDataStructure() {
    let ds = null;
    const hash2 = await sha256(window.APP_GID);
    if(hash2 == HASH){
        const configRows = await fetchGoogleSheetsCSVAsJson(window.APP_GID);
        ds = {
            gid: window.APP_GID
        };
        configRows.forEach(row => {
            const name = row.Nombre?.trim();
            const gid = row.GID?.trim();

            if (name && gid) {
                ds[name] = { gid };
            }
        });
    }
    return ds;
}

async function fetchFileContent(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

function parseCSV(csv) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];
        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && csv[i + 1] === '\n') i++;
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }
    if (current !== '' || row.length > 0) {
        row.push(current);
        rows.push(row);
    }
    return rows.map(r => r.map(c => c.trim()));
}

async function fetchGoogleSheetsCSV(sheetId, sheetGID) {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGID}`;
    const csv = await fetchFileContent(targetUrl);
    return parseCSV(csv);
}

async function fetchGoogleSheetsCSVAsJson(sheetId, sheetGID = 0) {
    const array2D = await fetchGoogleSheetsCSV(sheetId, sheetGID);
    if (!array2D || array2D.length < 2) {
        return [];
    }
    const [headers, ...rows] = array2D;
    return rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] ?? "";
        });
        return obj;
    });
}

async function loadDataSheet() {
    const ds = await buildDataStructure();
    if(ds){
        try {
            const [a, b, c, d, e, f, g, h] = await Promise.all([
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.menu.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.sections.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.services.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.predators.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.methodology.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.projects.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.idi.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.footer.gid),
            ]);
            parseData(a, b, c, d, e, f, g, h);
            createFloatingSaveButton(window.appData);
        } catch (e) {
            console.error("Error cargando base de datos:", e);
        }
    }
    document.dispatchEvent(new Event("appDataReady"));
}

function parseData(menu, sections, services, predators, methodology, projects, idi, footer) {
    window.appData = {
        menu: menu
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                text: x["Texto"],
                link: x["Enlace"],
            })),
        sections: sections
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                internal: x["Descripción interna"],
                title: x["Título"],
                subtitle: x["Subtítulo"],
                text: x["Texto"],
                background: x["Fondo"],
                font: x["Fuente"],
                link: x["Enlace"],
                id: x["Clave"]
            })),
        methodology: methodology
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                icon: x["Icono"],
                text: x["Texto"]
            })),
        services: services
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => {
                const hasModal = String(x["Modal"] ?? "").trim().toLowerCase() === "si";
                return {
                    enabled: x["Habilitado"],
                    title: x["Título"],
                    text: x["Texto"],
                    image: x["Imagen"],
                    icon: x["Icono"],
                    modal: hasModal,
                    modalImage: hasModal ? (x["ImagenModal"] ?? "") : "",
                    sheet: hasModal ? (x["Ficha"] ?? "") : "",
                }
            }),
        predators: predators
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => {
                const hasModal = String(x["Modal"] ?? "").trim().toLowerCase() === "si";
                const hasPage = String(x["Página"] ?? "").trim().toLowerCase() === "si";
                return {
                    enabled: x["Habilitado"],
                    name: x["Nombre"],
                    state: x["Estadio"],
                    description: x["Descripción"],
                    image: x["Imagen"],
                    modal: hasModal,
                    price: hasModal ? (x["Precio"] ?? "") : "", 
                    sheet: hasModal ? (x["Ficha"] ?? "") : "",
                    page: hasPage,
                    content: hasPage ? (x["Contenido"] ?? "") : "" 
                };
            }),
        projects : projects
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                title: x["Título"],
                description: x["Descripción"],
                link: x["Enlace"]
            })),
        idi : idi
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => {
                const hasModal = String(x["Modal"] ?? "").trim().toLowerCase() === "si";
                return {
                    enabled: x["Habilitado"],
                    title: x["Título"],
                    description: x["Descripción"],
                    image: x["Imagen"],
                    background: x["Fondo"],
                    link: x["Enlace"],
                    modal: hasModal ? (x["Ficha"] ?? "") : "",
                    sheet: x["Ficha"]
                };
            }),
        footer: footer
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                title: x["Título"],
                image: x["Imagen"],
                description: x["Descripción"],
                link: x["Enlace"]
            }))
    };

    // Asignar un `id` único por colección. Este id se usa como slug en las
    // URLs de detalle (/<collection>/<id>.html) y como clave para emparejar
    // URL -> item en findDetailItem. Se construye aquí, en la capa de
    // parseo, para que al exportar el ZIP el `database.js` resultante ya
    // contenga el campo `id` y producción no tenga que recalcular nada.
    assignCollectionIds("predators", window.appData.predators);
    assignCollectionIds("services", window.appData.services);
    assignCollectionIds("projects", window.appData.projects);
    assignCollectionIds("idi", window.appData.idi);
}

/**
 * Regla de composición del id por colección.
 * Si quieres cambiar cómo se genera el id de una colección, es aquí.
 */
function computeId(collection, item) {
    let raw = "";
    switch (collection) {
        case "predators":
            // name + state -> "anthocoris-nemoralis-adulto"
            raw = `${item.name || ""} ${item.state || ""}`;
            break;
        case "services":
        case "projects":
        case "idi":
            raw = item.title || item.name || "";
            break;
        default:
            raw = item.name || item.title || "";
    }
    return normalizeStatic(raw);
}

/**
 * Asigna item.id a cada elemento del array, garantizando unicidad.
 * Si detecta colisión, añade sufijo numérico y avisa por consola para
 * que el editor de la hoja se entere de que tiene filas que chocan.
 */
function assignCollectionIds(collection, items) {
    if (!Array.isArray(items)) return;
    const seen = new Map(); // id base -> cuántas veces lo hemos visto
    items.forEach(item => {
        const base = computeId(collection, item);
        if (!base) {
            console.warn(`[ids] item sin id en "${collection}":`, item);
            item.id = "";
            return;
        }
        const count = seen.get(base) || 0;
        if (count === 0) {
            item.id = base;
        } else {
            item.id = `${base}-${count + 1}`;
            console.warn(
                `[ids] colisión en "${collection}": el id "${base}" ya existe. ` +
                `Asignado "${item.id}". Revisa la hoja para asegurar unicidad.`
            );
        }
        seen.set(base, count + 1);
    });
}

function createFloatingSaveButton(appData) {
    const container = document.createElement("div");
    Object.assign(container.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "120px",
        height: "120px",
        zIndex: "999998",
        pointerEvents: "auto"
    });
    const btn = document.createElement("button");
    btn.innerText = "💾";

    Object.assign(btn.style, {
        position: "absolute",
        bottom: "10px",
        left: "10px",
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        border: "none",
        background: "#222",
        color: "#fff",
        fontSize: "24px",
        cursor: "pointer",
        opacity: "0",
        transition: "opacity 0.25s, transform 0.15s",
        zIndex: "999999"
    });

    container.addEventListener("mouseenter", () => {
        btn.style.opacity = "1";
    });

    container.addEventListener("mouseleave", () => {
        btn.style.opacity = "0";
    });

    btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.1)";
    });

    btn.addEventListener("mouseleave", () => {
        btn.style.transform = "scale(1)";
    });

    btn.addEventListener("click", () => {
        handleCompleteExport();
    });
    container.appendChild(btn);
    document.body.appendChild(container);
}

async function ensureJSZip() {
    if (window.JSZip) return;

    await loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
}

function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day}_${hours}.${minutes}.${seconds}`;
}

async function handleCompleteExport() {
    try {
        await ensureJSZip();
        const zip = new JSZip();
        const databaseContent = `window.appData = ${JSON.stringify(window.appData, null, 2)};\ndocument.dispatchEvent(new Event("appDataReady"));`;
        
        zip.file("database.js", databaseContent);
        console.log("[ZIP] añadido: database.js");

        const collections = [
            { key: "predators", basePath: "predators" },
            { key: "services", basePath: "services" },
            { key: "projects", basePath: "projects" }
        ];

        for (const col of collections) {
            const items = window.appData[col.key];
            if (!items) continue;

            for (const item of items) {
                // Si el item declara "page", se respeta; si no, basta con tener content.
                const hasPage = item.hasOwnProperty("page") ? item.page === true : true;
                const hasContent = item.content && item.content.trim().length > 0;

                if (!hasPage || !hasContent) continue;

                // El id se calcula al parsear los datos (en parseData) y
                // es la única fuente de verdad para el slug del fichero.
                // Fallback por seguridad si un item antiguo no lo tuviese.
                const slug = item.id || normalizeStatic(item.name || item.title || "");
                if (!slug) continue;

                const html = generateStaticHTML(col.key, item);

                zip.file(
                    `${col.basePath}/${slug}.html`,
                    html
                );

                console.log(`[ZIP] añadido: ${col.basePath}/${slug}.html`);
            }
        }

        console.log("[ZIP] generando archivo...");

        const timestamp = getFormattedTimestamp();
        const filename = `insectaria-${timestamp}.zip`;

        const blob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 6
            }
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);

        console.log(`[ZIP] descargado: ${filename}`);

    } catch (err) {
        console.error("[EXPORT ZIP] error:", err);
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function downloadFile(filename, content, mime = "text/html") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    // 👇 CLAVE: retrasar revoke
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

function normalizeStatic(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

/**
 * Genera una plantilla HTML "vacía" para una página secundaria.
 * Es esencialmente un clon del index.html de la raíz: el renderizado
 * lo hará el propio script.js al detectar la URL (pathname) y cargar
 * database.js o prototype.js según corresponda.
 *
 * Usa rutas con "../" porque la página vive en /<collection>/slug.html
 * (un nivel por debajo de la raíz).
 */
function generateStaticHTML(type, item) {
    const title = item.name || item.title || "";
    const description = (item.description || "").replace(/"/g, "&quot;");
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="../assets/img/logos/icon.png" rel="icon">
    <meta name="theme-color" content="#4CAF50">

    <title>${title} · Insectaria</title>
    <meta name="author" content="insectaria.com">
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="../assets/img/logos/icon.png">

    <script src="../script.js"></script>
    <link rel="stylesheet" href="../assets/vendor/icofont/icofont.min.css">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
</body>
</html>`;
}

loadDataSheet();

const prototypeModal = () => modal(
    "Prototipo",
    "<p><strong>Entorno de prototipado</strong></p>\
     <p> \
         Esta aplicación se encuentra en fase de validación funcional. \
         Los datos mostrados pueden no ser definitivos y podrían contener inexactitudes. \
         <strong>No debe utilizarse como referencia oficial<strong>. \
     </p>"
);

const render = renderSections;
renderSections = function(){
    render();
    prototypeModal();
}

const renderDetail = renderDetailPage;
renderDetailPage = function(collection, slug){
    renderDetail(collection, slug);
    prototypeModal();
    // En modo prototipo, el "← Volver" no debe recargar una página que no
    // existe todavía: lo redirigimos a history.back() para que use el SPA.
    const backLink = document.querySelector(".detail-page .back-link");
    if (backLink) {
        backLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Fallback: si entró directo a /predators/xxx.html?gid=...
                // y no hay historial, simulamos un "ir al index".
                const target = `${getBasePath()}${getGidSuffix()}`;
                window.history.pushState({ type: "index" }, "", target);
                navigateSPA({ type: "index" });
            }
        });
    }
}

// ============================================================
//  Navegación SPA (solo en modo prototipo)
//  Las páginas de detalle (/predators/xxx.html, /services/...,
//  /projects/..., /idi/...) no existen físicamente hasta que se
//  exporta el ZIP con el botón 💾. Para poder navegar a ellas en
//  prototipo interceptamos window.open y pintamos el detalle en
//  la misma URL sin recargar.
// ============================================================

const KNOWN_DETAIL_COLLECTIONS = ["predators", "services", "projects", "idi"];

/**
 * Si la URL apunta a /<collection>/<slug>.html (opcional ?gid=...),
 * devuelve { collection, slug }. Si no, null.
 * Acepta rutas relativas ("./predators/foo.html") o absolutas.
 */
function parseDetailUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url, window.location.href);
        const match = u.pathname.match(/\/([^/]+)\/([^/]+)\.html?$/i);
        if (!match) return null;
        const collection = match[1].toLowerCase();
        const slug = match[2].toLowerCase();
        if (!KNOWN_DETAIL_COLLECTIONS.includes(collection)) return null;
        return { collection, slug, href: u.pathname + u.search };
    } catch (_e) {
        return null;
    }
}

/**
 * Limpia el body antes de repintar (secciones, footer, modal...).
 * Respeta cualquier cosa que no sea contenido generado por los renders.
 */
function clearRenderedBody() {
    document.body
        .querySelectorAll("section, footer, #modal, #menu")
        .forEach(el => el.remove());
    // Resetea el CSS inyectado para el detalle, porque al volver a la
    // home no estorba pero tampoco lo queremos duplicado al ir a otro.
}

/**
 * Renderiza la vista correspondiente a un "page" detectado.
 */
function navigateSPA(page) {
    clearRenderedBody();
    window.scrollTo(0, 0);
    if (page.type === "detail") {
        renderDetailPage(page.collection, page.slug);
    } else {
        renderSections();
    }
}

// 1) Interceptar window.open para URLs de detalle
const originalWindowOpen = window.open.bind(window);
window.open = function (url, target, features) {
    const detail = parseDetailUrl(url);
    if (detail) {
        // Pushea la URL "como si" hubiéramos navegado y pinta el detalle.
        window.history.pushState(
            { type: "detail", collection: detail.collection, slug: detail.slug },
            "",
            detail.href
        );
        navigateSPA({ type: "detail", collection: detail.collection, slug: detail.slug });
        return null;
    }
    return originalWindowOpen(url, target, features);
};

// 2) Botón atrás/adelante del navegador
window.addEventListener("popstate", () => {
    navigateSPA(detectPage());
});