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
// ROUTING (404 + query support)
// ============================

function getRoute() {
    const params = new URLSearchParams(window.location.search);
    let path = params.get("path") || window.location.pathname;

    // limpia /info si viene del sistema interno
    path = path.replace(/^\/info/, '');

    const parts = path.split('/').filter(Boolean);

    const entity = parts[0] || null;
    const slug = parts[1] || null;

    // canonical SEO
    if (entity && slug) {
        const link = document.createElement("link");
        link.rel = "canonical";
        link.href = `https://insectaria.com/${entity}/${slug}`;
        document.head.appendChild(link);

        // limpia URL (opcional pero recomendable)
        window.history.replaceState({}, "", `/info/${entity}/${slug}`);
    }

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
// FINDER GENERICO
// ============================

function findItem(collection, slug, fields = []) {
    if (!collection || !slug) return null;

    return collection.find(item => {
        const base = fields.map(f => item[f] || "").join(" ");
        return normalize(base) === slug;
    });
}


// ============================
// MAIN LOADER
// ============================

function waitForAppData() {
    return new Promise((resolve, reject) => {

        console.log("[INFO] waiting appDataReady...");

        if (window.appData) {
            console.log("[INFO] appData already exists");
            return resolve(window.appData);
        }

        const timeout = setTimeout(() => {
            console.error("[ERROR] appData timeout");
            reject("appData timeout");
        }, 5000);

        document.addEventListener("appDataReady", () => {
            clearTimeout(timeout);
            console.log("[INFO] appDataReady fired");
            resolve(window.appData);
        });
    });
}

async function load() {
    try {
        const params = new URLSearchParams(window.location.search);
        const gid = params.get("gid");

        if (gid) {
            window.APP_GID = gid;
            await loadScript("/prototype.js");
        } else {
            await loadScript("/database.js");
        }

        await waitForAppData();

        window.database = cleanAppData();

        const { entity, slug } = getRoute();

        route(entity, slug);

    } catch (err) {
        console.error(err);
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


// ============================
// RENDERS
// ============================

function renderPredator(predator) {
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


// placeholder futuros
function renderService(item) {
    document.body.innerHTML = `<h1>${item.title}</h1>`;
}

function renderProject(item) {
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