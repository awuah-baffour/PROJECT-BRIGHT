// Bright shopkeeper app v0. Same-origin API (served by Express). Voice via
// Web Speech API with typed fallback. Server does availability + pricing.
const $ = (id) => document.getElementById(id);
const store = {
  get base() { return localStorage.getItem("bright_base") || ""; },
  set base(v) { localStorage.setItem("bright_base", v); },
  get location() { return localStorage.getItem("bright_loc") || "loc_1"; },
  set location(v) { localStorage.setItem("bright_loc", v); },
};
const state = { items: [], quote: null, orderId: null, timer: null };
const cedis = (p) => `GH₵ ${(p / 100).toFixed(2)}`;

// ---------- navigation ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  if (id !== "screen-status" && state.timer) { clearInterval(state.timer); state.timer = null; }
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
$("settingsBtn").addEventListener("click", () => show("screen-settings"));
$("saveSettingsBtn").addEventListener("click", () => {
  store.base = $("baseInput").value.trim();
  store.location = $("locationInput").value.trim() || "loc_1";
  checkHealth();
  show("screen-order");
});

// ---------- health ----------
async function api(path, opts) {
  const res = await fetch(store.base + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}
async function checkHealth() {
  try {
    const h = await api("/v1/health");
    $("conn").textContent = `connected • ${h.phase}`;
    $("conn").classList.remove("bad");
  } catch {
    $("conn").textContent = "offline — start the API";
    $("conn").classList.add("bad");
  }
}

// ---------- voice + parsing ----------
// v0 parser: split on commas/newlines/"and", take trailing or leading number as qty.
function parseRequest(text) {
  return text
    .split(/[\n,;]+|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      let m = chunk.match(/(\d+(?:\.\d+)?)\s*(?:x|bags?|bottles?|cartons?|pcs?|packs?|litres?|l|kg|g)?\s+(.+)/i);
      if (m) return { name: m[2].trim(), qty: Number(m[1]) };
      m = chunk.match(/(.+?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*$/);
      if (m) return { name: m[1].trim(), qty: Number(m[2]) };
      m = chunk.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*$/);
      if (m) return { name: m[1].trim(), qty: Number(m[2]) };
      return { name: chunk, qty: 1 };
    })
    .filter((i) => i.name);
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  $("micBtn").disabled = true;
  $("micLabel").textContent = "Voice not supported here";
  $("micHint").textContent = "Type below instead — works the same.";
} else {
  const rec = new SR();
  rec.lang = "en-GH";
  rec.interimResults = false;
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    $("requestBox").value = ($("requestBox").value + " " + text).trim();
    addParsed(text);
  };
  rec.onend = () => { $("micBtn").classList.remove("listening"); $("micLabel").textContent = "Tap and speak"; };
  rec.onerror = () => { $("micBtn").classList.remove("listening"); $("micLabel").textContent = "Didn't catch that — try again"; };
  $("micBtn").addEventListener("click", () => {
    $("micBtn").classList.add("listening");
    $("micLabel").textContent = "Listening…";
    rec.start();
  });
}
function addParsed(text) {
  for (const it of parseRequest(text)) state.items.push(it);
  renderItems();
  $("requestBox").value = "";
}
$("parseBtn").addEventListener("click", () => addParsed($("requestBox").value));
function renderItems() {
  const box = $("items");
  box.innerHTML = state.items.length ? "" : '<p class="sub">Empty — speak or type above.</p>';
  state.items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "itemrow";
    row.innerHTML = `<b></b><input type="number" min="1" value="${it.qty}" aria-label="quantity"/><button aria-label="remove">✕</button>`;
    row.querySelector("b").textContent = it.name;
    row.querySelector("input").addEventListener("change", (e) => { it.qty = Math.max(1, Number(e.target.value) || 1); });
    row.querySelector("button").addEventListener("click", () => { state.items.splice(i, 1); renderItems(); });
    box.appendChild(row);
  });
}

// ---------- browse ----------
$("browseBtn").addEventListener("click", async () => {
  const picker = $("productPicker");
  try {
    const { results = [] } = await api("/v1/catalog/search?q=" + encodeURIComponent("a")).catch(() => ({ results: [] }));
    const list = results.length ? results : (await api("/v1/catalog/products")).slice(0, 20);
    picker.hidden = false;
    picker.innerHTML = "";
    for (const p of list.slice(0, 20)) {
      const d = document.createElement("div");
      d.className = "pick";
      const label = document.createElement("span");
      label.textContent = `${p.name}${p.variant ? " " + p.variant : ""} — ${cedis(p.price)} (${p.supplierName})`;
      const b = document.createElement("button");
      b.textContent = "+ Add";
      b.addEventListener("click", () => { state.items.push({ name: p.name, qty: 1 }); renderItems(); });
      d.append(label, b);
      picker.appendChild(d);
    }
  } catch (e) { alert(e.message); }
});

