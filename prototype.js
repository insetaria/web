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
            const [a, b, c, d, e, f, g] = await Promise.all([
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.menu.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.sections.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.services.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.predators.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.methodology.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.projects.gid),
                fetchGoogleSheetsCSVAsJson(ds.gid, ds.idi.gid)
            ]);
            parseData(a, b, c, d, e, f, g);
            createFloatingSaveButton(window.appData);
        } catch (e) {
            console.error("Error cargando base de datos:", e);
        }
    }
    document.dispatchEvent(new Event("appDataReady"));
}

function parseData(menu, sections, services, predators, methodology, projects, idi) {
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
            .map(x => ({
                enabled: x["Habilitado"],
                title: x["Título"],
                text: x["Texto"],
                image: x["Imagen"],
                icon: x["Icono"]
            })),
        predators: predators
            .filter(x => isEnabled(x["Habilitado"]))
            .map(x => ({
                enabled: x["Habilitado"],
                name: x["Nombre"],
                state: x["Estadio"],
                description: x["Descripción"],
                image: x["Imagen"],
                modal: String(x["Modal"] ?? "")
                    .trim()
                    .toLowerCase() === "si",
                price: x["Precio"],
                sheet: x["Ficha"],
            })),
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
            .map(x => ({
                enabled: x["Habilitado"],
                title: x["Título"],
                description: x["Descripción"]
            })),
    };
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

    btn.addEventListener("click", async () => {
        try {
            const options = {
                suggestedName: 'database.js',
                types: [{
                    description: 'JavaScript File',
                    accept: {'application/javascript': ['.js']},
                }],
            };
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(`window.appData = ${JSON.stringify(window.appData, null, 2)};`);
            await writable.write('document.dispatchEvent(new Event("appDataReady"));');
            await writable.close();
        } catch (err) {

        }
    });
    container.appendChild(btn);
    document.body.appendChild(container);
}

loadDataSheet();

const render = renderSections;

renderSections = function(){
    render();
    modal(
  "Prototipo",
  "<p><strong>Entorno de prototipado</strong></p>\
   <p> \
       Esta aplicación se encuentra en fase de validación funcional. \
       Los datos mostrados pueden no ser definitivos y podrían contener inexactitudes. \
       <strong>No debe utilizarse como referencia oficial<strong>. \
   </p>"
);
}