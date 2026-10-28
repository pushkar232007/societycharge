const KEY = "societycharge.v4";
const SOCIETY = "Sai Shraddha Society";
const AREA = "Paud Road, Kothrud, Pune";
const PHOTOS = [
  { src: "images/sc-charger.jpg", pos: "center" },
  { src: "images/sc-idle.jpg", pos: "left center" },
  { src: "images/sc-plugin.jpg", pos: "center 42%" },
  { src: "images/sc-court.jpg", pos: "center" }
];

const app = document.querySelector("#app");
let db = load();
let session = localStorage.getItem("sc.session");
let route = (location.hash || "#find").slice(1);
let draft = null;
let authMode = "login";
let rolePick = "resident";
let msg = "";
let paying = false;
let refocus = null;

function load() {
  let data = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch (err) { /* fresh start */ }
  if (!data) data = seed();
  primeDesk(data);
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}
function shutLabel(code) {
  if (code === "outside") return "I'm outside";
  if (code === "needed") return "Needed at home";
  return "";
}
function primeDesk(data) {
  if (!data.shutDemo) {
    const vikram = data.users.find((u) => u.email === "vikram@saishraddha.in");
    const vBay = vikram && data.chargers.find((c) => c.hostId === vikram.id);
    if (vBay && !vBay.shut) vBay.shut = "outside";
    data.shutDemo = true;
  }
  if (!data.historyDemo) {
    data.historyDemo = true;
    let neha = data.users.find((u) => u.email === "neha@saishraddha.in");
    if (!neha) {
      neha = { id: uid(), name: "Neha Bhosale", email: "neha@saishraddha.in", password: "demo", society: SOCIETY, area: AREA, flat: "D-210", role: "resident" };
      data.users.push(neha);
    }
    const kabir = data.users.find((u) => u.email === "resident@saishraddha.in");
    const meera = data.users.find((u) => u.email === "host@saishraddha.in");
    const arjun = data.users.find((u) => u.email === "arjun@saishraddha.in");
    const meeraBay = meera && data.chargers.find((c) => c.hostId === meera.id);
    const arjunBay = arjun && data.chargers.find((c) => c.hostId === arjun.id);
    const today = ymd(new Date());
    const hasPast = data.bookings.some((b) => b.date < today && b.status === "paid");
    if (!hasPast && kabir && meeraBay) {
      [[meeraBay, kabir, -6, 11], [meeraBay, neha, -4, 15], [meeraBay, kabir, -1, 16], [arjunBay, kabir, -2, 10]]
        .filter((row) => row[0])
        .forEach(([charger, person, day, hour]) => {
          const q = quote(charger, 1);
          data.bookings.push({
            id: uid(), chargerId: charger.id, userId: person.id, date: ymd(addDays(day)), hour,
            total: q.total, host: q.host, platform: q.platform, society: q.society, kwh: q.kwh,
            status: "paid", upi: "demo@upi", ref: "SC" + Math.floor(10000000 + Math.random() * 89999999)
          });
        });
    }
  }
  data.bookings.forEach((b) => {
    if (b.kwh) return;
    const charger = data.chargers.find((c) => c.id === b.chargerId);
    if (charger) b.kwh = Math.round(charger.kw * 10) / 10;
  });
  if (data.deskReady) return;
  data.deskReady = true;
  let neha = data.users.find((u) => u.email === "neha@saishraddha.in");
  if (!neha) {
    neha = { id: uid(), name: "Neha Bhosale", email: "neha@saishraddha.in", password: "demo", society: SOCIETY, area: AREA, flat: "D-210", role: "resident" };
    data.users.push(neha);
  }
  const host = data.users.find((u) => u.email === "host@saishraddha.in");
  const kabir = data.users.find((u) => u.email === "resident@saishraddha.in");
  const bay = host && data.chargers.find((c) => c.hostId === host.id);
  if (!host || !kabir || !bay || data.bookings.some((b) => b.chargerId === bay.id && b.status === "paid")) return;
  const q = quote(bay, 1);
  [[kabir, 1, 11], [neha, 1, 16], [kabir, 2, 10]].forEach(([user, day, hour]) => {
    data.bookings.push({
      id: uid(), chargerId: bay.id, userId: user.id, date: ymd(addDays(day)), hour,
      total: q.total, host: q.host, platform: q.platform, society: q.society, kwh: q.kwh,
      status: "paid", upi: "demo@upi", ref: "SC" + Math.floor(10000000 + Math.random() * 89999999)
    });
  });
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function inr(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
function pad(n) { return String(n).padStart(2, "0"); }
function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function addDays(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
function dayLabel(iso) {
  if (!iso || Number.isNaN(new Date(iso + "T12:00:00").getTime())) return "";
  const t = ymd(new Date());
  const n = ymd(addDays(1));
  if (iso === t) return "Today";
  if (iso === n) return "Tomorrow";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
function hourLabel(h) { return pad(h) + ":00"; }
function station(code) { return "Charging station " + (code || "—"); }
function me() { return db.users.find((u) => u.id === session) || null; }
function societyOf(name) { return String(name || "").trim().toLowerCase(); }
function shownSociety(name) {
  const key = societyOf(name);
  const known = [...db.chargers.map((c) => c.society), ...db.users.map((u) => u.society)].filter((s) => societyOf(s) === key);
  return known.find((s) => s !== s.toLowerCase()) || known[0] || String(name || "").trim();
}

function seed() {
  const hosts = [
    ["Meera Shah", "host@saishraddha.in", "A-1204", "B2-14", "B-Wing basement", 7.4, 12, 10, 18],
    ["Arjun Desai", "arjun@saishraddha.in", "C-803", "C1-02", "C-Wing basement", 7.4, 11, 9, 17],
    ["Priya Kulkarni", "priya@saishraddha.in", "B-1102", "B1-06", "B-Wing basement", 3.3, 10, 8, 16],
    ["Rohan Joshi", "rohan@saishraddha.in", "D-504", "D2-03", "D-Wing basement", 7.4, 13, 11, 19],
    ["Ananya Iyer", "ananya@saishraddha.in", "A-902", "A1-11", "A-Wing basement", 7.4, 12, 10, 18],
    ["Vikram Patil", "vikram@saishraddha.in", "E-201", "E1-04", "E-Wing stilt", 3.3, 9, 9, 17],
    ["Sneha Naik", "sneha@saishraddha.in", "C-1501", "C2-09", "C-Wing basement", 7.4, 14, 10, 16],
    ["Amit Kulkarni", "amit@saishraddha.in", "F-607", "F1-01", "F-Wing stilt", 7.4, 11, 8, 18]
  ];
  const users = [];
  const chargers = [];
  hosts.forEach((row, i) => {
    const id = uid();
    users.push({ id, name: row[0], email: row[1], password: "demo", society: SOCIETY, area: AREA, flat: row[2], role: "host" });
    chargers.push({ id: uid(), hostId: id, society: SOCIETY, bay: row[3], spot: row[4], kw: row[5], rate: row[6], openFrom: row[7], openTo: row[8], photo: i % PHOTOS.length });
  });
  users.push({ id: uid(), name: "Kabir Sen", email: "resident@saishraddha.in", password: "demo", society: SOCIETY, area: AREA, flat: "B-502", role: "resident" });
  return { users, chargers, bookings: [] };
}
function areaOf(society) {
  const hit = db.users.find((u) => societyOf(u.society) === societyOf(society) && u.area);
  return hit ? hit.area : "";
}

function dates() { return [0, 1, 2].map((n) => ymd(addDays(n))); }
function past(iso, hour) { return new Date(iso + "T" + pad(hour) + ":00:00") <= new Date(); }
function taken(chargerId, iso, hour) {
  return db.bookings.some((b) => b.chargerId === chargerId && b.date === iso && b.hour === hour && b.status === "paid");
}
function openSlots(charger, iso) {
  if (charger.shut) return [];
  const out = [];
  for (let h = charger.openFrom; h < charger.openTo; h++) {
    if (!past(iso, h) && !taken(charger.id, iso, h)) out.push(h);
  }
  return out;
}
function quote(charger, hours) {
  const kwh = charger.kw * hours;
  const total = Math.round(kwh * charger.rate);
  const host = Math.round(total * 0.85);
  const society = Math.round(total * 0.02);
  return { kwh, total, host, society, platform: total - host - society };
}
function chargersFor(user) {
  return db.chargers.filter((c) => societyOf(c.society) === societyOf(user.society));
}
function hostCharger(user) { return db.chargers.find((c) => c.hostId === user.id); }

function go(next) {
  route = next;
  const want = "#" + next;
  if (location.hash !== want) location.hash = want;
  render();
}
function loginAs(email) {
  const user = db.users.find((u) => u.email === email);
  session = user.id;
  localStorage.setItem("sc.session", session);
  msg = "";
  draft = null;
  authMode = "login";
  go(user.role === "host" ? "desk" : "find");
}
function logout() {
  session = null;
  localStorage.removeItem("sc.session");
  draft = null;
  msg = "";
  go("find");
}

function render() {
  const user = me();
  if (!user) { app.innerHTML = authView(); bindAuth(); return; }
  let next = route;
  if (user.role === "host") next = ["bay", "account", "history"].includes(route) ? route : "desk";
  else if (route === "bookings") next = "history";
  else if (route === "desk" || route === "bay" || route === "host") next = "find";
  if (next !== route) {
    route = next;
    const want = "#" + next;
    if (location.hash !== want) history.replaceState(null, "", location.pathname + location.search + want);
  }
  app.innerHTML = shell(user);
  bindApp(user);
  if (refocus) {
    const el = document.querySelector(refocus);
    if (el) {
      el.focus();
      if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
    }
    refocus = null;
  }
}

function authView() {
  const creating = authMode === "signup";
  return `
    <section class="auth">
      <div class="auth-copy">
        <p class="brand">SocietyCharge</p>
        <p class="tag">Book a charger in your society.</p>
        <form class="card" id="auth-form">
          ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
          ${creating ? `<label>Name<input name="name" required></label>` : ""}
          <label>Email<input name="email" type="email" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="${creating ? "new-password" : "current-password"}" required></label>
          ${creating ? `
            <div class="row">
              <label>Society<input name="society" placeholder="Sai Shraddha Society" required></label>
              <label>Flat<input name="flat" placeholder="B-502" required></label>
            </div>
            <div class="choice">
              <button type="button" data-role="resident" class="${rolePick === "resident" ? "on" : ""}">I need a charger</button>
              <button type="button" data-role="host" class="${rolePick === "host" ? "on" : ""}">I have a charger</button>
            </div>` : ""}
          <button class="btn" type="submit">${creating ? "Create account" : "Log in"}</button>
          <p style="margin:12px 0 0"><button type="button" class="linkish" id="swap">${creating ? "Have an account? Log in" : "New here? Create account"}</button></p>
        </form>
        <div class="demo">
          <button type="button" id="as-resident" class="door-resident"><strong>Charging stations</strong><span>Resident · resident@saishraddha.in</span></button>
          <button type="button" id="as-host" class="door-host"><strong>Your station</strong><span>Host · host@saishraddha.in</span></button>
        </div>
      </div>
      <figure class="auth-photo">
        <img src="images/sc-charger.jpg" alt="Home EV charging station in an apartment parking area">
        <figcaption>Your station. Their charge. Paid per unit.</figcaption>
      </figure>
    </section>`;
}

function bindAuth() {
  document.querySelectorAll("[data-role]").forEach((btn) => {
    btn.onclick = () => { rolePick = btn.dataset.role; render(); };
  });
  const swap = document.querySelector("#swap");
  if (swap) swap.onclick = () => { authMode = authMode === "login" ? "signup" : "login"; msg = ""; render(); };
  document.querySelector("#as-resident").onclick = () => loginAs("resident@saishraddha.in");
  document.querySelector("#as-host").onclick = () => loginAs("host@saishraddha.in");
  document.querySelector("#auth-form").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    if (authMode === "login") {
      const user = db.users.find((u) => u.email === email && u.password === password);
      if (!user) { msg = "Email or password is wrong."; render(); return; }
      loginAs(user.email);
      return;
    }
    if (!data.name || !data.society || !data.flat || password.length < 4) {
      msg = "Name, society, flat, and a password of 4 or more characters.";
      render();
      return;
    }
    if (db.users.some((u) => u.email === email)) { msg = "That email already has an account."; render(); return; }
    const society = shownSociety(data.society);
    const user = { id: uid(), name: data.name.trim(), email, password, society, area: areaOf(society), flat: data.flat.trim(), role: rolePick };
    db.users.push(user);
    save();
    loginAs(email);
  };
}

function shell(user) {
  const item = (id, label) => `<button type="button" data-go="${id}" class="${route === id ? "on" : ""}">${label}</button>`;
  const nav = user.role === "host"
    ? `${item("desk", "Desk")}${item("history", "History")}${item("bay", "Station")}${item("account", "Account")}`
    : `${item("find", "Find")}${item("history", "History")}${item("account", "Account")}`;
  return `
    <div class="shell ${user.role}">
      <aside class="side">
        <p class="brand">SocietyCharge</p>
        <p class="kicker">${user.role === "host" ? "Your station" : "Charging stations"}</p>
        ${nav}
        <div class="who">${esc(user.name)}<br>${user.role === "host" ? "Host" : "Resident"} · ${esc(user.flat)}</div>
      </aside>
      <main class="main">${view(user)}</main>
    </div>
    <nav class="tabs">${nav}</nav>`;
}

function view(user) {
  if (user.role === "host") {
    if (route === "account") return accountView(user);
    if (route === "bay") return hostView(user);
    if (route === "history") return historyView(user);
    return hostDesk(user);
  }
  if (route.startsWith("bay:")) return bayView(user, route.slice(4));
  if (route === "pay") return payView(user);
  if (route === "history") return historyView(user);
  if (route === "account") return accountView(user);
  return findView(user);
}

function findView(user) {
  const q = (draft && draft.q) || "";
  const sort = (draft && draft.sort) || "soon";
  const openness = (c) => dates().reduce((sum, iso) => sum + openSlots(c, iso).length, 0);
  let list = chargersFor(user);
  if (q) list = list.filter((c) => (c.bay + " " + (c.spot || "")).toLowerCase().includes(q.toLowerCase()));
  list = list.slice().sort((a, b) => sort === "price" ? a.rate - b.rate : openness(b) - openness(a));
  const cards = list.map((c) => {
    const n = openness(c);
    const own = c.hostId === user.id;
    return `<button class="bay" data-bay="${c.id}">
      <img src="${PHOTOS[c.photo % PHOTOS.length].src}" style="object-position:${PHOTOS[c.photo % PHOTOS.length].pos}" alt="">
      <div>
        <h2>${esc(station(c.bay))}</h2>
        ${c.spot ? `<p class="meta">${esc(c.spot)}</p>` : ""}
        <p class="meta">${c.kw} kW · ${hourLabel(c.openFrom)}–${hourLabel(c.openTo)}</p>
        <p class="price">${inr(c.rate)} <span class="meta">/ kWh</span></p>
        <p class="meta">${c.shut ? `<span class="mine">Shut · ${esc(shutLabel(c.shut))}</span>` : own ? `<span class="mine">Your station</span>` : n + " open slots"}</p>
      </div>
    </button>`;
  }).join("");
  return `
    <div class="top">
      <div><h1>${esc(shownSociety(user.society))}</h1><p class="sub">${esc(areaOf(user.society) || "Open chargers")}</p></div>
      <div class="tools">
        <input id="q" placeholder="Station" value="${esc(q)}">
        <select id="sort">
          <option value="soon" ${sort === "soon" ? "selected" : ""}>Most open</option>
          <option value="price" ${sort === "price" ? "selected" : ""}>Lowest rate</option>
        </select>
      </div>
    </div>
    ${cards ? `<div class="grid">${cards}</div>` : `<p class="empty">No charging stations in ${esc(user.society)} yet.</p>`}`;
}

function bayView(user, id) {
  const c = db.chargers.find((x) => x.id === id);
  if (!c) return `<p class="empty">That charging station is gone.</p>`;
  if (!draft || draft.chargerId !== id) draft = { chargerId: id, q: draft && draft.q, sort: draft && draft.sort };
  if (!draft.date || !dates().includes(draft.date)) draft.date = dates().find((d) => openSlots(c, d).length) || dates()[0];
  const iso = draft.date;
  const hour = draft.hour;
  const slots = openSlots(c, iso);
  const own = c.hostId === user.id;
  return `
    <button class="linkish back" data-go="find">Back</button>
    <div class="detail">
      <img src="${PHOTOS[c.photo % PHOTOS.length].src}" style="object-position:${PHOTOS[c.photo % PHOTOS.length].pos}" alt="Charging station ${esc(c.bay)}">
      <div class="panel">
        <h1>${esc(station(c.bay))}</h1>
        ${c.spot ? `<p class="meta">${esc(c.spot)}</p>` : ""}
        <p class="meta">${c.kw} kW · ${inr(c.rate)} / kWh · ${hourLabel(c.openFrom)}–${hourLabel(c.openTo)}</p>
        <div class="days">${dates().map((d) => `<button type="button" class="ghost btn" data-date="${d}" style="width:auto;padding:8px 12px;${d === iso ? "background:var(--navy);color:white" : ""}">${dayLabel(d)}</button>`).join("")}</div>
        ${c.shut ? `<p class="shut-now">Shut · ${esc(shutLabel(c.shut))}. New hours open when the host turns it back on.</p>` : own ? `<p class="mine">This is your station.</p>` : `
          <div class="slots">
            ${slots.length ? slots.map((h) => `<button type="button" data-hour="${h}" data-date="${iso}" class="${hour === h ? "on" : ""}">${hourLabel(h)}–${hourLabel(h + 1)}<small>${inr(quote(c, 1).total)}</small></button>`).join("") : `<p class="empty">Nothing open ${dayLabel(iso).toLowerCase()}.</p>`}
          </div>
          <button class="btn clay" id="reserve" style="margin-top:14px" ${hour == null ? "disabled" : ""}>Reserve ${hour == null ? "" : hourLabel(hour)}</button>`}
      </div>
    </div>`;
}

function payView(user) {
  if (!draft || draft.hour == null || !draft.date) return `<p class="empty">Pick a slot first.</p>`;
  const c = db.chargers.find((x) => x.id === draft.chargerId);
  if (!c) return `<p class="empty">That charging station is gone.</p>`;
  const q = quote(c, 1);
  return `
    <button class="linkish back" data-go="bay:${c.id}">Back</button>
    <div class="panel" style="max-width:460px">
      <p class="meta">${dayLabel(draft.date)} · ${hourLabel(draft.hour)}–${hourLabel(draft.hour + 1)}</p>
      <h1>${esc(station(c.bay))}</h1>
      <div class="payline"><span>${c.kw} kWh × ${inr(c.rate)}</span><strong>${inr(q.total)}</strong></div>
      <div class="payline"><span>Host</span><span>${inr(q.host)}</span></div>
      <div class="payline"><span>SocietyCharge</span><span>${inr(q.platform)}</span></div>
      <div class="payline"><span>Society fund</span><span>${inr(q.society)}</span></div>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
      <label>UPI ID<input id="upi" placeholder="name@upi" autocomplete="off" value="${esc(draft.upi || "")}"></label>
      <button class="btn clay" id="pay" ${paying ? "disabled" : ""}>${paying ? "Paying…" : "Pay " + inr(q.total) + " with UPI"}</button>
    </div>`;
}

function sessionKwh(b) {
  if (b.kwh) return b.kwh;
  const c = db.chargers.find((x) => x.id === b.chargerId);
  return c ? c.kw : 0;
}
function historyOf(user) {
  const rows = user.role === "host"
    ? db.bookings.filter((b) => { const c = db.chargers.find((x) => x.id === b.chargerId); return c && c.hostId === user.id; })
    : db.bookings.filter((b) => b.userId === user.id);
  return rows.slice().sort((a, b) => (b.date + pad(b.hour)).localeCompare(a.date + pad(a.hour)));
}
function historyView(user) {
  const hostSide = user.role === "host";
  const rows = historyOf(user);
  const paid = rows.filter((b) => b.status === "paid");
  const kwh = paid.reduce((sum, b) => sum + sessionKwh(b), 0);
  const spent = paid.reduce((sum, b) => sum + b.total, 0);
  const earned = paid.reduce((sum, b) => sum + b.host, 0);
  const fund = paid.reduce((sum, b) => sum + b.society, 0);
  const fee = paid.reduce((sum, b) => sum + b.platform, 0);
  const byDate = {};
  paid.forEach((b) => {
    if (!byDate[b.date]) byDate[b.date] = { kwh: 0, money: 0 };
    byDate[b.date].kwh += sessionKwh(b);
    byDate[b.date].money += hostSide ? b.host : b.total;
  });
  const series = Object.keys(byDate).sort().map((date) => ({ date, ...byDate[date] }));
  const max = Math.max(...series.map((s) => s.kwh), 1);
  const columns = series.map((s) => {
    const d = new Date(s.date + "T12:00:00");
    const label = s.date === ymd(new Date()) ? "Today" : s.date === ymd(addDays(1)) ? "Tmrw" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `<div class="col"><strong>${s.kwh.toFixed(1)}</strong><div class="coltrack"><div class="colfill" style="height:${Math.max(12, Math.round(s.kwh / max * 100))}%"></div></div><span>${label}</span><em>${inr(s.money)}</em></div>`;
  }).join("");
  const pot = earned + fee + fund;
  const hp = pot ? earned / pot * 100 : 0;
  const fp = pot ? fee / pot * 100 : 0;
  const grouped = {};
  paid.forEach((b) => {
    const c = db.chargers.find((x) => x.id === b.chargerId);
    const who = db.users.find((u) => u.id === b.userId);
    const key = hostSide ? b.userId : b.chargerId;
    if (!grouped[key]) grouped[key] = { name: hostSide ? (who ? who.name : "Resident") : (c ? station(c.bay) : "Station"), sub: hostSide ? (who ? who.flat : "") : (c ? c.spot || "" : ""), kwh: 0, money: 0 };
    grouped[key].kwh += sessionKwh(b);
    grouped[key].money += hostSide ? b.host : b.total;
  });
  const people = Object.values(grouped).sort((a, b) => b.kwh - a.kwh);
  const peopleMax = Math.max(...people.map((p) => p.kwh), 1);
  const peopleBars = people.map((p) => `<div class="barrow"><span>${esc(p.name)}<small>${esc(p.sub)}</small></span><div class="track"><div class="fill" style="width:${Math.max(8, Math.round(p.kwh / peopleMax * 100))}%"></div></div><strong>${p.kwh.toFixed(1)}<small>${inr(p.money)}</small></strong></div>`).join("");
  const cards = hostSide
    ? `<div class="stat navy"><span>kWh supplied</span><strong>${kwh.toFixed(1)}</strong></div><div class="stat clay"><span>Earned</span><strong>${inr(earned)}</strong></div><div class="stat"><span>Society fund</span><strong>${inr(fund)}</strong></div>`
    : `<div class="stat navy"><span>kWh used</span><strong>${kwh.toFixed(1)}</strong></div><div class="stat clay"><span>Money spent</span><strong>${inr(spent)}</strong></div><div class="stat"><span>Sessions</span><strong>${paid.length}</strong></div>`;
  const list = rows.map((b) => {
    const c = db.chargers.find((x) => x.id === b.chargerId);
    const who = db.users.find((u) => u.id === b.userId);
    const title = hostSide
      ? `${who ? esc(who.name) : "Resident"} · ${who ? esc(who.flat) : ""}`
      : (c ? esc(station(c.bay)) : "Charging station");
    const money = hostSide ? inr(b.host) + " earned" : inr(b.total);
    return `<article class="booking">
      <div><strong>${title}</strong><br><span class="muted">${dayLabel(b.date)} · ${hourLabel(b.hour)}–${hourLabel(b.hour + 1)} · ${sessionKwh(b).toFixed(1)} kWh · ${money} · ${esc(b.status)}</span></div>
      ${!hostSide && b.status === "paid" && !past(b.date, b.hour) ? `<button data-cancel="${b.id}">Cancel</button>` : ""}
    </article>`;
  }).join("");
  return `
    <div class="headrow">
      <div><h1>${hostSide ? "Earnings" : "Charging history"}</h1><p class="sub">${hostSide ? "kWh supplied from your station, and what you earned." : "kWh you used, and what you spent."}</p></div>
      <button class="btn" id="download" type="button">Download Excel</button>
    </div>
    <div class="stats">${cards}</div>
    <div class="infogrid">
      <section class="chartcard">
        <h2>kWh by day</h2>
        ${columns ? `<div class="cols">${columns}</div>` : `<p class="empty">No paid sessions yet.</p>`}
      </section>
      <section class="chartcard">
        <h2>${hostSide ? "Where the payment went" : "Where your money went"}</h2>
        <div class="donut-wrap">
          <div class="donut" style="background:${pot ? `conic-gradient(#c45c36 0 ${hp}%, #1e3a5f ${hp}% ${hp + fp}%, #1f7a4d ${hp + fp}% 100%)` : "#e6ddd0"}"><div class="donut-hole"><strong>${inr(hostSide ? earned : spent)}</strong><span>${hostSide ? "earned" : "spent"}</span></div></div>
          <div class="legend"><span><i class="dot host"></i>Host ${inr(earned)}</span><span><i class="dot fee"></i>SocietyCharge ${inr(fee)}</span><span><i class="dot fund"></i>Society ${inr(fund)}</span></div>
        </div>
      </section>
    </div>
    <section class="chartcard">
      <h2>${hostSide ? "Who charged" : "Stations used"}</h2>
      ${peopleBars || `<p class="empty">No paid sessions yet.</p>`}
    </section>
    <h2 class="hist-title">Sessions</h2>
    <div class="list">${list || `<p class="empty">No sessions yet.</p>`}</div>`;
}
function downloadHistory(user) {
  const hostSide = user.role === "host";
  const head = hostSide
    ? ["Date", "Time", "Resident", "Flat", "Station", "kWh", "Paid", "Earned", "Society fund", "Status", "Reference"]
    : ["Date", "Time", "Station", "Place", "kWh", "Spent", "Status", "Reference"];
  const body = historyOf(user).map((b) => {
    const c = db.chargers.find((x) => x.id === b.chargerId);
    const who = db.users.find((u) => u.id === b.userId);
    const time = hourLabel(b.hour) + "-" + hourLabel(b.hour + 1);
    return hostSide
      ? [b.date, time, who ? who.name : "", who ? who.flat : "", c ? c.bay : "", sessionKwh(b).toFixed(1), Math.round(b.total), Math.round(b.host), Math.round(b.society), b.status, b.ref || ""]
      : [b.date, time, c ? station(c.bay) : "", c ? c.spot || "" : "", sessionKwh(b).toFixed(1), Math.round(b.total), b.status, b.ref || ""];
  });
  const csv = [head, ...body].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = hostSide ? "SocietyCharge-earnings.csv" : "SocietyCharge-charging.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function hostDesk(user) {
  const c = hostCharger(user);
  if (!c) return hostView(user);
  const iso = draft && dates().includes(draft.deskDate) ? draft.deskDate : dates()[1];
  const mine = db.bookings.filter((b) => b.chargerId === c.id && b.status === "paid");
  const earned = mine.reduce((s, b) => s + b.host, 0);
  const fund = mine.reduce((s, b) => s + b.society, 0);
  const rows = [];
  for (let h = c.openFrom; h < c.openTo; h++) {
    const b = mine.find((x) => x.date === iso && x.hour === h);
    const who = b && db.users.find((u) => u.id === b.userId);
    const gone = past(iso, h);
    const kind = gone ? "passed" : b ? "booked" : c.shut ? "shut" : "open";
    const label = gone ? "Passed" : b ? "Booked" : c.shut ? "Shut" : "Open";
    const detail = b
      ? `${who ? esc(who.name) : "Resident"} · ${who ? esc(who.flat) : ""} · ${inr(b.total)}`
      : c.shut ? esc(shutLabel(c.shut)) : "No one yet";
    rows.push(`<div class="slotrow ${kind}"><strong>${hourLabel(h)}–${hourLabel(h + 1)}</strong><span>${detail}</span><span class="tag ${kind}">${label}</span></div>`);
  }
  return `
    <div class="top">
      <div>
        <h1>${esc(station(c.bay))}</h1>
        <p class="sub">${esc(c.spot || "Your charger")} · ${c.kw} kW · ${inr(c.rate)} / kWh</p>
      </div>
    </div>
    <div class="earns"><div>Earned<strong>${inr(earned)}</strong></div><div>Society fund<strong>${inr(fund)}</strong></div><div>Sessions<strong>${mine.length}</strong></div></div>
    <section class="shutbox">
      <h2>Shut station</h2>
      <p class="sub">When you are outside, or the charger is needed at home. New bookings stop. Hours already paid stay on the desk.</p>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
      ${c.shut ? `
        <p class="shut-now">Station is shut · ${esc(shutLabel(c.shut))}</p>
        <button type="button" class="btn" id="open-station">Open station</button>` : `
        <div class="choice">
          <button type="button" data-shut="outside" class="${draft && draft.shutPick === "outside" ? "on" : ""}">I'm outside</button>
          <button type="button" data-shut="needed" class="${draft && draft.shutPick === "needed" ? "on" : ""}">Needed at home</button>
        </div>
        <button type="button" class="btn clay" id="shut-station">Shut station</button>`}
    </section>
    <div class="days">${dates().map((d) => `<button type="button" class="ghost btn" data-desk="${d}" style="width:auto;padding:8px 12px;${d === iso ? "background:#8c4630;color:white" : ""}">${dayLabel(d)}</button>`).join("")}</div>
    <div class="board">${rows.join("")}</div>`;
}
function hostView(user) {
  const c = hostCharger(user);
  return `
    <h1>${c ? esc(station(c.bay)) : "List your station"}</h1>
    <p class="sub">${c ? "Hours and rate neighbours see when they book." : "Residents in your society can book it once it is listed."}</p>
    <form class="panel" id="host-form" style="max-width:520px;margin-top:12px">
      ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
      <label>Station<input name="bay" value="${c ? esc(c.bay) : ""}" required></label>
      <label>Where<input name="spot" value="${c ? esc(c.spot || "") : ""}" placeholder="B-Wing basement"></label>
      <div class="row">
        <label>₹ / kWh<input name="rate" type="number" min="1" step="1" value="${c ? c.rate : 12}" required></label>
        <label>kW<input name="kw" type="number" min="1" step="0.1" value="${c ? c.kw : 7.4}" required></label>
      </div>
      <div class="row">
        <label>Opens<select name="openFrom">${hours(c ? c.openFrom : 10)}</select></label>
        <label>Closes<select name="openTo">${hours(c ? c.openTo : 18)}</select></label>
      </div>
      <button class="btn" type="submit">${c ? "Save station" : "List station"}</button>
    </form>`;
}
function hours(selected) {
  let html = "";
  for (let h = 0; h < 24; h++) html += `<option value="${h}" ${h === selected ? "selected" : ""}>${hourLabel(h)}</option>`;
  return html;
}

function accountView(user) {
  return `
    <h1>${esc(user.name)}</h1>
    <p class="sub">${esc(shownSociety(user.society))}${areaOf(user.society) ? " · " + esc(areaOf(user.society)) : ""} · Flat ${esc(user.flat)} · ${user.role === "host" ? "Host" : "Resident"}</p>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn ghost" id="logout" style="width:auto">Log out</button>
      <button class="btn ghost" id="reset" style="width:auto">Reset demo</button>
    </div>`;
}

function bindApp(user) {
  document.querySelectorAll("[data-go]").forEach((btn) => { btn.onclick = () => { msg = ""; go(btn.dataset.go); }; });
  document.querySelectorAll("[data-bay]").forEach((btn) => {
    btn.onclick = () => {
      const c = db.chargers.find((x) => x.id === btn.dataset.bay);
      const date = dates().find((d) => openSlots(c, d).length) || dates()[0];
      draft = { chargerId: c.id, q: draft && draft.q, sort: draft && draft.sort, date, hour: null };
      go("bay:" + c.id);
    };
  });
  const q = document.querySelector("#q");
  const sort = document.querySelector("#sort");
  if (q) q.oninput = () => { draft = { ...(draft || {}), q: q.value, sort: sort.value }; refocus = "#q"; go("find"); };
  if (sort) sort.onchange = () => { draft = { ...(draft || {}), q: q.value, sort: sort.value }; go("find"); };
  document.querySelectorAll("[data-shut]").forEach((btn) => {
    btn.onclick = () => { draft = { ...(draft || {}), shutPick: btn.dataset.shut }; msg = ""; render(); };
  });
  const shutBtn = document.querySelector("#shut-station");
  if (shutBtn) shutBtn.onclick = () => {
    const c = hostCharger(user);
    if (!c) return;
    if (!draft || !draft.shutPick) { msg = "Pick a reason, then shut the station."; render(); return; }
    c.shut = draft.shutPick;
    msg = "";
    save();
    render();
  };
  const openBtn = document.querySelector("#open-station");
  if (openBtn) openBtn.onclick = () => {
    const c = hostCharger(user);
    if (!c) return;
    c.shut = "";
    save();
    render();
  };
  document.querySelectorAll("[data-desk]").forEach((btn) => {
    btn.onclick = () => { draft = { ...(draft || {}), deskDate: btn.dataset.desk }; render(); };
  });
  document.querySelectorAll("[data-date]").forEach((btn) => {
    btn.onclick = () => { draft = { ...draft, date: btn.dataset.date, hour: null }; render(); };
  });
  document.querySelectorAll("[data-hour]").forEach((btn) => {
    btn.onclick = () => { draft = { ...draft, hour: Number(btn.dataset.hour), date: btn.dataset.date || draft.date }; render(); };
  });
  const reserve = document.querySelector("#reserve");
  if (reserve) reserve.onclick = () => { if (draft && draft.hour != null) go("pay"); };
  const pay = document.querySelector("#pay");
  const upi = document.querySelector("#upi");
  if (upi) upi.oninput = () => { draft.upi = upi.value; };
  if (pay) pay.onclick = () => payNow(user);
  document.querySelectorAll("[data-cancel]").forEach((btn) => { btn.onclick = () => cancel(btn.dataset.cancel); });
  const hostForm = document.querySelector("#host-form");
  if (hostForm) hostForm.onsubmit = (e) => saveHost(e, user);
  const download = document.querySelector("#download");
  if (download) download.onclick = () => downloadHistory(user);
  const out = document.querySelector("#logout");
  if (out) out.onclick = logout;
  const reset = document.querySelector("#reset");
  if (reset) reset.onclick = () => { localStorage.removeItem(KEY); localStorage.removeItem("sc.session"); db = load(); session = null; draft = null; render(); };
}

function payNow(user) {
  if (paying) return;
  const c = db.chargers.find((x) => x.id === draft.chargerId);
  const field = document.querySelector("#upi");
  const upi = String((field && field.value) || (draft && draft.upi) || "").trim();
  if (draft) draft.upi = upi;
  if (!c || draft.hour == null || !draft.date) return;
  if (!/^[^@\s]+@[^@\s]+$/.test(upi)) { msg = "Enter a UPI ID, like name@upi."; render(); return; }
  if (c.shut || c.hostId === user.id || taken(c.id, draft.date, draft.hour) || past(draft.date, draft.hour)) {
    msg = "That slot is no longer open.";
    go("bay:" + c.id);
    return;
  }
  paying = true;
  msg = "";
  render();
  const q = quote(c, 1);
  const when = { date: draft.date, hour: draft.hour };
  setTimeout(() => {
    db.bookings.push({
      id: uid(), chargerId: c.id, userId: user.id, date: when.date, hour: when.hour,
      total: q.total, host: q.host, platform: q.platform, society: q.society, kwh: q.kwh,
      status: "paid", upi, ref: "SC" + Math.floor(10000000 + Math.random() * 89999999)
    });
    save();
    paying = false;
    draft = { q: draft.q, sort: draft.sort };
    go("bookings");
  }, 700);
}

function cancel(id) {
  const b = db.bookings.find((x) => x.id === id && x.userId === session);
  if (!b || past(b.date, b.hour)) return;
  b.status = "cancelled";
  save();
  render();
}

function saveHost(e, user) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const openFrom = Number(data.openFrom);
  const openTo = Number(data.openTo);
  const rate = Number(data.rate);
  const kw = Number(data.kw);
  if (!data.bay || !(rate > 0) || !(kw > 0) || openTo <= openFrom) {
    msg = "Station, rate, and a close time after open.";
    render();
    return;
  }
  const existing = hostCharger(user);
  if (existing) {
    Object.assign(existing, { bay: data.bay.trim(), spot: String(data.spot || "").trim(), rate, kw, openFrom, openTo });
  } else {
    user.society = shownSociety(user.society);
    db.chargers.push({ id: uid(), hostId: user.id, society: user.society, bay: data.bay.trim(), spot: String(data.spot || "").trim(), kw, rate, openFrom, openTo, photo: db.chargers.length % PHOTOS.length });
  }
  save();
  msg = "";
  render();
}

window.addEventListener("hashchange", () => {
  const next = (location.hash || "#find").slice(1);
  if (next === route) return;
  route = next;
  render();
});
render();
