/*
 * Launcher shared by app.html (prod bundles) and dev/app.html (dev bundles; src/web/dev/ never
 * goes to the public Pages repo). Asset paths are absolute so it works from both.
 * The page sets window.LAUNCHER_CONFIG before loading this file:
 *   env      : "prod" | "dev" (non-prod shows a badge on the login card)
 *   clientId : Google OAuth client id, base64
 *   bundles  : Drive file ids, base64, in priority order (control panel, then client viewer).
 *              Empty strings are skipped (bundle not created yet).
 * The loaded bundle gets window.__launcher = { accessToken, clientId, env, config }.
 * config = the JSON of the "config.json" next to the bundle file in Drive (same folder), or null:
 * env data (e.g. rootFolderId) stays out of git and is readable only by whom the folder is shared with.
 */
(function() {
    var _d = atob;
    var CFG = window.LAUNCHER_CONFIG || {};
    var ENV = CFG.env || "prod";
    var CLIENT_ID = _d(CFG.clientId || "");
    var BUNDLE_IDS = (CFG.bundles || []).filter(Boolean).map(function(b) { return _d(b); });
    var SCOPES = "https://www.googleapis.com/auth/drive.readonly";
    var NO_DATA = "No hay datos registrados para tu usuario en la aplicación";
    var G_ICON = '<svg class="g-icon" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';

    var APP = document.getElementById("app");
    APP.innerHTML =
        '<div class="card" id="card">' +
            '<img src="/assets/img/logos/logo.png" alt="INSECTARIA" class="logo">' +
            (ENV !== "prod" ? '<div><span class="env-badge">' + ENV.toUpperCase() + '</span></div>' : '') +
            '<p class="sub" id="sub">Accede a la aplicación</p>' +
            '<button id="loginBtn">' + G_ICON + ' Iniciar sesión con Google</button>' +
            '<div class="loading" id="loading"><span class="spinner"></span><span id="loadingMsg">Verificando acceso...</span></div>' +
            '<div class="error" id="error"></div>' +
        '</div>';

    var CARD = document.getElementById("card");
    var LOGIN_BTN = document.getElementById("loginBtn");
    var ERROR_EL = document.getElementById("error");
    var LOADING_EL = document.getElementById("loading");
    var LOADING_MSG = document.getElementById("loadingMsg");

    function showError(m) {
        ERROR_EL.textContent = m;
        ERROR_EL.classList.add("show");
        LOADING_EL.classList.remove("show");
        LOGIN_BTN.disabled = false;
    }

    function showLoading(m) {
        LOADING_MSG.textContent = m || "Verificando acceso...";
        LOADING_EL.classList.add("show");
        LOGIN_BTN.disabled = true;
    }

    function hideLoading() {
        LOADING_EL.classList.remove("show");
        LOGIN_BTN.disabled = false;
    }

    // config.json in the bundle's own Drive folder; null if missing, ambiguous or unreadable.
    async function loadConfig(fid, token) {
        var auth = { headers: { Authorization: "Bearer " + token } };
        try {
            var m = await fetch("https://www.googleapis.com/drive/v3/files/" + fid + "?fields=parents", auth);
            var parents = m.ok ? ((await m.json()).parents || []) : [];
            if (parents.length !== 1) return null;
            var q = encodeURIComponent("'" + parents[0] + "' in parents and name = 'config.json' and trashed = false");
            var l = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id)&pageSize=2", auth);
            var files = l.ok ? ((await l.json()).files || []) : [];
            if (files.length !== 1) return null;
            var c = await fetch("https://www.googleapis.com/drive/v3/files/" + files[0].id + "?alt=media", auth);
            return c.ok ? await c.json() : null;
        } catch(e) {
            return null;
        }
    }

    async function loadBundle(fid, token) {
        CARD.style.display = "none";
        try {
            var r = await fetch("https://www.googleapis.com/drive/v3/files/" + fid + "?alt=media", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!r.ok) throw new Error();
            var code = await r.text();
            window.__launcher.config = await loadConfig(fid, token);

            document.body.innerHTML = "";
            document.body.style.cssText = "";
            document.querySelectorAll("style, link[rel=stylesheet]").forEach(function(el) { el.remove(); });

            var blob = new Blob([code], { type: "text/javascript" });
            var url = URL.createObjectURL(blob);
            var mod = await import(url);
            if (mod.initApp) await mod.initApp();
        } catch(e) {
            document.body.innerHTML = "";
            document.body.style.cssText = "display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#444;font-size:1rem;";
            document.body.textContent = NO_DATA;
        }
    }

    async function checkAccess(token) {
        showLoading("Verificando acceso...");
        try {
            for (var i = 0; i < BUNDLE_IDS.length; i++) {
                var r = await fetch("https://www.googleapis.com/drive/v3/files/" + BUNDLE_IDS[i] + "?fields=id", {
                    headers: { Authorization: "Bearer " + token }
                });
                if (r.ok) { await loadBundle(BUNDLE_IDS[i], token); return; }
            }
            hideLoading();
            showError(NO_DATA);
        } catch(e) {
            hideLoading();
            showError(NO_DATA);
        }
    }

    (async function() {
        APP.style.display = "block";

        var gsiReady = false;
        try {
            if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
                gsiReady = true;
            } else {
                await new Promise(function(resolve) {
                    var iv = setInterval(function() {
                        if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
                            clearInterval(iv);
                            gsiReady = true;
                            resolve();
                        }
                    }, 50);
                    setTimeout(function() { clearInterval(iv); resolve(); }, 15000);
                });
            }
        } catch(e) {}

        var tokenClient = null;
        if (gsiReady) {
            try {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: function(resp) {
                        if (resp.error) {
                            showError("Tu usuario no tiene acceso a la aplicación");
                            return;
                        }
                        var at = resp.access_token;
                        window.__launcher = { accessToken: at, clientId: CLIENT_ID, env: ENV };
                        localStorage.setItem("_accessToken", at);
                        localStorage.setItem("_clientId", CLIENT_ID);
                        checkAccess(at);
                    }
                });
            } catch(e) {}
        }

        LOGIN_BTN.addEventListener("click", function() {
            ERROR_EL.classList.remove("show");
            if (!tokenClient) {
                showError("Tu usuario no tiene acceso a la aplicación");
                return;
            }
            tokenClient.requestAccessToken();
        });
    })();
})();
