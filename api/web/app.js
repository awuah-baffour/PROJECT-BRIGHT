const $ = (id) => document.getElementById(id);

const store = {
  get base() { return localStorage.getItem("bright_base") || ""; },
  set base(value) { localStorage.setItem("bright_base", value); },
  get location() { return localStorage.getItem("bright_loc") || "loc_1"; },
  set location(value) { localStorage.setItem("bright_loc", value || "loc_1"); },
  get account() {
    try { return JSON.parse(localStorage.getItem("bright_account") || "null"); }
    catch { return null; }
  },
  set account(value) {
    if (value) localStorage.setItem("bright_account", JSON.stringify(value));
    else localStorage.removeItem("bright_account");
  },
  get basket() {
    try {
      const items = JSON.parse(localStorage.getItem("bright_basket") || "[]");
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },
  set basket(value) { localStorage.setItem("bright_basket", JSON.stringify(value)); },
  get quote() {
    try { return JSON.parse(localStorage.getItem("bright_quote") || "null"); }
    catch { return null; }
  },
  set quote(value) {
    if (value) localStorage.setItem("bright_quote", JSON.stringify(value));
    else localStorage.removeItem("bright_quote");
  },
  get token() { return localStorage.getItem("bright_token") || ""; },
  set token(value) {
    if (value) localStorage.setItem("bright_token", value);
    else localStorage.removeItem("bright_token");
  },
  get user() {
    try { return JSON.parse(localStorage.getItem("bright_user") || "null"); }
    catch { return null; }
  },
  set user(value) {
    if (value) localStorage.setItem("bright_user", JSON.stringify(value));
    else localStorage.removeItem("bright_user");
  },
};

const state = {
  items: store.basket,
  quote: null,
  orderId: localStorage.getItem("bright_order_id") || "",
  activeScreen: document.body.dataset.page || "overview",
};

function cedis(pesewas) {
  return `GHS ${(Number(pesewas || 0) / 100).toFixed(2)}`;
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3600);
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setResult(id, value) {
  const node = $(id);
  if (!node) return;
  node.textContent = typeof value === "string" ? value : pretty(value);
}

function setError(id, error) {
  const node = $(id);
  if (!node) return;
  node.textContent = error.message || String(error);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (store.token) headers.Authorization = `Bearer ${store.token}`;
  const response = await fetch(store.base + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function updateUserChip() {
  const user = store.user;
  const chip = $("userChip");
  if (chip) chip.textContent = user ? `${user.role} / ${user.phone}` : "No session";
}

function setConnection(ok, label, detail) {
  if (!$("conn") || !$("connDetail") || !$("connDot")) return;
  $("conn").textContent = label;
  $("connDetail").textContent = detail;
  $("connDot").classList.toggle("good", ok);
  $("connDot").classList.toggle("bad", !ok);
}

async function checkHealth() {
  try {
    const health = await api("/v1/health");
    setConnection(true, "API connected", health.phase || health.service || "Ready");
  } catch {
    setConnection(false, "API offline", "Start npm run dev");
  }
}

function showScreen(name) {
  state.activeScreen = name;
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${name}`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === name);
  });
  const title = $("screenTitle");
  const label = document.querySelector(`.nav-item[data-screen="${name}"]`)?.textContent || "Overview";
  if (title) title.textContent = label;
}

function parseRequest(text) {
  const quantities = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const quantityPattern = "(\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten)";
  const unitPattern = "(?:bags?|bottles?|cartons?|boxes|box|pcs?|pieces?|packs?|litres?|liters?|l|kg|g)";
  const quantityValue = (value) => quantities[value.toLowerCase()] ?? Number(value);
  return text
    .split(/[\n,;]+|\band\b/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      let match = chunk.match(new RegExp(`^${quantityPattern}\\s*(?:x|${unitPattern}\\s+(?:of\\s+)?)?(.+)`, "i"));
      if (match) return { name: match[2].trim(), qty: quantityValue(match[1]) };
      match = chunk.match(/^(.+?)\s+x\s*(\d+(?:\.\d+)?)$/i);
      if (match) return { name: match[1].trim(), qty: Number(match[2]) };
      match = chunk.match(new RegExp(`^(.+?)\\s+${quantityPattern}\\s*${unitPattern}?$`, "i"));
      if (match) return { name: match[1].trim(), qty: quantityValue(match[2]) };
      match = chunk.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
      if (match) return { name: match[1].trim(), qty: Number(match[2]) };
      return { name: chunk, qty: 1 };
    })
    .filter((item) => item.name && item.qty > 0);
}

function renderItems() {
  const box = $("items");
  if (!box) return;
  const count = $("basketCount");
  if (count) count.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "items"}`;
  if (!state.items.length) {
    box.innerHTML = `<div class="empty">No items yet. Add products by voice, text, or catalog browse.</div>`;
    return;
  }
  box.innerHTML = "";
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-card";
    row.innerHTML = `
      <span class="item-token" aria-hidden="true"></span>
      <div class="item-copy"><strong></strong><small>Requested product</small></div>
      <input type="number" min="1" value="${item.qty}" aria-label="Quantity">
      <button type="button" aria-label="Remove item">×</button>
    `;
    row.querySelector(".item-token").textContent = item.name.slice(0, 1).toUpperCase();
    row.querySelector("strong").textContent = item.name;
    row.querySelector("input").addEventListener("change", (event) => {
      item.qty = Math.max(1, Number(event.target.value) || 1);
      store.basket = state.items;
    });
    row.querySelector("button").addEventListener("click", () => {
      state.items.splice(index, 1);
      store.basket = state.items;
      renderItems();
    });
    box.appendChild(row);
  });
}

function addParsed(text) {
  const parsed = parseRequest(text);
  if (!parsed.length) {
    showToast("Add a product name and quantity first.");
    return;
  }
  state.items.push(...parsed);
  store.basket = state.items;
  $("requestBox").value = "";
  renderItems();
}

async function browseCatalog() {
  const picker = $("productPicker");
  picker.hidden = false;
  picker.innerHTML = `<div class="empty">Loading catalog...</div>`;
  try {
    const products = await api("/v1/catalog/products");
    const list = Array.isArray(products) ? products : products.products || products.results || [];
    picker.innerHTML = "";
    if (!list.length) {
      picker.innerHTML = `<div class="empty">No approved supplier products yet.</div>`;
      return;
    }
    for (const product of list.slice(0, 24)) {
      const item = document.createElement("div");
      item.className = "catalog-item";
      item.innerHTML = `
        <div>
          <strong></strong>
          <small></small>
        </div>
        <button class="small-btn">Add</button>
      `;
      item.querySelector("strong").textContent = `${product.name}${product.variant ? ` ${product.variant}` : ""}`;
      item.querySelector("small").textContent = `${cedis(product.price)} / ${product.unit} - ${product.inStock} in stock - ${product.supplierName || "Supplier"}`;
      item.querySelector("button").addEventListener("click", () => {
        state.items.push({ name: product.name, qty: 1 });
        store.basket = state.items;
        renderItems();
        showToast(`${product.name} added`);
      });
      picker.appendChild(item);
    }
  } catch (error) {
    picker.innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function createQuote() {
  if (!$("multiDropInput") || !$("windowInput")) return;
  let payload;
  const multi = $("multiDropInput").value.trim();
  if (multi) {
    try {
      payload = { deliveries: JSON.parse(multi), window: $("windowInput").value.trim() || undefined };
    } catch {
      showToast("Multi-location JSON is invalid.");
      return;
    }
  } else {
    if (!state.items.length) {
      showToast("Add at least one item.");
      return;
    }
    store.location = $("locationInput").value.trim() || "loc_1";
    payload = {
      items: state.items,
      deliveryLocationId: store.location,
      window: $("windowInput").value.trim() || undefined,
    };
  }

  $("quoteBtn").disabled = true;
  try {
    const quote = await api("/v1/orders/quote", { method: "POST", body: JSON.stringify(payload) });
    state.quote = quote;
    store.quote = quote;
    state.orderId = quote.orderId;
    state.items = [];
    store.basket = state.items;
    localStorage.setItem("bright_order_id", state.orderId);
    window.location.assign(`/orders.html?orderId=${encodeURIComponent(state.orderId)}`);
  } catch (error) {
    showToast(error.message);
  } finally {
    $("quoteBtn").disabled = false;
  }
}

function renderQuote(quote) {
  if (!$("quoteEmpty") || !$("quoteView")) return;
  $("quoteEmpty").hidden = true;
  $("quoteView").hidden = false;
  setResult("orderHeading", `Quote ${quote.orderId || state.orderId}`);
  $("quoteLines").innerHTML = "";
  for (const line of quote.lines || []) {
    const row = document.createElement("div");
    row.className = "catalog-item";
    row.innerHTML = `
      <div>
        <strong></strong>
        <small></small>
      </div>
      <b></b>
    `;
    row.querySelector("strong").textContent = `${line.qtyFulfilled} x ${line.productName}`;
    row.querySelector("small").textContent = `${line.supplierName}${line.partial ? " - partial fill" : ""}${line.locationId ? ` - ${line.locationId}` : ""}`;
    row.querySelector("b").textContent = cedis(line.lineTotal);
    $("quoteLines").appendChild(row);
  }

  $("quoteFlags").innerHTML = "";
  for (const unavailable of quote.unavailable || []) {
    const pill = document.createElement("span");
    pill.className = "pill warn";
    pill.textContent = `${unavailable.requestedName}: ${unavailable.reason}`;
    $("quoteFlags").appendChild(pill);
  }
  for (const allocation of quote.supplierAllocation || []) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = `${allocation.supplierName}: ${cedis(allocation.amount)}`;
    $("quoteFlags").appendChild(pill);
  }

  $("quoteTotals").innerHTML = `
    <div class="kv"><span>Subtotal</span><strong>${cedis(quote.subtotal)}</strong></div>
    <div class="kv"><span>Delivery fee</span><strong>${cedis(quote.deliveryFee)}</strong></div>
    <div class="kv"><span>Internal logistics cost</span><strong>${cedis(quote.internalLogisticsCost)}</strong></div>
    <div class="kv total"><span>Total</span><span>${cedis(quote.total)}</span></div>
  `;
  $("paymentNotice").textContent = "";
  $("paymentNotice").className = "notice";
}

async function attemptPayment() {
  if (!state.orderId) return showToast("Create or load an order first.");
  try {
    await api(`/v1/orders/${state.orderId}/pay`, { method: "POST" });
    $("paymentNotice").textContent = "Payment accepted.";
    $("paymentNotice").className = "notice";
  } catch (error) {
    $("paymentNotice").textContent = error.message;
    $("paymentNotice").className = "notice error";
  }
}

async function loadOrder() {
  const id = $("orderLookupInput")?.value.trim() || state.orderId;
  if (!id) return showToast("Enter an order ID.");
  state.orderId = id;
  localStorage.setItem("bright_order_id", id);
  $("orderLookupInput").value = id;
  if ($("exceptionOrderId")) $("exceptionOrderId").value = id;
  const [order, timeline] = await Promise.all([
    api(`/v1/orders/${id}`),
    api(`/v1/orders/${id}/timeline`),
  ]);
  const savedQuote = order?.quote
    ? { orderId: id, ...order.quote }
    : store.quote?.orderId === id ? store.quote : null;
  if (savedQuote) {
    state.quote = savedQuote;
    store.quote = savedQuote;
    renderQuote(savedQuote);
  } else {
    $("quoteEmpty").hidden = false;
    $("quoteEmpty").textContent = `Quote details for ${id} are not available.`;
    $("quoteView").hidden = true;
  }
  renderTimeline(timeline);
  await loadIssues();
}

function renderTimeline(timeline) {
  const progress = $("statusBody");
  if (!progress) return;
  progress.innerHTML = "";
  const current = String(timeline.status || "quoted");
  const currentIndex = ["quoted", "pending_payment", "paid", "sourcing", "preparing", "ready", "picked_up", "consolidated", "dispatched", "delivered"].indexOf(current);
  const steps = [
    ["quoted", "Quote ready"],
    ["pending_payment", "Awaiting payment"],
    ["paid", "Payment confirmed"],
    ["sourcing", "Suppliers confirming"],
    ["preparing", "Your items are being prepared"],
    ["ready", "Ready for pickup"],
    ["picked_up", "Picked up"],
    ["consolidated", "Orders combined for delivery"],
    ["dispatched", "On its way to your shop"],
    ["delivered", "Delivered to your shop"],
  ];
  const title = $("deliveryTitle");
  if (title) {
    title.textContent = current === "exception" ? "We’re looking into your order"
      : current === "cancelled" ? "This order was cancelled"
        : current === "refunded" ? "This order was refunded"
          : current === "delivered" ? "Delivered to your shop"
            : current === "dispatched" ? "On its way to your shop"
              : "Your order progress";
  }
  const summary = $("deliverySummary");
  if (summary) {
    const activeSuppliers = (timeline.slices || []).filter((slice) => slice.status === "assigned" || slice.status === "confirmed").length;
    summary.textContent = current === "quoted" || current === "pending_payment"
      ? "Review your quote and confirm your order when you’re ready."
      : activeSuppliers
        ? `${activeSuppliers} supplier ${activeSuppliers === 1 ? "is" : "s are"} working on your order.`
        : `Order ${timeline.orderId} · ${current.replaceAll("_", " ")}`;
  }
  if (current === "exception" || current === "cancelled" || current === "refunded") {
    const row = document.createElement("div");
    row.className = "timeline-item is-current";
    const text = document.createElement("div");
    const heading = document.createElement("strong");
    const detail = document.createElement("small");
    heading.textContent = current === "exception" ? "Support is reviewing this order" : `Order ${current}`;
    detail.textContent = timeline.orderId;
    text.append(heading, detail);
    row.appendChild(text);
    progress.appendChild(row);
  } else {
    for (let index = 0; index < steps.length; index += 1) {
      const [status, label] = steps[index];
      const done = currentIndex > index;
      const active = current === status;
      const row = document.createElement("div");
      row.className = `timeline-item${done ? " is-done" : ""}${active ? " is-current" : ""}`;
      const text = document.createElement("div");
      const heading = document.createElement("strong");
      const detail = document.createElement("small");
      heading.textContent = label;
      detail.textContent = active ? "In progress" : done ? "Complete" : "";
      text.append(heading, detail);
      row.appendChild(text);
      progress.appendChild(row);
    }
  }
  const supplierItems = $("trackingBody");
  if (!supplierItems) return;
  supplierItems.innerHTML = "";
  for (const slice of timeline.slices || []) {
    const row = document.createElement("div");
    row.className = "supplier-order";
    const name = document.createElement("strong");
    const detail = document.createElement("small");
    name.textContent = slice.supplierName || "Supplier";
    detail.textContent = `${String(slice.status || "assigned").replaceAll("_", " ")}${slice.respondBy ? ` · Respond by ${new Date(slice.respondBy).toLocaleString()}` : ""}`;
    row.append(name, detail);
    supplierItems.appendChild(row);
  }
}

async function loadIssues() {
  if (!state.orderId) return;
  try {
    const data = await api(`/v1/support/orders/${state.orderId}/issues`);
    $("issues").innerHTML = "";
    for (const issue of data.issues || []) {
      const pill = document.createElement("span");
      pill.className = issue.status === "open" ? "pill warn" : "pill";
      pill.textContent = `${issue.type}: ${issue.status}`;
      $("issues").appendChild(pill);
    }
  } catch (error) {
    const box = $("issues");
    if (box) {
      box.innerHTML = "";
      const message = document.createElement("span");
      message.className = "pill warn";
      message.textContent = `Support status unavailable: ${error.message}`;
      box.appendChild(message);
    }
  }
}

async function openIssue() {
  if (!state.orderId) return showToast("Create or load an order first.");
  try {
    await api(`/v1/support/orders/${state.orderId}/issues`, {
      method: "POST",
      body: JSON.stringify({ type: $("issueType").value, detail: $("issueDetail").value.trim() || undefined }),
    });
    $("issueDetail").value = "";
    await loadIssues();
    showToast("Issue opened.");
  } catch (error) {
    showToast(error.message);
  }
}

async function reorder() {
  if (!state.orderId) return showToast("Create or load an order first.");
  try {
    const quote = await api(`/v1/orders/${state.orderId}/reorder`, { method: "POST" });
    state.quote = quote;
    store.quote = quote;
    state.orderId = quote.orderId;
    localStorage.setItem("bright_order_id", state.orderId);
    $("orderLookupInput").value = state.orderId;
    renderQuote(quote);
    await loadOrder();
    showToast("Reorder quote created.");
  } catch (error) {
    showToast(error.message);
  }
}

async function subscribeRecurring() {
  if (!state.orderId) return showToast("Create or load an order first.");
  try {
    const schedule = await api(`/v1/recurring/orders/${state.orderId}/subscribe`, {
      method: "POST",
      body: JSON.stringify({ frequency: "weekly" }),
    });
    showToast(`Recurring schedule starts ${new Date(schedule.nextRun).toLocaleDateString()}`);
  } catch (error) {
    showToast(error.message);
  }
}

async function enableTracking() {
  if (!state.orderId) return showToast("Create or load an order first.");
  try {
    await api(`/v1/tracking/orders/${state.orderId}/enable`, { method: "POST" });
    const tracking = await api(`/v1/tracking/orders/${state.orderId}`);
    $("trackingBody").innerHTML = `<div class="timeline-item"><strong>Tracking enabled</strong><br><small>${tracking.pings.length} pings received</small></div>`;
  } catch (error) {
    showToast(error.message);
  }
}

async function loadSuggestions() {
  const locationId = $("locationInput")?.value.trim() || store.location;
  if (!$("suggestions")) return;
  $("suggestions").innerHTML = `<div class="empty">Loading suggestions...</div>`;
  try {
    const data = await api(`/v1/insights/replenish?locationId=${encodeURIComponent(locationId)}`);
    $("suggestions").innerHTML = "";
    if (!data.suggestions?.length) {
      $("suggestions").innerHTML = `<div class="empty">Not enough purchase history yet. Suggestions start after repeat orders.</div>`;
      return;
    }
    for (const suggestion of data.suggestions) {
      const row = document.createElement("div");
      row.className = "catalog-item";
      row.innerHTML = `<div><strong></strong><small></small></div><button class="small-btn">Add</button>`;
      row.querySelector("strong").textContent = suggestion.productName;
      row.querySelector("small").textContent = `${suggestion.suggestedQty} every ${suggestion.avgIntervalDays} days`;
      row.querySelector("button").addEventListener("click", () => {
        state.items.push({ name: suggestion.productName, qty: suggestion.suggestedQty });
        store.basket = state.items;
        renderItems();
        showToast(`${suggestion.productName} added to your basket.`);
      });
      $("suggestions").appendChild(row);
    }
  } catch (error) {
    $("suggestions").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function loadIntegrations() {
  if (!$("integrationsList")) return;
  try {
    const data = await api("/v1/integrations/status");
    $("integrationsList").innerHTML = "";
    for (const integration of data.integrations || []) {
      const row = document.createElement("div");
      row.className = "integration-row";
      row.innerHTML = `<strong></strong><div class="pill-row"></div>`;
      row.querySelector("strong").textContent = integration.name;
      const pill = document.createElement("span");
      pill.className = integration.configured ? "pill" : "pill warn";
      pill.textContent = integration.configured ? "configured" : integration.status;
      row.querySelector(".pill-row").appendChild(pill);
      $("integrationsList").appendChild(row);
    }
    setResult("metricIntegrations", `${(data.integrations || []).filter((x) => x.configured).length}/${(data.integrations || []).length}`);
  } catch (error) {
    $("integrationsList").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function loadOpsMetrics() {
  if (!$("opsMetrics") && !$("metricOrders") && !$("metricGmv")) return;
  try {
    const data = await api("/v1/ops/metrics");
    setResult("metricOrders", data.orders ?? "--");
    setResult("metricGmv", cedis(data.gmvPesewas));
    setResult("opsMetrics", data);
  } catch (error) {
    setError("opsMetrics", error);
  }
}

async function registerRetailer() {
  try {
    const data = await api("/v1/identity/retailers/register", {
      method: "POST",
      body: JSON.stringify({
        phone: $("registerPhone").value,
        password: $("registerPassword").value,
        shopName: $("registerShop").value,
        address: $("registerAddress").value,
        landmark: $("registerLandmark").value,
        deliveryNotes: $("registerNotes").value || undefined,
      }),
    });
    saveSession(data);
    setResult("accountResult", data.verification?.message || "Your shop account is ready.");
    showToast("Your shop account is ready.");
    if (document.body.dataset.page === "landing") {
      window.location.assign("/home.html");
    }
  } catch (error) {
    setError("accountResult", error);
  }
}

async function registerSupplier() {
  try {
    const data = await api("/v1/identity/suppliers/register", {
      method: "POST",
      body: JSON.stringify({
        phone: $("supplierPhone").value,
        password: $("supplierPassword").value,
        businessName: $("supplierBusiness").value,
      }),
    });
    saveSession(data);
    setResult("accountResult", data.verification?.message || "Application submitted. It will be reviewed by our team.");
    showToast("Supplier application submitted.");
    if (document.body.dataset.page === "access") {
      window.location.assign("/supplier.html");
    }
  } catch (error) {
    setError("accountResult", error);
  }
}

async function login() {
  try {
    const data = await api("/v1/identity/login", {
      method: "POST",
      body: JSON.stringify({ phone: $("loginPhone").value, password: $("loginPassword").value }),
    });
    saveSession(data);
    setResult("accountResult", "Signed in successfully.");
    showToast("Welcome back.");
    const page = document.body.dataset.page;
    if (page === "landing" || page === "access") {
      window.location.assign(data.user?.role === "supplier" ? "/supplier.html" : data.user?.role === "admin" ? "/ops.html" : "/home.html");
    }
  } catch (error) {
    setError("accountResult", error);
  }
}

function saveSession(data) {
  store.token = data.token || "";
  store.user = data.user || null;
  store.account = data.retailer || data.supplier || null;
  if (data.retailer?.locations?.[0]?.id) store.location = data.retailer.locations[0].id;
  updateUserChip();
  updateAppIdentity();
}

async function loadMe() {
  try {
    const data = await api("/v1/identity/me");
    store.user = data.user;
    store.account = data.retailer || data.supplier || null;
    if (data.retailer?.locations?.[0]?.id) store.location = data.retailer.locations[0].id;
    updateUserChip();
    updateAppIdentity();
    setResult("accountResult", "Account details refreshed.");
  } catch (error) {
    setError("accountResult", error);
  }
}

async function logout() {
  try {
    if (store.token) await api("/v1/identity/logout", { method: "POST" });
  } catch {
    // Local logout still clears stale sessions.
  }
  store.token = "";
  store.user = null;
  store.account = null;
  updateUserChip();
  updateAppIdentity();
  setResult("accountResult", "Logged out.");
  if (document.body.dataset.page === "profile") window.location.assign("/");
}

async function createStaff() {
  try {
    const body = {
      phone: $("staffPhone").value,
      password: $("staffPassword").value,
      role: $("staffRole").value,
    };
    if ($("staffDailyCap").value) body.dailyCap = Number($("staffDailyCap").value);
    if ($("staffOrderCap").value) body.perOrderCap = Number($("staffOrderCap").value);
    const data = await api("/v1/identity/staff", { method: "POST", body: JSON.stringify(body) });
    setResult("accountResult", data);
    showToast("Staff account created.");
  } catch (error) {
    setError("accountResult", error);
  }
}

async function loadSupplier() {
  if (!$("supplierProfile")) return;
  try {
    const [profile, dashboard] = await Promise.all([
      api("/v1/suppliers/me"),
      api("/v1/suppliers/dashboard"),
    ]);
    setResult("supplierProfile", profile);
    $("supplierDashboard").innerHTML = "";
    for (const slice of dashboard.assignedSlices || []) {
      const row = document.createElement("div");
      row.className = "timeline-item";
      row.innerHTML = `<strong></strong><br><small></small>`;
      row.querySelector("strong").textContent = `${slice.orderId}: ${slice.status}`;
      row.querySelector("small").textContent = `${slice.items?.length || 0} item lines`;
      $("supplierDashboard").appendChild(row);
    }
  } catch (error) {
    setError("supplierProfile", error);
  }
}

async function loadSupplierProducts() {
  if (!$("supplierProducts")) return;
  $("supplierProducts").innerHTML = `<div class="empty">Loading products...</div>`;
  try {
    const data = await api("/v1/suppliers/products");
    $("supplierProducts").innerHTML = "";
    if (!data.products?.length) {
      $("supplierProducts").innerHTML = `<div class="empty">No products listed for this supplier.</div>`;
      return;
    }
    for (const product of data.products) {
      const row = document.createElement("div");
      row.className = "catalog-item";
      row.innerHTML = `
        <div><strong></strong><small></small></div>
        <button class="small-btn">Update stock</button>
      `;
      row.querySelector("strong").textContent = `${product.name}${product.variant ? ` ${product.variant}` : ""}`;
      row.querySelector("small").textContent = `${cedis(product.price)} / ${product.unit} - ${product.inStock} in stock`;
      row.querySelector("button").addEventListener("click", async () => {
        const nextStock = Number(prompt("New stock quantity", product.inStock));
        if (!Number.isSafeInteger(nextStock) || nextStock < 0) return;
        try {
          await api(`/v1/suppliers/products/${product.id}`, {
            method: "PATCH",
            body: JSON.stringify({ inStock: nextStock }),
          });
          await loadSupplierProducts();
        } catch (error) {
          showToast(error.message);
        }
      });
      $("supplierProducts").appendChild(row);
    }
  } catch (error) {
    $("supplierProducts").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function addSupplierProduct() {
  try {
    await api("/v1/suppliers/products", {
      method: "POST",
      body: JSON.stringify({
        name: $("productName").value,
        variant: $("productVariant").value || undefined,
        unit: $("productUnit").value,
        price: Number($("productPrice").value),
        inStock: Number($("productStock").value),
      }),
    });
    ["productName", "productVariant", "productUnit", "productPrice", "productStock"].forEach((id) => { $(id).value = ""; });
    await loadSupplierProducts();
    showToast("Product added.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAdminDashboard() {
  if (!$("adminDashboard")) return;
  try {
    const data = await api("/v1/admin/dashboard");
    $("adminDashboard").innerHTML = "";
    const rows = [
      ["Retailers", data.retailers],
      ["Pending suppliers", data.suppliers?.pending],
      ["Approved suppliers", data.suppliers?.approved],
      ["Open issues", data.openIssues],
    ];
    for (const [label, value] of rows) {
      const card = document.createElement("article");
      card.className = "metric";
      card.innerHTML = `<span></span><strong></strong>`;
      card.querySelector("span").textContent = label;
      card.querySelector("strong").textContent = value ?? "--";
      $("adminDashboard").appendChild(card);
    }
    setResult("metricIssues", data.openIssues ?? "--");
  } catch (error) {
    $("adminDashboard").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function loadOverviewMetrics() {
  if (store.user?.role !== "admin") {
    for (const id of ["metricOrders", "metricGmv", "metricIssues"]) setResult(id, "--");
    document.querySelectorAll("[data-admin-metric]").forEach((node) => {
      node.textContent = "Sign in with an admin account to view";
    });
    return;
  }
  try {
    const data = await api("/v1/admin/dashboard");
    setResult("metricOrders", data.orders ?? "--");
    setResult("metricGmv", cedis(data.quotedOrderValuePesewas));
    setResult("metricIssues", data.openIssues ?? "--");
  } catch (error) {
    document.querySelectorAll("[data-admin-metric]").forEach((node) => {
      node.textContent = error.message;
    });
  }
}

async function loadAdminSuppliers() {
  if (!$("adminSuppliers")) return;
  $("adminSuppliers").innerHTML = `<div class="empty">Loading suppliers...</div>`;
  try {
    const data = await api("/v1/admin/suppliers?status=pending");
    $("adminSuppliers").innerHTML = "";
    if (!data.suppliers?.length) {
      $("adminSuppliers").innerHTML = `<div class="empty">No supplier applications yet.</div>`;
      return;
    }
    for (const supplier of data.suppliers) {
      const row = document.createElement("div");
      row.className = "catalog-item";
      row.innerHTML = `
        <div><strong></strong><small></small></div>
        <div class="inline-actions">
          <button class="small-btn approve">Approve</button>
          <button class="small-btn muted reject">Reject</button>
        </div>
      `;
      row.querySelector("strong").textContent = supplier.name;
      row.querySelector("small").textContent = `${supplier.onboardingStatus} - ${supplier.users?.[0]?.phone || "no phone"}`;
      row.querySelector(".approve").addEventListener("click", () => reviewSupplier(supplier.id, "approved"));
      row.querySelector(".reject").addEventListener("click", () => reviewSupplier(supplier.id, "rejected"));
      $("adminSuppliers").appendChild(row);
    }
  } catch (error) {
    $("adminSuppliers").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

async function reviewSupplier(id, status) {
  try {
    await api(`/v1/admin/suppliers/${id}/review`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadAdminSuppliers();
    showToast(`Supplier ${status}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadOpsExceptions() {
  const orderId = $("exceptionOrderId")?.value.trim() || state.orderId;
  if (!orderId) return showToast("Enter an order ID.");
  try {
    const data = await api(`/v1/ops/exceptions?orderId=${encodeURIComponent(orderId)}`);
    setResult("opsExceptions", data);
  } catch (error) {
    setError("opsExceptions", error);
  }
}

function saveSettings() {
  if (!$("baseInput") || !$("defaultLocationInput")) return;
  store.base = $("baseInput").value.trim();
  store.location = $("defaultLocationInput").value.trim() || "loc_1";
  if ($("locationInput")) $("locationInput").value = store.location;
  setResult("settingsResult", { base: store.base || "(same origin)", location: store.location });
  checkHealth();
}

function wireVoice() {
  if (!$("micBtn") || !$("micHint")) return;
  const micState = $("micState");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("micBtn").disabled = true;
    $("micHint").textContent = "Voice input isn’t available in this browser. Type your request or browse products instead.";
    if (micState) micState.textContent = "TYPE OR BROWSE";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-GH";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    $("requestBox").value = ($("requestBox").value + " " + text).trim();
    addParsed(text);
    if (micState) {
      micState.innerHTML = `<span class="live-dot"></span> I HEARD YOU`;
    }
  };
  recognition.onend = () => {
    $("micBtn").classList.remove("listening");
    $("micBtn").setAttribute("aria-label", "Start voice input");
    if (micState && micState.textContent === "LISTENING…") micState.textContent = "READY WHEN YOU ARE";
  };
  recognition.onerror = (event) => {
    $("micBtn").classList.remove("listening");
    if (micState) micState.textContent = "VOICE INPUT UNAVAILABLE";
    $("micHint").textContent = event.error === "not-allowed"
      ? "Allow microphone access in your browser settings, or type the request instead."
      : "Voice input didn’t complete. You can type the request instead.";
  };
  $("micBtn").addEventListener("click", () => {
    try {
      $("micBtn").classList.add("listening");
      $("micBtn").setAttribute("aria-label", "Listening for your restock request");
      if (micState) micState.textContent = "LISTENING…";
      $("micHint").textContent = "Go ahead. You can review and change every item before getting a quote.";
      recognition.start();
    } catch (error) {
      $("micBtn").classList.remove("listening");
      if (micState) micState.textContent = "VOICE INPUT UNAVAILABLE";
      $("micHint").textContent = error.message || "Voice input could not start. Type the request instead.";
    }
  });
}

function updateAppIdentity() {
  const user = store.user;
  const account = store.account || {};
  const shopName = account.shopName || account.name || "Your shop";
  const initials = (shopName.match(/[A-Za-z0-9]/)?.[0] || user?.phone?.slice(-1) || "A").toUpperCase();
  for (const id of ["homeAvatar", "profileAvatar"]) {
    const node = $(id);
    if (node) node.textContent = initials;
  }
  const accountLabel = $("homeAccountLabel");
  if (accountLabel) accountLabel.textContent = user?.phone || "My account";
  const shopHeading = $("homeShopName");
  if (shopHeading) shopHeading.textContent = user ? shopName : "Your shop";
  const profileName = $("profileShopName");
  if (profileName) profileName.textContent = user ? shopName : "Welcome to Restock Ghana";
  const roleLabel = $("profileRole");
  if (roleLabel) roleLabel.textContent = user ? `${user.role.replaceAll("_", " ")}${user.phoneVerified ? " · verified" : ""}` : "Sign in to view your account.";
  const phone = $("profilePhone");
  if (phone) phone.textContent = user?.phone || "Not signed in";
  const accountType = $("profileAccountType");
  if (accountType) accountType.textContent = user?.role?.startsWith("retailer") ? "Retailer" : user?.role || "Retailer";
  const verification = $("profileVerification");
  if (verification) verification.textContent = user?.phoneVerified ? "Verified" : user ? "Not verified" : "Sign in to get started";
  const location = $("profileLocation");
  if (location) location.textContent = store.location;
  const supplierLink = $("supplierWorkspaceLink");
  if (supplierLink) supplierLink.hidden = user?.role !== "supplier";
  const adminLink = $("adminWorkspaceLink");
  if (adminLink) adminLink.hidden = user?.role !== "admin";
}

function selectAuthMode(mode) {
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  if (!loginForm || !registerForm) return;
  const isLogin = mode !== "register";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  $("loginTab")?.classList.toggle("active", isLogin);
  $("registerTab")?.classList.toggle("active", !isLogin);
  $("loginTab")?.setAttribute("aria-selected", String(isLogin));
  $("registerTab")?.setAttribute("aria-selected", String(!isLogin));
}

function wireLanding() {
  if (document.body.dataset.page !== "landing") return;
  $("loginTab")?.addEventListener("click", () => selectAuthMode("login"));
  $("registerTab")?.addEventListener("click", () => selectAuthMode("register"));
  document.querySelectorAll("[data-auth-mode]").forEach((link) => {
    link.addEventListener("click", () => selectAuthMode(link.dataset.authMode));
  });
  $("loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });
  $("registerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    registerRetailer();
  });
  if (window.location.hash === "#account") selectAuthMode("login");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(date);
}

function renderHomeSuggestions(suggestions) {
  const due = suggestions.filter((item) => item.dueNow);
  const lowName = $("runningLowName");
  const lowDetail = $("runningLowDetail");
  if (lowName) lowName.textContent = due[0]?.productName || "Your essentials";
  if (lowDetail) {
    lowDetail.textContent = due[0]
      ? `${due[0].suggestedQty} suggested · ready to restock`
      : "Your repeat items will show here";
  }
  const weeklyName = $("weeklyName");
  const weeklyDetail = $("weeklyDetail");
  const next = suggestions[0];
  if (weeklyName) weeklyName.textContent = next?.productName || "A smarter restock";
  if (weeklyDetail) {
    weeklyDetail.textContent = next
      ? `About every ${next.avgIntervalDays} days · ${next.suggestedQty} suggested`
      : "Suggestions grow as you place orders";
  }
}

async function loadHome() {
  updateAppIdentity();
  if (!store.user) {
    setResult("runningLowDetail", "Sign in to see restock suggestions.");
    setResult("deliveryStatus", "Sign in to track orders");
    setResult("lastOrderName", "No orders yet");
    return;
  }
  const locationId = store.location;
  const suggestionsRequest = api(`/v1/insights/replenish?locationId=${encodeURIComponent(locationId)}`);
  const suggestionsBox = $("runningLowDetail");
  if (suggestionsBox) suggestionsBox.textContent = "Checking your restock history…";
  try {
    const data = await suggestionsRequest;
    renderHomeSuggestions(data.suggestions || []);
  } catch (error) {
    if (suggestionsBox) suggestionsBox.textContent = error.message;
  }

  const lastOrder = $("lastOrderName");
  const lastDetail = $("lastOrderDetail");
  const delivery = $("deliveryStatus");
  const deliveryDetail = $("deliveryDetail");
  if (!state.orderId) {
    if (lastOrder) lastOrder.textContent = "No orders yet";
    if (lastDetail) lastDetail.textContent = "Your first restock is one request away.";
    if (delivery) delivery.textContent = "No active delivery";
    if (deliveryDetail) deliveryDetail.textContent = "Your delivery updates will appear here.";
    return;
  }
  if (lastOrder) lastOrder.textContent = `Order ${state.orderId.slice(-6)}`;
  if (lastDetail) lastDetail.textContent = "Open your quote and order timeline.";
  try {
    const timeline = await api(`/v1/orders/${encodeURIComponent(state.orderId)}/timeline`);
    const status = String(timeline.status || "Order received").replaceAll("_", " ");
    if (delivery) delivery.textContent = status;
    if (deliveryDetail) {
      const supplierCount = timeline.slices?.length || 0;
      deliveryDetail.textContent = supplierCount
        ? `${supplierCount} supplier ${supplierCount === 1 ? "is" : "s are"} coordinating your order.`
        : `Order ${state.orderId.slice(-6)} · view latest updates`;
    }
    if (lastDetail) lastDetail.textContent = `Updated ${formatDate(timeline.events?.at(-1)?.at) || "recently"} · ${status}`;
  } catch (error) {
    if (deliveryDetail) deliveryDetail.textContent = error.message;
  }
}

let retailerProducts = [];

function renderRetailerCatalog(query = "") {
  const root = $("retailerCatalog");
  if (!root) return;
  const term = query.trim().toLowerCase();
  const filtered = retailerProducts.filter((product) =>
    `${product.name} ${product.variant || ""} ${product.supplierName || ""}`.toLowerCase().includes(term),
  );
  root.innerHTML = "";
  if (!filtered.length) {
    root.innerHTML = `<div class="empty">${term ? "No products or suppliers match that search." : "No approved supplier products are available yet. Please check again later."}</div>`;
    return;
  }
  const groups = new Map();
  for (const product of filtered) {
    const name = product.supplierName || "Local supplier";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(product);
  }
  for (const [name, products] of groups) {
    const group = document.createElement("article");
    group.className = "supplier-group";
    const heading = document.createElement("header");
    const copy = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = name;
    const detail = document.createElement("p");
    detail.textContent = `${products.length} ${products.length === 1 ? "available product" : "available products"}`;
    copy.append(title, detail);
    heading.append(copy);
    group.appendChild(heading);
    const list = document.createElement("div");
    list.className = "product-list";
    for (const product of products) {
      const row = document.createElement("div");
      row.className = "product-row";
      const token = document.createElement("span");
      token.className = "product-token";
      token.textContent = product.name.slice(0, 1).toUpperCase();
      const text = document.createElement("div");
      const productName = document.createElement("strong");
      productName.textContent = `${product.name}${product.variant ? ` · ${product.variant}` : ""}`;
      const meta = document.createElement("small");
      meta.textContent = `${cedis(product.price)} / ${product.unit} · ${product.inStock} in stock`;
      text.append(productName, meta);
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-light";
      add.textContent = product.inStock > 0 ? "Add" : "Out of stock";
      add.disabled = product.inStock <= 0;
      add.addEventListener("click", () => {
        state.items.push({ name: product.name, qty: 1 });
        store.basket = state.items;
        showToast(`${product.name} added to your restock list.`);
      });
      row.append(token, text, add);
      list.appendChild(row);
    }
    group.appendChild(list);
    root.appendChild(group);
  }
}

async function loadRetailerCatalog() {
  const root = $("retailerCatalog");
  if (!root) return;
  root.innerHTML = `<div class="empty">Loading approved supplier products…</div>`;
  try {
    const products = await api("/v1/catalog/products");
    retailerProducts = Array.isArray(products) ? products : products.products || products.results || [];
    renderRetailerCatalog($("supplierSearch")?.value || "");
  } catch (error) {
    root.innerHTML = "";
    const message = document.createElement("div");
    message.className = "empty";
    message.textContent = `We couldn’t load supplier products: ${error.message}`;
    root.appendChild(message);
  }
}

async function loadProfile() {
  updateAppIdentity();
  if (store.token) await loadMe();
}

function bindEvents() {
  const actions = {
    parseBtn: () => addParsed($("requestBox").value),
    browseBtn: browseCatalog,
    clearItemsBtn: () => { state.items = []; store.basket = state.items; renderItems(); },
    quoteBtn: createQuote,
    payBtn: attemptPayment,
    lookupOrderBtn: () => loadOrder().catch((error) => showToast(error.message)),
    refreshOrderBtn: () => loadOrder().catch((error) => showToast(error.message)),
    issueBtn: openIssue,
    reorderBtn: reorder,
    recurringBtn: subscribeRecurring,
    trackBtn: enableTracking,
    replenishBtn: loadSuggestions,
    loadIntegrationsBtn: loadIntegrations,
    registerSupplierBtn: registerSupplier,
    meBtn: loadMe,
    logoutBtn: logout,
    createStaffBtn: createStaff,
    supplierMeBtn: loadSupplier,
    supplierProductsBtn: loadSupplierProducts,
    addProductBtn: addSupplierProduct,
    adminDashboardBtn: loadAdminDashboard,
    adminSuppliersBtn: loadAdminSuppliers,
    opsMetricsBtn: loadOpsMetrics,
    opsExceptionsBtn: loadOpsExceptions,
    saveSettingsBtn: saveSettings,
    refreshCatalogBtn: loadRetailerCatalog,
  };
  for (const [id, action] of Object.entries(actions)) {
    $(id)?.addEventListener("click", action);
  }
  $("requestBox")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) addParsed(event.currentTarget.value);
  });
  $("supplierSearch")?.addEventListener("input", (event) => renderRetailerCatalog(event.currentTarget.value));
}

async function refreshCurrent() {
  await checkHealth();
  if (state.activeScreen === "dashboard") {
    await Promise.allSettled([loadOpsMetrics(), loadIntegrations()]);
  }
  if (state.activeScreen === "orders" && state.orderId) {
    await loadOrder().catch((error) => showToast(error.message));
  }
  if (state.activeScreen === "supplier") {
    await Promise.allSettled([loadSupplier(), loadSupplierProducts()]);
  }
  if (state.activeScreen === "admin") {
    await Promise.allSettled([loadAdminDashboard(), loadAdminSuppliers(), loadOpsMetrics()]);
  }
}

function boot() {
  const assignValue = (id, value) => {
    const input = $(id);
    if (input) input.value = value;
  };
  if (!store.user && store.token) {
    store.token = "";
    store.user = null;
    store.account = null;
  }
  assignValue("baseInput", store.base);
  assignValue("defaultLocationInput", store.location);
  assignValue("locationInput", store.location);
  state.orderId = new URLSearchParams(window.location.search).get("orderId") || state.orderId;
  assignValue("orderLookupInput", state.orderId);
  assignValue("exceptionOrderId", state.orderId);
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === state.activeScreen;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  updateUserChip();
  updateAppIdentity();
  renderItems();
  bindEvents();
  wireVoice();
  wireLanding();
  checkHealth();
  if (state.activeScreen === "home") loadHome();
  if (state.activeScreen === "suppliers") loadRetailerCatalog();
  if (state.activeScreen === "profile") loadProfile();
  if (state.activeScreen === "landing" && store.user) {
    window.location.replace(store.user.role === "supplier" ? "/supplier.html" : store.user.role === "admin" ? "/ops.html" : "/home.html");
    return;
  }
  if (state.activeScreen === "overview") { loadIntegrations(); loadOverviewMetrics(); }
  if (state.activeScreen === "settings") loadIntegrations();
  if (state.activeScreen === "ops") {
    if (store.user?.role === "admin") {
      loadOpsMetrics();
      loadAdminDashboard();
      loadAdminSuppliers();
    } else {
      for (const id of ["opsMetrics", "adminDashboard", "adminSuppliers"]) {
        const node = $(id);
        if (node) node.innerHTML = `<div class="empty">Sign in with an admin account to view operations data.</div>`;
      }
    }
  }
  if (state.activeScreen === "orders" && state.orderId) {
    loadOrder().catch((error) => showToast(error.message));
  }
  if (state.activeScreen === "access" && store.token) loadMe();
  if (state.activeScreen === "supplier" && store.token) {
    loadSupplier();
    loadSupplierProducts();
  }
  if (state.activeScreen === "restock" && store.user) {
    api(`/v1/insights/replenish?locationId=${encodeURIComponent(store.location)}`)
      .then((data) => {
        const box = $("suggestions");
        if (!box) return;
        box.innerHTML = "";
        const suggestions = data.suggestions || [];
        if (!suggestions.length) {
          box.innerHTML = `<div class="empty">As your shop places orders, we’ll suggest products when they’re due for a restock.</div>`;
          return;
        }
        for (const suggestion of suggestions) {
          const row = document.createElement("div");
          row.className = "product-row";
          row.innerHTML = `<span class="product-token"></span><div><strong></strong><small></small></div><button class="button button-light" type="button">Add</button>`;
          row.querySelector(".product-token").textContent = suggestion.productName.slice(0, 1).toUpperCase();
          row.querySelector("strong").textContent = suggestion.productName;
          row.querySelector("small").textContent = `${suggestion.suggestedQty} suggested · every ${suggestion.avgIntervalDays} days`;
          row.querySelector("button").addEventListener("click", () => {
            state.items.push({ name: suggestion.productName, qty: suggestion.suggestedQty });
            store.basket = state.items;
            renderItems();
            showToast(`${suggestion.productName} added to your restock list.`);
          });
          box.appendChild(row);
        }
      })
      .catch((error) => {
        const box = $("suggestions");
        if (box) box.innerHTML = `<div class="empty">We couldn’t load your suggestions: ${error.message}</div>`;
      });
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed.", error));
  }
}

boot();
