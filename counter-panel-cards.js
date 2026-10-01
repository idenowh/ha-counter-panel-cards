/**
 * Counter Panel cards for Home Assistant
 *
 * A matching set of dashboard cards for a wall-mounted kitchen panel:
 *   counter-header-card     clock, date, indoor temperature, alarm status
 *   counter-cameras-card    camera tiles with LIVE / MOTION / RING badges
 *   counter-calendar-card   merged agenda from several calendars, one colour each
 *   counter-meals-card      Monday–Sunday meal strip from a "meals" calendar
 *   counter-shopping-card   a to-do list you can tick off from the panel
 *   counter-weather-card    current weather, 3-day outlook, optional scores below
 *   counter-controls-card   thermostats, locks, garage, door sensors, lights, media
 *
 * Colours come from the active theme (with Counter Panel defaults), so seasonal
 * themes carry through. No build step, no dependencies. MIT licence.
 */

const CP_VERSION = "0.1.0";

/* ------------------------------------------------------------------ helpers */

const cpEsc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const cpColor = (c) => {
  if (!c || typeof c !== "string") return "";
  if (/^var\(--[\w-]+\)$/.test(c)) return c;
  const hex = c.replace(/^#/, "");
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? `#${hex}` : "";
};

const cpPad = (n) => String(n).padStart(2, "0");
const cpDayKey = (d) => `${d.getFullYear()}-${cpPad(d.getMonth() + 1)}-${cpPad(d.getDate())}`;
const cpStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const cpAddDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const cpTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function cpAgo(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function cpSince(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = cpDayKey(new Date()) === cpDayKey(d);
  return `Since ${today ? cpTime(d) : d.toLocaleDateString([], { month: "numeric", day: "numeric" }) + " " + cpTime(d)}`;
}

function cpLoadFonts() {
  if (document.getElementById("counter-panel-fonts")) return;
  const link = document.createElement("link");
  link.id = "counter-panel-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Work+Sans:wght@400;500;600&display=swap";
  document.head.appendChild(link);
}

const CP_ICONS = {
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="3.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  meals: '<path d="M7 2v7a2 2 0 0 0 2 2v11M7 2v7M10 2v7M15 2c-1.6 2.2-1.6 6.4 0 9v11"/>',
  list: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 12l3 3 7-7"/>',
  thermostat: '<path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0z"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 .9 1.1 1.6h4.8c.1-.7.5-1.15 1.1-1.6A6 6 0 0 0 12 3z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
  garage: '<path d="M3 10l9-6 9 6v10H3V10z"/><path d="M3 10h18M8 20v-6h8v6"/>',
  door: '<rect x="5" y="3" width="12" height="18" rx="1"/><circle cx="14" cy="12" r="1" fill="currentColor" stroke="none"/>',
  doorOpen: '<path d="M5 21V3h12v18"/><path d="M5 3l8 2.5v17L5 21"/><circle cx="11" cy="12.5" r="1" fill="currentColor" stroke="none"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  power: '<path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/><path d="M10 15h4v2h-4zM9 21h6M11 17v4"/>',
  sunny: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  night: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
  partly: '<circle cx="9" cy="8" r="3"/><path d="M9 2.5v1.3M3.3 8h1.3M5.2 4.2l.9.9M12.9 4.2l-.9.9"/><path d="M8 20h9a3.5 3.5 0 0 0 .4-7A4.5 4.5 0 0 0 9.2 11.6 3.2 3.2 0 0 0 8 20z"/>',
  cloudy: '<path d="M7 19h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 10a4.5 4.5 0 0 0 0 9z"/>',
  rainy: '<path d="M7 15h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 6a4.5 4.5 0 0 0 0 9z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
  snowy: '<path d="M7 15h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 6a4.5 4.5 0 0 0 0 9z"/><path d="M8 19h.01M12 20h.01M16 19h.01M10 22h.01M14 22h.01" stroke-width="2.5"/>',
  lightning: '<path d="M7 15h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 6a4.5 4.5 0 0 0 0 9z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
  fog: '<path d="M4 9h16M6 13h12M4 17h16M8 21h8"/>',
  windy: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
};

const cpIcon = (name, size = 16, color = "currentColor", width = 1.8) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${cpEsc(color)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CP_ICONS[name] || ""}</svg>`;

const CP_WEATHER = {
  "clear-night": ["night", "Clear"], cloudy: ["cloudy", "Cloudy"], exceptional: ["cloudy", "Unusual weather"],
  fog: ["fog", "Fog"], hail: ["snowy", "Hail"], lightning: ["lightning", "Lightning"],
  "lightning-rainy": ["lightning", "Thunderstorms"], partlycloudy: ["partly", "Partly cloudy"],
  pouring: ["rainy", "Pouring"], rainy: ["rainy", "Rain"], snowy: ["snowy", "Snow"],
  "snowy-rainy": ["snowy", "Sleet"], sunny: ["sunny", "Sunny"], windy: ["windy", "Windy"],
  "windy-variant": ["windy", "Windy"],
};

/* Shared look. Every colour falls back to the Counter Panel palette. */
const CP_BASE = `
  :host {
    display: block;
    --_panel: var(--cp-panel, var(--ha-card-background, var(--card-background-color, #242220)));
    --_line: var(--cp-line, var(--divider-color, #3A362F));
    --_rule: var(--cp-rule, rgba(127,127,127,0.16));
    --_tile: var(--cp-tile, rgba(0,0,0,0.18));
    --_text: var(--primary-text-color, #F1ECE4);
    --_dim: var(--secondary-text-color, #9C9488);
    --_faint: var(--cp-faint, #635D53);
    --_accent: var(--primary-color, #C97A46);
    --_sage: var(--cp-sage, #7FA07A);
    --_amber: var(--cp-amber, #D9A441);
    --_red: var(--cp-red, #D2645A);
    --_blue: var(--cp-blue, #6C93AD);
    --_display: var(--cp-font-display, "Barlow Condensed", "Arial Narrow", sans-serif);
    --_body: var(--cp-font-body, "Work Sans", system-ui, sans-serif);
    --_mono: var(--cp-font-mono, "IBM Plex Mono", ui-monospace, Menlo, monospace);
  }
  ha-card {
    background: var(--_panel); border: 1px solid var(--_line); border-radius: 16px;
    box-shadow: none; color: var(--_text); font-family: var(--_body);
    padding: 18px; box-sizing: border-box; overflow: hidden; height: 100%;
  }
  ha-card.bare { background: transparent; border: none; padding: 4px 2px; }
  .label { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .label .t {
    font-family: var(--_display); font-size: 13px; font-weight: 600;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--_dim);
  }
  .label .n { font-size: 12px; color: var(--_faint); }
  .label .r { margin-left: auto; }
  .mono { font-family: var(--_mono); font-variant-numeric: tabular-nums; }
  .ic { flex: none; display: block; }
  .warn { color: var(--_red); font-size: 12px; padding: 4px 0; }
  .empty { color: var(--_dim); font-size: 13px; padding: 6px 0; }
  .tap { cursor: pointer; }
  .tap:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; border-radius: 10px; }
  button { font: inherit; color: inherit; background: none; border: none; padding: 0; margin: 0; text-align: inherit; }
`;

/* ---------------------------------------------------------------- base card */

class CounterBase extends HTMLElement {
  setConfig(config) {
    this._config = this.validate({ ...(config || {}) });
    this._sig = null;
    if (this._config.fonts !== false) cpLoadFonts();
    this._queue();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const sig = this.signature(hass);
    if (first || sig !== this._sig) {
      this._sig = sig;
      this._queue();
    }
    this.hassChanged?.(first);
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this.tick && !this._tickTimer) this._tickTimer = setInterval(() => this.tick(), this.tickMs || 30000);
    this.connected?.();
  }

  disconnectedCallback() {
    clearInterval(this._tickTimer);
    this._tickTimer = null;
    this.disconnected?.();
  }

  validate(c) { return c; }
  entities() { return []; }
  signature(hass) {
    return this.entities().map((id) => {
      const s = hass.states[id];
      return s ? `${s.state}@${s.last_updated}` : "-";
    }).join("|");
  }

  getCardSize() { return 3; }

  _queue() {
    if (this._pending) return;
    this._pending = true;
    Promise.resolve().then(() => {
      this._pending = false;
      if (this._config && this._hass) this._draw();
    });
  }

  _draw() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CP_BASE}${this.styles?.() || ""}</style>${this.render()}`;
    this.afterRender?.();
  }

  state(id) { return id ? this._hass?.states[id] : undefined; }
  name(id, fallback) {
    const s = this.state(id);
    return fallback || s?.attributes?.friendly_name || id || "";
  }

  moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
  }

  navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  handleAction(action, fallbackEntity) {
    const a = action || { action: "more-info" };
    if (a.action === "navigate" && a.navigation_path) this.navigate(a.navigation_path);
    else if (a.action === "more-info") this.moreInfo(a.entity || fallbackEntity);
    else if (a.action === "toggle") this._hass.callService("homeassistant", "toggle", {}, { entity_id: a.entity || fallbackEntity });
    else if (a.action === "url" && a.url_path) window.open(a.url_path, "_blank", "noopener");
  }

  /** Make every [data-act] element clickable / keyboard-activatable. */
  bindActions(handler) {
    this.shadowRoot.querySelectorAll("[data-act]").forEach((el) => {
      el.addEventListener("click", (ev) => { ev.stopPropagation(); handler(el.dataset.act, el); });
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); handler(el.dataset.act, el); }
      });
    });
  }
}

/* ------------------------------------------------------------- header card */

class CounterHeaderCard extends CounterBase {
  static getStubConfig() { return { subtitle: "Kitchen · Counter Panel" }; }
  tickMs = 10000;
  tick() { this._draw(); }
  validate(c) { return c; }
  entities() { return [this._config.temperature_entity, this._config.alarm_entity].filter(Boolean); }
  getCardSize() { return 1; }

  styles() {
    return `
      .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .when { display: flex; align-items: baseline; gap: 18px; min-width: 0; }
      .clock { font-family: var(--_mono); font-size: 34px; font-weight: 500; letter-spacing: .5px; }
      .date { font-family: var(--_display); font-size: 15px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
      .sub { font-family: var(--_display); font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--_dim); margin-top: 2px; }
      .pills { display: flex; gap: 10px; flex-wrap: wrap; }
      .pill {
        display: flex; align-items: center; gap: 9px; padding: 10px 16px; border-radius: 10px;
        background: var(--_panel); border: 1px solid var(--_line);
      }
      .pill .v { font-family: var(--_mono); font-size: 16px; }
      .pill .k { font-size: 12px; color: var(--_dim); }
      .pill.alarm { font-family: var(--_display); font-size: 14px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; }
    `;
  }

  _temp() {
    const id = this._config.temperature_entity;
    const s = this.state(id);
    if (!s) return null;
    const a = s.attributes || {};
    const raw = id.startsWith("climate.") ? a.current_temperature : s.state;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const unit = a.unit_of_measurement || this._hass.config?.unit_system?.temperature || "°";
    return `${Math.round(n)}${unit.startsWith("°") ? unit : "°"}`;
  }

  _alarm() {
    const id = this._config.alarm_entity;
    const s = this.state(id);
    if (!s) return null;
    const map = {
      armed_away: ["Armed · Away", "--_sage"], armed_home: ["Armed · Home", "--_sage"],
      armed_night: ["Armed · Night", "--_sage"], armed_vacation: ["Armed · Vacation", "--_sage"],
      armed_custom_bypass: ["Armed", "--_sage"], disarmed: ["Disarmed", "--_amber"],
      arming: ["Arming…", "--_amber"], pending: ["Pending…", "--_amber"],
      triggered: ["Triggered", "--_red"], unavailable: ["Alarm offline", "--_faint"],
    };
    const [text, color] = map[s.state] || [s.state, "--_dim"];
    return { text, color };
  }

  render() {
    const c = this._config;
    const now = new Date();
    const temp = this._temp();
    const alarm = this._alarm();
    const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const tempPill = temp
      ? `<div class="pill tap" tabindex="0" role="button" data-act="temp">${cpIcon("thermostat", 18, "var(--_amber)")}<span class="v">${cpEsc(temp)}</span><span class="k">${cpEsc(c.temperature_label || "Indoors")}</span></div>`
      : "";
    const alarmPill = alarm
      ? `<div class="pill alarm tap" tabindex="0" role="button" data-act="alarm"
           style="color: var(${alarm.color}); border-color: color-mix(in srgb, var(${alarm.color}) 45%, transparent);
                  background: color-mix(in srgb, var(${alarm.color}) 12%, transparent);">
           ${cpIcon("shield", 16, `var(${alarm.color})`)}<span>${cpEsc(alarm.text)}</span></div>`
      : "";
    return `<ha-card class="bare"><div class="wrap">
      <div class="when">
        <div class="clock">${cpEsc(cpTime(now))}</div>
        <div><div class="date">${cpEsc(date)}</div>${c.subtitle ? `<div class="sub">${cpEsc(c.subtitle)}</div>` : ""}</div>
      </div>
      <div class="pills">${tempPill}${alarmPill}</div>
    </div></ha-card>`;
  }

  afterRender() {
    this.bindActions((act) => this.moreInfo(act === "temp" ? this._config.temperature_entity : this._config.alarm_entity));
  }
}

/* ------------------------------------------------------------ cameras card */

class CounterCamerasCard extends CounterBase {
  static getStubConfig(hass) {
    const cams = Object.keys(hass?.states || {}).filter((id) => id.startsWith("camera.")).slice(0, 4);
    return { cameras: cams.map((entity) => ({ entity })) };
  }
  tickMs = 10000;

  validate(c) {
    if (!Array.isArray(c.cameras) || !c.cameras.length) throw new Error("Add at least one camera under 'cameras'");
    c.cameras = c.cameras.map((x) => (typeof x === "string" ? { entity: x } : x));
    c.title = c.title ?? "Security";
    c.recent_minutes = c.recent_minutes ?? 5;
    this.tickMs = Math.max(2, Number(c.refresh) || 10) * 1000;
    return c;
  }

  entities() {
    return this._config.cameras.flatMap((c) => [c.entity, c.motion, c.ring]).filter(Boolean);
  }

  // The camera image URL carries a rotating access token, so only re-render when
  // states change; refresh the pictures on a timer instead.
  signature(hass) {
    return this.entities().map((id) => {
      const s = hass.states[id];
      return s ? (id.startsWith("camera.") ? s.state : `${s.state}@${s.last_changed}`) : "-";
    }).join("|") + `|${Math.floor(Date.now() / 60000)}`;
  }

  tick() {
    this.shadowRoot?.querySelectorAll("img[data-cam]").forEach((img) => {
      const url = this._imageUrl(img.dataset.cam);
      if (url) img.src = url;
    });
  }

  _imageUrl(id) {
    const pic = this.state(id)?.attributes?.entity_picture;
    if (!pic) return "";
    return `${pic}${pic.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }

  styles() {
    return `
      .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 12px; }
      .tile {
        position: relative; height: var(--h, 150px); border-radius: 12px; overflow: hidden;
        border: 1px solid var(--_line);
        background: linear-gradient(135deg, color-mix(in srgb, var(--_panel) 85%, white 6%), color-mix(in srgb, var(--_panel) 80%, black 20%));
        display: flex; flex-direction: column; justify-content: flex-end; padding: 10px; box-sizing: border-box;
      }
      .tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .tile .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 35%, transparent 55%, rgba(0,0,0,.65) 100%); }
      .tile .ph { position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%); color: var(--_line); }
      .tile .live { position: absolute; top: 10px; left: 10px; display: flex; align-items: center; gap: 6px;
        font-family: var(--_mono); font-size: 10px; letter-spacing: .5px; color: #E8E3DA; }
      .tile .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--_sage); }
      .tile .dot.off { background: var(--_faint); }
      .tile .badge { position: absolute; top: 10px; right: 10px; background: var(--_red); color: #1B1A17;
        font-family: var(--_mono); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
      .tile .nm { position: relative; font-family: var(--_display); font-size: 16px; font-weight: 600; color: #F1ECE4; }
      .tile .st { position: relative; font-family: var(--_mono); font-size: 11px; color: #C9C2B7; }
    `;
  }

  _tile(cam) {
    const s = this.state(cam.entity);
    if (!s) return `<div class="tile"><div class="warn">Not found: ${cpEsc(cam.entity)}</div></div>`;
    const online = !["unavailable", "unknown"].includes(s.state);
    const recentMs = this._config.recent_minutes * 60000;
    const recent = (id) => {
      const x = this.state(id);
      if (!x) return null;
      if (id.startsWith("event.")) {
        // event entities (e.g. UniFi Protect doorbell) hold the time of the last press as their state
        const t = new Date(x.state).getTime();
        return { on: false, recent: Number.isFinite(t) && Date.now() - t < recentMs, changed: Number.isFinite(t) ? x.state : null };
      }
      const on = x.state === "on";
      const changed = new Date(x.last_changed).getTime();
      return { on, recent: on || Date.now() - changed < recentMs, changed: x.last_changed };
    };
    const ring = recent(cam.ring);
    const motion = recent(cam.motion);
    let badge = "";
    let status = online ? "No motion" : "Offline";
    if (ring && ring.recent) { badge = "RING"; status = `Ring · ${cpAgo(ring.changed)}`; }
    else if (motion && motion.recent) { badge = "MOTION"; status = motion.on ? "Motion now" : `Motion · ${cpAgo(motion.changed)}`; }
    else if (motion && motion.changed) status = `Last motion ${cpAgo(motion.changed)}`;
    const url = online ? this._imageUrl(cam.entity) : "";
    return `<div class="tile tap" tabindex="0" role="button" data-act="${cpEsc(cam.entity)}" aria-label="${cpEsc(this.name(cam.entity, cam.name))}">
      <span class="ph">${cpIcon("camera", 42, "currentColor", 1.2)}</span>
      ${url ? `<img data-cam="${cpEsc(cam.entity)}" src="${cpEsc(url)}" alt="">` : ""}
      <div class="shade"></div>
      <div class="live"><span class="dot${online ? "" : " off"}"></span>${online ? "LIVE" : "OFFLINE"}</div>
      ${badge ? `<div class="badge">${badge}</div>` : ""}
      <div class="nm">${cpEsc(this.name(cam.entity, cam.name))}</div>
      <div class="st">${cpEsc(status)}</div>
    </div>`;
  }

  render() {
    const c = this._config;
    const cols = c.columns || Math.min(c.cameras.length, 5);
    return `<ha-card>
      <div class="label">${cpIcon("camera", 15, "var(--_dim)")}<span class="t">${cpEsc(c.title)}</span>
        <span class="n">${c.cameras.length} camera${c.cameras.length === 1 ? "" : "s"}</span></div>
      <div class="grid" style="--cols:${cols}; --h:${Number(c.height) || 150}px">${c.cameras.map((cam) => this._tile(cam)).join("")}</div>
    </ha-card>`;
  }

  afterRender() {
    this.bindActions((id) => this.handleAction(this._config.tap_action, id));
    this.shadowRoot.querySelectorAll("img[data-cam]").forEach((img) =>
      img.addEventListener("error", () => { img.style.visibility = "hidden"; }));
  }
}

/* ----------------------------------------------------------- calendar card */

class CounterCalendarCard extends CounterBase {
  static getStubConfig(hass) {
    return { calendars: Object.keys(hass?.states || {}).filter((id) => id.startsWith("calendar.")).slice(0, 3).map((entity) => ({ entity })) };
  }
  tickMs = 5 * 60000;
  tick() { this._fetch(); }

  validate(c) {
    if (!Array.isArray(c.calendars) || !c.calendars.length) throw new Error("Add at least one calendar under 'calendars'");
    const palette = ["var(--_blue)", "#B0698C", "#4FA08A", "var(--_amber)", "#8C7BB5", "var(--_red)"];
    c.calendars = c.calendars.map((x, i) => {
      const o = typeof x === "string" ? { entity: x } : { ...x };
      o.color = cpColor(o.color) || palette[i % palette.length];
      return o;
    });
    c.days = Math.max(1, Math.min(14, Number(c.days) || 7));
    c.title = c.title ?? "Calendar";
    this._events = null;
    return c;
  }

  entities() { return this._config.calendars.map((c) => c.entity); }

  hassChanged(first) {
    if (first || !this._events) this._fetch();
    else {
      // calendar entity state changes when an event starts/ends: refetch then
      const sig = this.signature(this._hass);
      if (sig !== this._fetchedSig) this._fetch();
    }
  }

  async _fetch() {
    if (!this._hass || !this._config || this._loading) return;
    this._loading = true;
    this._fetchedSig = this.signature(this._hass);
    const start = cpStartOfDay(new Date());
    const end = cpAddDays(start, this._config.days);
    const q = `?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
    const out = [];
    const errors = [];
    await Promise.all(this._config.calendars.map(async (cal) => {
      try {
        const evs = await this._hass.callApi("GET", `calendars/${cal.entity}${q}`);
        for (const e of evs || []) out.push({ ...e, _cal: cal });
      } catch (err) {
        errors.push(cal.entity);
      }
    }));
    this._events = out;
    this._errors = errors;
    this._loading = false;
    this._draw();
  }

  styles() {
    return `
      .legend { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
      .legend span { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--_dim); }
      .legend i, .ev i { display: block; border-radius: 50%; flex: none; }
      .legend i { width: 6px; height: 6px; }
      .days { display: flex; flex-direction: column; gap: 16px; }
      .day h4 { margin: 0 0 4px; font-family: var(--_display); font-size: 12px; font-weight: 700; letter-spacing: 1px;
        text-transform: uppercase; color: var(--_dim); }
      .day.today h4 { color: var(--_amber); }
      .ev { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--_rule); }
      .ev:last-child { border-bottom: none; }
      .ev i { width: 7px; height: 7px; }
      .ev .tm { font-family: var(--_mono); font-size: 12px; color: var(--_dim); width: 70px; flex: none; }
      .ev .sm { font-size: 13px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `;
  }

  _parse(v) {
    if (!v) return null;
    if (typeof v === "string") return { d: new Date(v.length === 10 ? `${v}T00:00:00` : v), allDay: v.length === 10 };
    if (v.dateTime) return { d: new Date(v.dateTime), allDay: false };
    if (v.date) return { d: new Date(`${v.date}T00:00:00`), allDay: true };
    return null;
  }

  render() {
    const c = this._config;
    const legend = c.show_legend === false ? "" : `<div class="legend r">${c.calendars.map((cal) =>
      `<span><i style="background:${cal.color}"></i>${cpEsc(cal.name || this.name(cal.entity))}</span>`).join("")}</div>`;
    const head = `<div class="label">${cpIcon("calendar", 15, "var(--_blue)")}<span class="t">${cpEsc(c.title)}</span>${legend}</div>`;
    if (!this._events) return `<ha-card>${head}<div class="empty">Loading…</div></ha-card>`;

    const today = cpStartOfDay(new Date());
    const days = [];
    for (let i = 0; i < c.days; i++) days.push({ date: cpAddDays(today, i), items: [] });
    for (const e of this._events) {
      const s = this._parse(e.start);
      const en = this._parse(e.end) || s;
      if (!s) continue;
      for (const day of days) {
        const dStart = day.date.getTime();
        const dEnd = cpAddDays(day.date, 1).getTime();
        const evEnd = en.d.getTime() > s.d.getTime() ? en.d.getTime() : s.d.getTime() + 1;
        if (s.d.getTime() < dEnd && evEnd > dStart) {
          const timed = !s.allDay && s.d.getTime() >= dStart;
          day.items.push({ e, sort: timed ? s.d.getTime() : dStart - 1, time: timed ? cpTime(s.d) : (s.allDay ? "All day" : "Cont."), cal: e._cal });
        }
      }
    }
    const visible = days.filter((d, i) => i === 0 || d.items.length);
    const fmt = (d, i) => {
      const wd = d.toLocaleDateString([], { weekday: "short" });
      const dn = d.getDate();
      if (i === 0) return `Today · ${wd} ${dn}`;
      if (i === 1) return `Tomorrow · ${wd} ${dn}`;
      return `${wd} ${dn}`;
    };
    const maxPerDay = Number(c.max_events_per_day) || 6;
    const body = visible.map((day) => {
      const i = days.indexOf(day);
      const items = day.items.sort((a, b) => a.sort - b.sort);
      const rows = items.length
        ? items.slice(0, maxPerDay).map((it) => `<div class="ev"><i style="background:${it.cal.color}"></i>
            <span class="tm">${cpEsc(it.time)}</span><span class="sm" title="${cpEsc(it.e.summary)}">${cpEsc(it.e.summary)}</span></div>`).join("")
          + (items.length > maxPerDay ? `<div class="ev"><span class="tm"></span><span class="sm" style="color:var(--_dim)">+${items.length - maxPerDay} more</span></div>` : "")
        : `<div class="empty">Nothing scheduled</div>`;
      return `<div class="day${i === 0 ? " today" : ""}"><h4>${cpEsc(fmt(day.date, i))}</h4>${rows}</div>`;
    }).join("");
    const errs = (this._errors || []).map((id) => `<div class="warn">Couldn't load ${cpEsc(id)}</div>`).join("");
    return `<ha-card>${head}${errs}<div class="days">${body}</div></ha-card>`;
  }
}

/* -------------------------------------------------------------- meals card */

class CounterMealsCard extends CounterBase {
  static getStubConfig() { return { entity: "calendar.meals" }; }
  tickMs = 15 * 60000;
  tick() { this._fetch(); }

  validate(c) {
    if (!c.entity && !c.meals) throw new Error("Set 'entity' (a meals calendar) or 'meals'");
    c.title = c.title ?? "Meals This Week";
    c.first_day = c.first_day === "sunday" ? 0 : 1;
    this._byDay = null;
    return c;
  }

  entities() { return [this._config.entity].filter(Boolean); }
  hassChanged(first) { if (first) this._fetch(); }

  _week() {
    const t = cpStartOfDay(new Date());
    const offset = (t.getDay() - this._config.first_day + 7) % 7;
    const start = cpAddDays(t, -offset);
    return Array.from({ length: 7 }, (_, i) => cpAddDays(start, i));
  }

  async _fetch() {
    const c = this._config;
    if (!c || !this._hass) return;
    const days = this._week();
    const byDay = {};
    if (c.meals) {
      const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      for (const d of days) byDay[cpDayKey(d)] = c.meals[keys[d.getDay()]] || "";
    }
    if (c.entity) {
      try {
        const q = `?start=${encodeURIComponent(days[0].toISOString())}&end=${encodeURIComponent(cpAddDays(days[6], 1).toISOString())}`;
        const evs = await this._hass.callApi("GET", `calendars/${c.entity}${q}`);
        for (const e of evs || []) {
          const v = e.start?.date || e.start?.dateTime || e.start;
          const d = new Date(typeof v === "string" && v.length === 10 ? `${v}T00:00:00` : v);
          const k = cpDayKey(d);
          if (k in byDay && !byDay[k]) byDay[k] = e.summary;
          else if (!(k in byDay)) byDay[k] = e.summary;
        }
        this._error = null;
      } catch (err) {
        this._error = `Couldn't load ${c.entity}`;
      }
    }
    this._byDay = byDay;
    this._draw();
  }

  styles() {
    return `
      .strip { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 7px; }
      .d { background: var(--_tile); border-radius: 10px; padding: 8px 3px; text-align: center;
           display: flex; flex-direction: column; gap: 6px; border: 1px solid transparent; min-width: 0; }
      .d.today { border-color: color-mix(in srgb, var(--_accent) 60%, transparent); }
      .d .wd { font-family: var(--_display); font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--_amber); text-transform: uppercase; }
      .d .m { font-size: 10px; line-height: 1.25; overflow-wrap: break-word; hyphens: auto; -webkit-hyphens: auto; }
      .d .m.none { color: var(--_faint); }
    `;
  }

  render() {
    const c = this._config;
    const head = `<div class="label">${cpIcon("meals", 15, "var(--_amber)")}<span class="t">${cpEsc(c.title)}</span></div>`;
    if (!this._byDay) return `<ha-card${c.tap_action ? ' class="tap"' : ""}>${head}<div class="empty">Loading…</div></ha-card>`;
    const today = cpDayKey(new Date());
    const tiles = this._week().map((d) => {
      const k = cpDayKey(d);
      const meal = this._byDay[k];
      return `<div class="d${k === today ? " today" : ""}"><div class="wd">${cpEsc(d.toLocaleDateString([], { weekday: "short" }))}</div>
        <div class="m${meal ? "" : " none"}">${cpEsc(meal || c.empty_text || "—")}</div></div>`;
    }).join("");
    return `<ha-card ${c.tap_action || c.entity ? 'class="tap" tabindex="0" role="button" data-act="card"' : ""}>${head}
      ${this._error ? `<div class="warn">${cpEsc(this._error)}</div>` : ""}<div class="strip">${tiles}</div></ha-card>`;
  }

  afterRender() {
    this.bindActions(() => this.handleAction(this._config.tap_action || { action: "navigate", navigation_path: "/calendar" }, this._config.entity));
  }
}

/* ----------------------------------------------------------- shopping card */

class CounterShoppingCard extends CounterBase {
  static getStubConfig() { return { entity: "todo.shopping_list" }; }

  validate(c) {
    if (!c.entity) throw new Error("Set 'entity' to a to-do list, e.g. todo.shopping_list");
    c.title = c.title ?? "Shopping List";
    c.show_completed = c.show_completed ?? 3;
    this._items = null;
    return c;
  }

  entities() { return [this._config.entity]; }

  hassChanged(first) {
    const s = this.state(this._config.entity);
    const sig = s ? `${s.state}@${s.last_updated}` : "-";
    if (first || sig !== this._itemsSig) { this._itemsSig = sig; this._fetch(); }
  }

  async _fetch() {
    try {
      const res = await this._hass.callWS({ type: "todo/item/list", entity_id: this._config.entity });
      this._items = res?.items || [];
      this._error = null;
    } catch (err) {
      this._error = `Couldn't load ${this._config.entity}`;
      this._items = this._items || [];
    }
    this._draw();
  }

  async _toggle(uid) {
    const item = (this._items || []).find((i) => i.uid === uid);
    if (!item) return;
    const status = item.status === "completed" ? "needs_action" : "completed";
    item.status = status; // optimistic
    this._draw();
    try {
      await this._hass.callService("todo", "update_item", { item: uid, status }, { entity_id: this._config.entity });
    } catch (err) {
      this._error = "Couldn't update the list";
      this._fetch();
    }
  }

  styles() {
    return `
      .items { display: flex; flex-direction: column; }
      .it { display: flex; align-items: center; gap: 10px; padding: 6px 2px; width: 100%; cursor: pointer; border-radius: 8px; }
      .it .bx { width: 16px; height: 16px; border-radius: 4px; border: 1.8px solid var(--_faint); flex: none; box-sizing: border-box;
                display: flex; align-items: center; justify-content: center; }
      .it.done .bx { background: var(--_sage); border-color: var(--_sage); }
      .it .tx { font-size: 13px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .it.done .tx { color: var(--_faint); text-decoration: line-through; }
      .sect { font-family: var(--_display); font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
              color: var(--_sage); margin: 8px 0 2px; }
      .sect:first-child { margin-top: 0; }
    `;
  }

  render() {
    const c = this._config;
    const items = this._items;
    const open = (items || []).filter((i) => i.status !== "completed");
    const done = (items || []).filter((i) => i.status === "completed");
    const head = `<div class="label">${cpIcon("list", 15, "var(--_amber)")}<span class="t">${cpEsc(c.title)}</span>
      <span class="n r">${items ? (open.length ? `${open.length} to get` : "All done") : ""}</span></div>`;
    if (!items) return `<ha-card>${head}<div class="empty">Loading…</div></ha-card>`;
    const check = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B1A17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    // "Produce: Limes" → heading "Produce", item "Limes" (turn off with group_by_prefix: false)
    const split = (summary) => {
      const m = c.group_by_prefix === false ? null : String(summary || "").match(/^\s*([^:]{2,24}):\s*(.+)$/);
      return m ? { group: m[1].trim(), text: m[2].trim() } : { group: "", text: summary };
    };
    const row = (i) => `<button class="it${i.status === "completed" ? " done" : ""}" data-act="${cpEsc(i.uid)}"
      aria-pressed="${i.status === "completed"}"><span class="bx">${i.status === "completed" ? check : ""}</span>
      <span class="tx">${cpEsc(split(i.summary).text)}</span></button>`;
    const limit = Number(c.max) || 0;
    const shownOpen = limit ? open.slice(0, limit) : open;
    const shownDone = done.slice(0, Math.max(0, Number(c.show_completed) || 0));
    let body = "";
    if (!items.length) body = `<div class="empty">The list is empty.</div>`;
    else {
      const groups = new Map();
      for (const i of shownOpen) {
        const g = split(i.summary).group;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(i);
      }
      const named = [...groups.keys()].filter(Boolean);
      if (!named.length) body = shownOpen.map(row).join("");
      else {
        // named groups first (in the order they first appear), ungrouped items last under "Other"
        for (const g of [...named, ""]) {
          const list = groups.get(g);
          if (!list) continue;
          body += `<div class="sect">${cpEsc(g || "Other")}</div>${list.map(row).join("")}`;
        }
      }
      if (limit && open.length > limit) body += `<div class="empty">+${open.length - limit} more</div>`;
      if (shownDone.length) body += `<div class="sect" style="color:var(--_faint)">Got it</div>${shownDone.map(row).join("")}`;
    }
    return `<ha-card>${head}${this._error ? `<div class="warn">${cpEsc(this._error)}</div>` : ""}<div class="items">${body}</div></ha-card>`;
  }

  afterRender() { this.bindActions((uid) => this._toggle(uid)); }
}

/* ------------------------------------------------------------ weather card */

class CounterWeatherCard extends CounterBase {
  static getStubConfig(hass) {
    return { entity: Object.keys(hass?.states || {}).find((id) => id.startsWith("weather.")) || "weather.home" };
  }

  validate(c) {
    if (!c.entity) throw new Error("Set 'entity' to a weather entity");
    c.forecast_days = c.forecast_days ?? 3;
    return c;
  }

  entities() { return [this._config.entity]; }

  hassChanged(first) {
    if (first || !this._unsub) this._subscribe();
    if (this._scores) this._scores.hass = this._hass;
  }

  connected() { if (this._hass && !this._unsub) this._subscribe(); }
  disconnected() { this._unsubscribe(); }

  _unsubscribe() {
    if (this._unsub) { this._unsub.then((u) => typeof u === "function" && u()).catch(() => {}); this._unsub = null; }
  }

  _subscribe() {
    if (!this._hass?.connection || this._unsub || !this.isConnected) return;
    this._unsub = this._hass.connection.subscribeMessage((ev) => {
      this._forecast = ev?.forecast || [];
      this._draw();
    }, { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: this._config.entity });
    this._unsub.catch(() => { this._forecast = []; this._unsub = null; this._draw(); });
  }

  styles() {
    return `
      .now { display: flex; align-items: center; gap: 14px; }
      .now .t { font-family: var(--_mono); font-size: 28px; font-weight: 500; line-height: 1.1; }
      .now .c { font-size: 12px; color: var(--_dim); }
      .now .hl { margin-left: auto; text-align: right; font-family: var(--_mono); font-size: 12px; }
      .fc { display: flex; justify-content: space-between; border-top: 1px solid var(--_rule); padding-top: 12px; margin-top: 12px; }
      .fc .f { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .fc .wd { font-family: var(--_display); font-size: 11px; letter-spacing: 1px; color: var(--_dim); text-transform: uppercase; }
      .fc .tt { font-family: var(--_mono); font-size: 11px; }
      .scores { border-top: 1px solid var(--_rule); padding-top: 12px; margin-top: 12px; }
    `;
  }

  render() {
    const c = this._config;
    const s = this.state(c.entity);
    if (!s) return `<ha-card><div class="warn">Not found: ${cpEsc(c.entity)}</div></ha-card>`;
    const a = s.attributes || {};
    const unit = a.temperature_unit || "°";
    const deg = (v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v))}°` : "–");
    const [icon, label] = CP_WEATHER[s.state] || ["cloudy", s.state];
    const fc = this._forecast || [];
    const todayFc = fc[0];
    const feels = a.apparent_temperature ?? todayFc?.apparent_temperature;
    const next = fc.slice(1, 1 + c.forecast_days).map((f) => {
      const d = new Date(f.datetime);
      const [fi] = CP_WEATHER[f.condition] || ["cloudy"];
      const color = fi === "sunny" ? "var(--_amber)" : "var(--_dim)";
      return `<div class="f"><span class="wd">${cpEsc(d.toLocaleDateString([], { weekday: "short" }))}</span>
        ${cpIcon(fi, 18, color, 1.6)}<span class="tt">${deg(f.temperature)}/${deg(f.templow)}</span></div>`;
    }).join("");
    const iconColor = ["sunny", "partly"].includes(icon) ? "var(--_amber)" : icon === "night" ? "var(--_blue)" : "var(--_dim)";
    return `<ha-card class="tap" tabindex="0" role="button" data-act="weather">
      <div class="now">${cpIcon(icon, 36, iconColor, 1.6)}
        <div><div class="t">${deg(a.temperature)}</div>
          <div class="c">${cpEsc(label)}${feels != null ? ` · Feels ${deg(feels)}` : ""}</div></div>
        ${todayFc ? `<div class="hl"><div style="color:var(--_amber)">H ${deg(todayFc.temperature)}</div><div style="color:var(--_blue)">L ${deg(todayFc.templow)}</div></div>` : ""}
      </div>
      ${next ? `<div class="fc">${next}</div>` : ""}
      ${c.scores ? `<div class="scores" data-slot="scores"></div>` : ""}
    </ha-card>`;
  }

  afterRender() {
    this.bindActions(() => this.handleAction(this._config.tap_action, this._config.entity));
    const slot = this.shadowRoot.querySelector('[data-slot="scores"]');
    if (!slot) return;
    if (!customElements.get("league-scoreboard-card")) {
      slot.innerHTML = `<div class="warn">Install League Scoreboard Card to show scores here.</div>`;
      return;
    }
    if (!this._scores) {
      this._scores = document.createElement("league-scoreboard-card");
      this._scores.setConfig({ mode: "compact", style: "counter", embedded: true, title: "Scores", ...this._config.scores });
    }
    slot.appendChild(this._scores);
    this._scores.hass = this._hass;
    // stop taps on the scores bubbling to the weather card
    slot.addEventListener("click", (ev) => ev.stopPropagation());
  }
}

/* ----------------------------------------------------------- controls card */

class CounterControlsCard extends CounterBase {
  static getStubConfig() { return { items: [] }; }

  validate(c) {
    if (!Array.isArray(c.items)) throw new Error("Add your devices under 'items'");
    c.items = c.items.map((x) => (typeof x === "string" ? { entity: x } : x));
    c.title = c.title ?? "Home Controls";
    c.columns = Number(c.columns) || 4;
    return c;
  }

  entities() { return this._config.items.map((i) => i.entity).filter(Boolean); }

  styles() {
    return `
      .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 9px; }
      .tl { background: var(--_tile); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px;
            border: 1px solid transparent; text-align: left; width: 100%; box-sizing: border-box; cursor: pointer; min-width: 0; }
      .tl.wide { grid-column: span 2; flex-direction: row; align-items: center; gap: 10px; }
      .tl.ph { border: 1px dashed var(--_line); cursor: default; }
      .tl.alert { border-color: color-mix(in srgb, var(--_red) 60%, transparent); }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 17px; }
      .nm { font-size: 11.5px; line-height: 1.25; overflow-wrap: anywhere; }
      .sb { font-family: var(--_mono); font-size: 10px; color: var(--_dim); }
      .val { font-family: var(--_mono); font-size: 12px; }
      .tag { font-family: var(--_mono); font-size: 10px; letter-spacing: .3px; }
      .sw { width: 32px; height: 17px; border-radius: 10px; background: var(--_line); position: relative; flex: none; }
      .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: var(--_dim); transition: left .15s; }
      .sw.on { background: var(--_accent); }
      .sw.on::after { left: 17px; background: #1B1A17; }
      @media (prefers-reduced-motion: reduce) { .sw::after { transition: none; } }
    `;
  }

  _tile(item, idx) {
    const s = this.state(item.entity);
    const domain = (item.entity || "").split(".")[0];
    const name = cpEsc(item.name || s?.attributes?.friendly_name || item.entity || "Device");
    if (item.placeholder) {
      const icon = item.icon || (domain === "media_player" ? "tv" : "power");
      return `<div class="tl wide ph">${cpIcon(icon, 20, "var(--_faint)")}
        <div><div class="nm" style="color:var(--_dim)">${name}</div><div class="sb" style="color:var(--_faint)">${cpEsc(item.placeholder_text || "Coming soon")}</div></div></div>`;
    }
    if (!s) {
      return `<div class="tl ph"><div class="top">${cpIcon("power", 16, "var(--_red)")}</div>
        <div><div class="nm">${name}</div><div class="sb" style="color:var(--_red)">Not found: ${cpEsc(item.entity || "no entity")}</div></div></div>`;
    }
    const st = s.state;
    const a = s.attributes || {};
    const since = cpSince(s.last_changed);
    const off = ["unavailable", "unknown"].includes(st);
    let icon = item.icon || "power", iconColor = "var(--_accent)", right = "", sub = "", action = "more-info", alert = false;

    if (domain === "climate") {
      icon = item.icon || "thermostat";
      const cur = Number(a.current_temperature);
      right = `<span class="val">${Number.isFinite(cur) ? `${Math.round(cur)}°` : "–"}</span>`;
      const target = a.temperature != null ? ` · ${Math.round(Number(a.temperature))}°` : "";
      const mode = { heat_cool: "Auto", auto: "Auto", heat: "Heat", cool: "Cool", off: "Off", fan_only: "Fan", dry: "Dry" }[st] || st;
      sub = `${mode}${st === "off" ? "" : target}`;
      // icon shows activity: accent while heating/cooling, dim when idle or off
      const active = a.hvac_action && !["idle", "off"].includes(a.hvac_action);
      iconColor = st === "off" ? "var(--_faint)" : active ? "var(--_accent)" : "var(--_dim)";
    } else if (domain === "lock") {
      const locked = st === "locked";
      icon = item.icon || (locked ? "lock" : "unlock");
      iconColor = locked ? "var(--_sage)" : "var(--_red)";
      right = `<span class="tag" style="color:${iconColor}">${cpEsc(st.toUpperCase())}</span>`;
      sub = since; alert = !locked && !off;
    } else if (domain === "cover") {
      const closed = st === "closed";
      icon = item.icon || "garage";
      iconColor = closed ? "var(--_sage)" : "var(--_amber)";
      right = `<span class="tag" style="color:${iconColor}">${cpEsc(st.toUpperCase())}</span>`;
      sub = since; alert = st === "open";
    } else if (domain === "binary_sensor") {
      const open = st === "on";
      const isOpening = ["door", "window", "garage_door", "opening", undefined].includes(a.device_class);
      icon = item.icon || (open ? "doorOpen" : "door");
      iconColor = open ? "var(--_amber)" : "var(--_sage)";
      right = `<span class="tag" style="color:${iconColor}">${isOpening ? (open ? "OPEN" : "CLOSED") : (open ? "ON" : "OFF")}</span>`;
      sub = item.subtitle || since; alert = open && isOpening;
    } else if (["light", "switch", "fan", "input_boolean"].includes(domain)) {
      icon = item.icon || "bulb";
      const on = st === "on";
      iconColor = on ? "var(--_accent)" : "var(--_faint)";
      right = `<span class="sw${on ? " on" : ""}"></span>`;
      const bri = a.brightness != null ? ` · ${Math.round((Number(a.brightness) / 255) * 100)}%` : "";
      sub = on ? `On${bri}` : "Off"; action = "toggle";
    } else if (domain === "media_player") {
      icon = item.icon || "tv";
      const playing = st === "playing";
      iconColor = playing ? "var(--_accent)" : "var(--_dim)";
      right = `<span class="tag" style="color:${iconColor}">${cpEsc(st.toUpperCase())}</span>`;
      sub = a.media_title ? `${a.media_title}` : (a.app_name || "");
    } else {
      right = `<span class="val">${cpEsc(st)}${a.unit_of_measurement ? cpEsc(a.unit_of_measurement) : ""}</span>`;
      sub = since;
    }
    if (off) { iconColor = "var(--_faint)"; right = `<span class="tag" style="color:var(--_faint)">OFFLINE</span>`; alert = false; }
    if (item.tap_action) action = "custom";
    return `<button class="tl${alert ? " alert" : ""}${item.wide ? " wide" : ""}" data-act="${idx}" data-mode="${action}">
      <div class="top">${cpIcon(icon, 16, iconColor)}${right}</div>
      <div><div class="nm">${name}</div><div class="sb">${cpEsc(sub)}</div></div></button>`;
  }

  render() {
    const c = this._config;
    return `<ha-card>
      <div class="label">${cpIcon("bulb", 15, "var(--_accent)")}<span class="t">${cpEsc(c.title)}</span></div>
      <div class="grid" style="--cols:${c.columns}">${c.items.map((it, i) => this._tile(it, i)).join("")}</div>
    </ha-card>`;
  }

  afterRender() {
    this.bindActions((idx, el) => {
      const item = this._config.items[Number(idx)];
      if (!item) return;
      if (el.dataset.mode === "custom") this.handleAction(item.tap_action, item.entity);
      else if (el.dataset.mode === "toggle") this.handleAction({ action: "toggle" }, item.entity);
      else this.moreInfo(item.entity);
    });
  }
}

/* ------------------------------------------------------------ layout card */

/**
 * Lays other cards out like the Counter Panel design: full-width rows and rows of
 * equal columns, with the design's padding and gaps. Columns stack on narrow screens.
 *
 *   type: custom:counter-layout-card
 *   rows:
 *     - card: {...}                 # one full-width card
 *     - columns:                    # equal-width columns, each a list of cards
 *         - [ {...} ]
 *         - [ {...}, {...} ]
 */
class CounterLayoutCard extends HTMLElement {
  setConfig(config) {
    if (!config || !Array.isArray(config.rows)) throw new Error("Add 'rows' to the layout");
    this._config = { padding: 24, gap: 16, stack_below: 900, ...config };
    if (config.fonts !== false) cpLoadFonts();
    this._built = false;
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    (this._children || []).forEach((c) => { c.hass = hass; });
  }

  getCardSize() { return 12; }

  async _build() {
    const cfg = this._config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const pad = Number(cfg.padding) || 0;
    const gap = Number(cfg.gap) || 0;
    this.shadowRoot.innerHTML = `<style>
      :host { display: block; }
      .page { padding: ${pad}px; display: flex; flex-direction: column; gap: ${gap}px; box-sizing: border-box; }
      .cols { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: ${gap}px; align-items: stretch; }
      .cols.top { align-items: start; }
      .col { display: flex; flex-direction: column; gap: ${gap}px; min-width: 0; }
      .col.fill > :last-child { flex: 1; }
      @media (max-width: ${Number(cfg.stack_below) || 900}px) { .cols { grid-template-columns: minmax(0, 1fr); } }
      .err { color: var(--error-color, #db4437); padding: 8px; font: 13px sans-serif; }
    </style><div class="page"></div>`;
    const page = this.shadowRoot.querySelector(".page");
    let helpers;
    try { helpers = await window.loadCardHelpers?.(); } catch (e) { helpers = null; }
    const make = (c) => {
      try {
        if (helpers?.createCardElement) return helpers.createCardElement(c);
        const tag = String(c.type || "").replace(/^custom:/, "");
        const el = document.createElement(tag.includes("-") ? tag : `hui-${tag}-card`);
        el.setConfig?.(c);
        return el;
      } catch (e) {
        const div = document.createElement("div");
        div.className = "err";
        div.textContent = `Card error: ${e.message}`;
        return div;
      }
    };
    this._children = [];
    for (const row of cfg.rows) {
      if (row.columns) {
        const wrap = document.createElement("div");
        wrap.className = row.fill_last === false ? "cols top" : "cols";
        wrap.style.setProperty("--n", row.columns.length);
        for (const col of row.columns) {
          const colEl = document.createElement("div");
          colEl.className = `col${row.fill_last !== false ? " fill" : ""}`;
          for (const c of [].concat(col)) { const el = make(c); this._children.push(el); colEl.appendChild(el); }
          wrap.appendChild(colEl);
        }
        page.appendChild(wrap);
      } else {
        for (const c of [].concat(row.card || row.cards || [])) { const el = make(c); this._children.push(el); page.appendChild(el); }
      }
    }
    if (this._hass) this.hass = this._hass;
  }
}

/* --------------------------------------------------------------- register */

const CP_CARDS = [
  ["counter-layout-card", CounterLayoutCard, "Counter Panel: layout", "Full-width rows and equal columns with the panel's spacing."],
  ["counter-header-card", CounterHeaderCard, "Counter Panel: header", "Clock, date, indoor temperature and alarm status."],
  ["counter-cameras-card", CounterCamerasCard, "Counter Panel: cameras", "Camera tiles with live snapshots and motion / doorbell badges."],
  ["counter-calendar-card", CounterCalendarCard, "Counter Panel: calendar", "Agenda merged from several calendars, a colour per calendar."],
  ["counter-meals-card", CounterMealsCard, "Counter Panel: meals", "This week's meals from a calendar, Monday to Sunday."],
  ["counter-shopping-card", CounterShoppingCard, "Counter Panel: shopping list", "A to-do list you can tick off from the panel."],
  ["counter-weather-card", CounterWeatherCard, "Counter Panel: weather", "Current weather, a 3-day outlook and optional scores."],
  ["counter-controls-card", CounterControlsCard, "Counter Panel: controls", "Thermostats, locks, garage, door sensors, lights and media."],
];

window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of CP_CARDS) {
  if (!customElements.get(tag)) {
    customElements.define(tag, cls);
    window.customCards.push({ type: tag, name, description, preview: false });
  }
}
console.info(`%c COUNTER-PANEL-CARDS %c v${CP_VERSION} `, "background:#C97A46;color:#fff;font-weight:700", "");