// ---------- quote + pay ----------
$("quoteBtn").addEventListener("click", async () => {
  if (!state.items.length) return alert("Add at least one item first.");
  store.location = $("locationInput").value.trim() || "loc_1";
  $("quoteBtn").disabled = true;
  try {
    const q = await api("/v1/orders/quote", {
      method: "POST",
      body: JSON.stringify({
        items: state.items,
        deliveryLocationId: store.location,
        window: $("windowInput").value.trim() || undefined,
      }),
    });
    state.quote = q;
    state.orderId = q.orderId;
    renderQuote(q);
    show("screen-review");
  } catch (e) { alert(e.message); }
  $("quoteBtn").disabled = false;
});
function renderQuote(q) {
  $("quoteLines").innerHTML = q.lines.map((l) =>
    `<div class="kv"><span>${l.qtyFulfilled}× ${l.productName}<br><small>${l.supplierName}${l.partial ? " (partial)" : ""}</small></span><b>${cedis(l.lineTotal)}</b></div>`
  ).join("") || '<p class="sub">Nothing available.</p>';
  $("quoteTotals").innerHTML =
    `<div class="kv"><span>Delivery (one fee)</span><b>${cedis(q.deliveryFee)}</b></div>` +
    `<div class="kv total"><span>Total</span><span>${cedis(q.total)}</span></div>`;
  $("quoteFlags").innerHTML =
    q.unavailable.map((u) => `<span class="pill warn">${u.requestedName}: ${u.reason}</span>`).join("") +
    q.supplierAllocation.map((s) => `<span class="pill">${s.supplierName}: ${cedis(s.amount)}</span>`).join("");
  $("payBtn").disabled = !q.lines.length;
}
$("backBtn").addEventListener("click", () => show("screen-order"));
$("payBtn").addEventListener("click", async () => {
  $("payBtn").disabled = true;
  try {
    await api(`/v1/orders/${state.orderId}/pay`, { method: "POST" });
    await loadStatus();
    show("screen-status");
  } catch (e) { alert(e.message); }
  $("payBtn").disabled = false;
});

// ---------- status / timeline ----------
async function loadStatus() {
  const t = await api(`/v1/orders/${state.orderId}/timeline`);
  $("statusTitle").textContent = `Order ${t.orderId} • ${t.status}`;
  $("statusBody").innerHTML =
    t.slices.map((s) => `<span class="pill">${s.supplierName}: ${s.status}</span>`).join("") +
    `<ul class="tl">` + t.events.map((e) => `<li class="done">${e.type} <small>${new Date(e.at).toLocaleString()}</small></li>`).join("") + `</ul>`;
  const iss = await api(`/v1/support/orders/${state.orderId}/issues`).catch(() => ({ issues: [] }));
  $("issues").innerHTML = iss.issues.map((i) => `<span class="pill warn">${i.type}: ${i.status}</span>`).join("");
  if (state.timer) clearInterval(state.timer);
  if (!["delivered", "cancelled", "refunded"].includes(t.status)) {
    state.timer = setInterval(loadStatus, 5000);
  }
}
$("refreshBtn").addEventListener("click", loadStatus);
$("newOrderBtn").addEventListener("click", () => { state.items = []; state.quote = null; renderItems(); show("screen-order"); });
$("issueBtn").addEventListener("click", async () => {
  try {
    await api(`/v1/support/orders/${state.orderId}/issues`, {
      method: "POST",
      body: JSON.stringify({ type: $("issueType").value, detail: $("issueDetail").value }),
    });
    $("issueDetail").value = "";
    await loadStatus();
  } catch (e) { alert(e.message); }
});
$("reorderBtn").addEventListener("click", async () => {
  try {
    const q = await api(`/v1/orders/${state.orderId}/reorder`, { method: "POST" });
    state.quote = q; state.orderId = q.orderId;
    renderQuote(q); show("screen-review");
  } catch (e) { alert(e.message); }
});
$("recurringBtn").addEventListener("click", async () => {
  try {
    const r = await api(`/v1/recurring/orders/${state.orderId}/subscribe`, {
      method: "POST", body: JSON.stringify({ frequency: "weekly" }),
    });
    $("extras").innerHTML = `<span class="pill">Repeats weekly, next ${new Date(r.nextRun).toLocaleDateString()}</span>`;
  } catch (e) { alert(e.message); }
});
$("trackBtn").addEventListener("click", async () => {
  try {
    await api(`/v1/tracking/orders/${state.orderId}/enable`, { method: "POST" });
    const t = await api(`/v1/tracking/orders/${state.orderId}`);
    $("extras").innerHTML = t.pings.length
      ? t.pings.map((p) => `<div class="kv"><span>${p.stage || "ping"}</span><b>${p.lat}, ${p.lng}</b></div>`).join("")
      : `<span class="pill">Tracking on — no pings yet</span>`;
  } catch (e) { alert(e.message); }
});

// ---------- replenish ----------
$("replenishBtn").addEventListener("click", async () => {
  store.location = $("locationInput").value.trim() || "loc_1";
  try {
    const r = await api(`/v1/insights/replenish?locationId=${encodeURIComponent(store.location)}`);
    $("suggestions").innerHTML = r.suggestions.length
      ? r.suggestions.map((s) =>
        `<div class="pick"><span><b>${s.productName}</b> — ~${s.suggestedQty} every ${s.avgIntervalDays}d ${s.dueNow ? "(due!)" : ""}</span><button data-add="${s.productName}" data-qty="${s.suggestedQty}">+ Add</button></div>`
      ).join("")
      : `<p class="sub">Not enough history yet — pay for ${2 - r.purchases} more order(s) first.</p>`;
    $("suggestions").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      state.items.push({ name: b.dataset.add, qty: Number(b.dataset.qty) || 1 });
      renderItems();
      show("screen-order");
    }));
  } catch (e) { alert(e.message); }
});

// ---------- boot ----------
$("locationInput").value = store.location;
$("baseInput").value = store.base;
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
renderItems();
checkHealth();
