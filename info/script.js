function getRoute() {
    const params = new URLSearchParams(window.location.search);
    let path = params.get("path") || window.location.pathname;

    path = path.replace(/^\/info/, '');

    const parts = path.split('/').filter(Boolean);

    const entity = parts[0] || null;
    const slug = parts[1] || null;

    if (entity && slug) {
        const link = document.createElement("link");
        link.rel = "canonical";
        link.href = `https://dominio.com/${entity}/${slug}`;
        document.head.appendChild(link);
    }

    return { entity, slug };
}

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

function findItem(collection, slug, fields = []) {
    if (!collection || !slug) return null;

    return collection.find(item => {
        const base = fields.map(f => item[f] || "").join(" ");
        return normalize(base) === slug;
    });
}

async function loadInfoPage() {
    try {
        await waitForAppDataAndDOM();
        window.database = cleanAppData();
        const { entity, slug } = getRoute();
        let item = null;
        switch (entity) {
            case "predators":
                item = findItem(database.predators, slug, ["name", "state"]);
                if (item) return renderPredatorPage(item);
                break;
            /*
            case "services":
                item = findItem(database.services, slug, ["title"]);
                if (item) return renderServicePage(item);
                break;

            case "projects":
                item = findItem(database.projects, slug, ["title"]);
                if (item) return renderProjectPage(item);
                break;
            */
        }
        renderNotFound();
    } catch (err) {
        console.error(err);
        renderError();
    }
}

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
        </div>
    `;
}

function cleanURL(entity, slug) {
    if (!entity || !slug) return;

    const cleanPath = `/${entity}/${slug}`;
    window.history.replaceState({}, "", cleanPath);
}

function renderPredatorPage(predator) {
    document.body.innerHTML = `
        <div class="container">
            <h1><i>${predator.name}</i> - ${predator.state}</h1>

            ${predator.image 
                ? `<img src="https://www.insectaria.com/${predator.image}" style="max-width:400px;">`
                : ""
            }

            <p>${predator.description}</p>

            ${
                predator.sheet
                ? predator.sheet.split('\n').map(p => `<p>${p}</p>`).join('')
                : ""
            }
        </div>
    `;
}

// Enlaces en web principal
//const url = `/predators/${normalize(predator.name + " " + predator.state)}`;

function loadScript(src) {
    return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => {
            console.log("Loaded:", src);
            resolve();
        };
        document.head.appendChild(s);
    });
}

async function load() {
    try {
        const params = new URLSearchParams(window.location.search);
        const gid = params.get("gid");

        if (gid) {
            window.APP_GID = gid;
            await loadScript("./prototype.js");
        } else {
            await loadScript("./database.js");
        }

        // 👉 aquí YA está cargado de verdad
        window.database = cleanAppData();

        const { entity, slug } = getRoute();

        console.log("ROUTE:", entity, slug);
        console.log("DB:", window.database);

        renderInfoPage(entity, slug);

    } catch (err) {
        console.error(err);
        document.body.innerHTML = `
            <div style="text-align:center;">
                <h2>Error al cargar datos</h2>
                <h3>info@insectaria.com</h3>
            </div>
        `;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    load();
});