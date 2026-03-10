// AD Bakery - Front-end app (menu, cart, billing, reports, menu management)

// Storage keys
const STORAGE_KEYS = {
  MENU: "adBakery_menu",
  SALES: "adBakery_sales",
  CART: "adBakery_cart",
};

// Simple versioning to refresh default menu when we change images/structure
const MENU_VERSION_KEY = "adBakery_menu_version";
const MENU_VERSION = 6;

// In-memory state
let menuItems = [];
let sales = [];
let cart = {};
let editingItemId = null;

// Default image for items without URL (fallback to first uploaded image)
const DEFAULT_IMAGE = "./chicken puffs.JPG";

// Utility: load and save JSON to localStorage
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Initialize default menu based on requirements
function getDefaultMenu() {
  const baseItems = [
    {
      name: "Chicken Puff",
      price: 25,
      imageUrl: "./chicken puffs.JPG",
    },
    {
      name: "Chicken Roll",
      price: 20,
      imageUrl: "./cr.jpg",
    },
    {
      name: "Veg Puffs",
      price: 20,
      imageUrl: "./vp.jpg",
    },
    {
      name: "Veg Roll",
      price: 15,
      imageUrl: "./vr.jpg",
    },
    {
      name: "Egg Puffs",
      price: 30,
      imageUrl: "./ep.jpg",
    },
    {
      name: "Samosa",
      price: 12,
      imageUrl: "./s.jpg",
    },
    {
      name: "Cream Bun",
      price: 10,
      imageUrl: "./cb.jpg",
    },
    {
      name: "Paneer Puffs",
      price: 15,
      imageUrl: "./pp.jpg",
    },
    {
      name: "Paneer Roll",
      price: 15,
      imageUrl: "./pr.jpg",
    },
    {
      name: "Onion Pakoda",
      price: 50,
      imageUrl: "./op.jpg",
    },
    {
      name: "Cakes",
      price: 40,
      imageUrl: "./ck.jpg",
    },
    {
      name: "Chips",
      price: 20,
      imageUrl: "./cp.jpg",
    },
  ];

  return baseItems.map((item, index) => ({
    id: `item-${index + 1}`,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl || DEFAULT_IMAGE,
    isAvailable: true,
  }));
}

// ---- Rendering helpers ----

function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

// Section navigation
function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".section");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      // Toggle button active state
      buttons.forEach((b) => b.classList.remove("nav-btn-active"));
      btn.classList.add("nav-btn-active");
      // Toggle sections
      sections.forEach((section) => {
        section.classList.toggle(
          "section-active",
          section.id === targetId
        );
      });
    });
  });

  // Make first button active initially
  const firstBtn = buttons[0];
  if (firstBtn) {
    firstBtn.classList.add("nav-btn-active");
  }
}

// ---- Menu rendering and interactions ----

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  if (!grid) return;
  grid.innerHTML = "";

  menuItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-card";

    const img = document.createElement("img");
    img.src = item.imageUrl || DEFAULT_IMAGE;
    img.alt = item.name;

    const body = document.createElement("div");
    body.className = "menu-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "menu-card-title-row";

    const title = document.createElement("div");
    title.className = "menu-card-title";
    title.textContent = item.name;
    titleRow.appendChild(title);

    if (!item.isAvailable) {
      const badge = document.createElement("span");
      badge.className = "menu-badge-unavailable";
      badge.textContent = "Unavailable";
      titleRow.appendChild(badge);
    }

    const footer = document.createElement("div");
    footer.className = "menu-card-footer";

    const price = document.createElement("span");
    price.className = "menu-price";
    price.textContent = formatCurrency(item.price);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "menu-add-btn";
    addBtn.textContent = "Add";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!item.isAvailable) return;
      addToCart(item.id);
    });

    footer.appendChild(price);
    footer.appendChild(addBtn);

    body.appendChild(titleRow);
    body.appendChild(footer);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", () => {
      if (!item.isAvailable) return;
      addToCart(item.id);
    });

    grid.appendChild(card);
  });
}

// ---- Cart logic ----

function addToCart(itemId) {
  const item = menuItems.find((m) => m.id === itemId);
  if (!item || !item.isAvailable) return;

  if (!cart[itemId]) {
    cart[itemId] = {
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    };
  } else {
    cart[itemId].quantity += 1;
  }

  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
  buildBillPreview();
}

function updateCartItemQuantity(itemId, newQty) {
  if (!cart[itemId]) return;
  if (newQty <= 0) {
    delete cart[itemId];
  } else {
    cart[itemId].quantity = newQty;
  }
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
  buildBillPreview();
}

function removeCartItem(itemId) {
  if (!cart[itemId]) return;
  delete cart[itemId];
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
  buildBillPreview();
}

function clearCart() {
  cart = {};
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
  buildBillPreview();
}

function calculateTotals() {
  let total = 0;
  Object.values(cart).forEach((entry) => {
    total += entry.price * entry.quantity;
  });
  return { grandTotal: total };
}

function renderCart() {
  const tbody = document.getElementById("cart-body");
  const totalEl = document.getElementById("cart-grand-total");
  if (!tbody || !totalEl) return;

  tbody.innerHTML = "";
  const entries = Object.values(cart);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Cart is empty. Click on menu items to add.";
    cell.className = "text-muted";
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    entries.forEach((entry) => {
      const row = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = entry.name;

      const priceTd = document.createElement("td");
      priceTd.textContent = formatCurrency(entry.price);

      const qtyTd = document.createElement("td");
      const qtyControls = document.createElement("div");
      qtyControls.className = "cart-qty-controls";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "cart-qty-btn";
      minusBtn.textContent = "-";
      minusBtn.addEventListener("click", () =>
        updateCartItemQuantity(entry.itemId, entry.quantity - 1)
      );

      const qtySpan = document.createElement("span");
      qtySpan.textContent = entry.quantity;

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "cart-qty-btn";
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () =>
        updateCartItemQuantity(entry.itemId, entry.quantity + 1)
      );

      qtyControls.appendChild(minusBtn);
      qtyControls.appendChild(qtySpan);
      qtyControls.appendChild(plusBtn);
      qtyTd.appendChild(qtyControls);

      const lineTotalTd = document.createElement("td");
      const lineTotal = entry.price * entry.quantity;
      lineTotalTd.textContent = formatCurrency(lineTotal);

      const removeTd = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ghost";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => removeCartItem(entry.itemId));
      removeTd.appendChild(removeBtn);

      row.appendChild(nameTd);
      row.appendChild(priceTd);
      row.appendChild(qtyTd);
      row.appendChild(lineTotalTd);
      row.appendChild(removeTd);

      tbody.appendChild(row);
    });
  }

  const { grandTotal } = calculateTotals();
  totalEl.textContent = formatCurrency(grandTotal);
}

// ---- Billing, Pay Now (QR), and Print ----

function showQrOverlay() {
  const overlay = document.getElementById("qr-overlay");
  const qrAmount = document.getElementById("qr-amount");
  const { grandTotal } = calculateTotals();

  if (Object.keys(cart).length === 0) {
    alert("Cart is empty. Add items before proceeding to payment.");
    return;
  }

  if (qrAmount) {
    qrAmount.textContent = formatCurrency(grandTotal);
  }
  if (overlay) {
    overlay.classList.remove("hidden");
  }
}

function hideQrOverlay() {
  const overlay = document.getElementById("qr-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function completeOrder() {
  if (Object.keys(cart).length === 0) {
    alert("Cart is empty. Cannot complete order.");
    return;
  }

  const { grandTotal } = calculateTotals();
  const items = Object.values(cart).map((entry) => ({
    itemId: entry.itemId,
    name: entry.name,
    price: entry.price,
    quantity: entry.quantity,
    lineTotal: entry.price * entry.quantity,
  }));

  const order = {
    id: `order-${Date.now()}`,
    timestamp: new Date().toISOString(),
    items,
    grandTotal,
  };

  sales.push(order);
  saveToStorage(STORAGE_KEYS.SALES, sales);

  clearCart();
  hideQrOverlay();

  alert("Order recorded successfully.");
}

function buildBillPreview() {
  const container = document.getElementById("bill-container");
  if (!container) return;

  const entries = Object.values(cart);
  const { grandTotal } = calculateTotals();

  if (entries.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No items yet. Add items from the menu to see the bill.</p>';
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();

  let html = "";
  html += '<div class="bill-header">';
  html += "<h3>AD Bakery</h3>";
  html += "<p>Fresh puffs, rolls &amp; more</p>";
  html += "</div>";

  html += '<div class="bill-meta">';
  html += `<div>Date: ${dateStr}</div>`;
  html += `<div>Time: ${timeStr}</div>`;
  html += "</div>";

  html += '<table class="bill-items-table">';
  html += "<thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>";
  html += "<tbody>";

  entries.forEach((entry) => {
    const lineTotal = entry.price * entry.quantity;
    html += "<tr>";
    html += `<td>${entry.name}</td>`;
    html += `<td>${entry.quantity}</td>`;
    html += `<td>${formatCurrency(entry.price)}</td>`;
    html += `<td>${formatCurrency(lineTotal)}</td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";

  html += '<div class="bill-footer">';
  html += `<div>Grand Total: ${formatCurrency(grandTotal)}</div>`;
  html += "</div>";

  container.innerHTML = html;
}

function printBill() {
  if (Object.keys(cart).length === 0) {
    alert("Cart is empty. Add items before printing a bill.");
    return;
  }
  buildBillPreview();
  window.print();
}

// ---- Reports (monthly sales) ----

function setupReportSelectors() {
  const monthSel = document.getElementById("report-month");
  const yearSel = document.getElementById("report-year");
  if (!monthSel || !yearSel) return;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  monthSel.innerHTML = "";
  monthNames.forEach((name, idx) => {
    const opt = document.createElement("option");
    opt.value = idx.toString();
    opt.textContent = name;
    monthSel.appendChild(opt);
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  yearSel.innerHTML = "";
  for (let y = currentYear - 3; y <= currentYear + 1; y++) {
    const opt = document.createElement("option");
    opt.value = y.toString();
    opt.textContent = y.toString();
    if (y === currentYear) {
      opt.selected = true;
    }
    yearSel.appendChild(opt);
  }

  monthSel.value = now.getMonth().toString();
}

function getMonthlyReport(year, monthIndex) {
  const result = {
    totalOrders: 0,
    totalRevenue: 0,
    perItem: {}, // name -> { quantitySold, revenue }
  };

  sales.forEach((order) => {
    const date = new Date(order.timestamp);
    if (
      date.getFullYear() === year &&
      date.getMonth() === monthIndex
    ) {
      result.totalOrders += 1;
      result.totalRevenue += order.grandTotal;
      order.items.forEach((item) => {
        if (!result.perItem[item.name]) {
          result.perItem[item.name] = {
            quantitySold: 0,
            revenue: 0,
          };
        }
        result.perItem[item.name].quantitySold += item.quantity;
        result.perItem[item.name].revenue += item.lineTotal;
      });
    }
  });

  return result;
}

function renderMonthlyReport() {
  const monthSel = document.getElementById("report-month");
  const yearSel = document.getElementById("report-year");
  const summaryEl = document.getElementById("report-summary");
  const bodyEl = document.getElementById("report-body");

  if (!monthSel || !yearSel || !summaryEl || !bodyEl) return;

  const monthIndex = parseInt(monthSel.value, 10);
  const year = parseInt(yearSel.value, 10);
  const report = getMonthlyReport(year, monthIndex);

  summaryEl.innerHTML = `
    <p><strong>Total orders:</strong> ${report.totalOrders}</p>
    <p><strong>Total revenue:</strong> ${formatCurrency(
      report.totalRevenue
    )}</p>
  `;

  bodyEl.innerHTML = "";
  const items = Object.entries(report.perItem);
  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No sales for this month yet.";
    cell.className = "text-muted";
    row.appendChild(cell);
    bodyEl.appendChild(row);
  } else {
    items.forEach(([name, stats]) => {
      const row = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = name;

      const qtyTd = document.createElement("td");
      qtyTd.textContent = stats.quantitySold.toString();

      const revTd = document.createElement("td");
      revTd.textContent = formatCurrency(stats.revenue);

      row.appendChild(nameTd);
      row.appendChild(qtyTd);
      row.appendChild(revTd);

      bodyEl.appendChild(row);
    });
  }
}

// ---- Manage menu (CRUD) ----

function renderManageMenuTable() {
  const tbody = document.getElementById("manage-menu-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (menuItems.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No menu items found.";
    cell.className = "text-muted";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  menuItems.forEach((item) => {
    const row = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = item.name;

    const priceTd = document.createElement("td");
    priceTd.textContent = formatCurrency(item.price);

    const availTd = document.createElement("td");
    availTd.textContent = item.isAvailable ? "Yes" : "No";

    const actionsTd = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "manage-menu-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => loadItemIntoForm(item.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteMenuItem(item.id));

    actionsWrap.appendChild(editBtn);
    actionsWrap.appendChild(delBtn);
    actionsTd.appendChild(actionsWrap);

    row.appendChild(nameTd);
    row.appendChild(priceTd);
    row.appendChild(availTd);
    row.appendChild(actionsTd);

    tbody.appendChild(row);
  });
}

function loadItemIntoForm(itemId) {
  const item = menuItems.find((m) => m.id === itemId);
  if (!item) return;

  editingItemId = item.id;
  document.getElementById("menu-item-id").value = item.id;
  document.getElementById("menu-item-name").value = item.name;
  document.getElementById("menu-item-price").value = item.price.toString();
  document.getElementById("menu-item-image").value =
    item.imageUrl === DEFAULT_IMAGE ? "" : item.imageUrl;
  document.getElementById("menu-item-available").checked = item.isAvailable;

  const submitBtn = document.getElementById("menu-form-submit");
  if (submitBtn) submitBtn.textContent = "Update Item";
}

function resetMenuForm() {
  const form = document.getElementById("menu-form");
  if (form) form.reset();
  editingItemId = null;
  document.getElementById("menu-item-id").value = "";
  const submitBtn = document.getElementById("menu-form-submit");
  if (submitBtn) submitBtn.textContent = "Save Item";
}

function deleteMenuItem(itemId) {
  if (!confirm("Delete this item from the menu?")) return;

  menuItems = menuItems.filter((m) => m.id !== itemId);
  saveToStorage(STORAGE_KEYS.MENU, menuItems);

  // Remove from cart if present
  if (cart[itemId]) {
    delete cart[itemId];
    saveToStorage(STORAGE_KEYS.CART, cart);
  }

  renderMenu();
  renderManageMenuTable();
  renderCart();
  buildBillPreview();
}

function handleMenuFormSubmit(event) {
  event.preventDefault();

  const nameInput = document.getElementById("menu-item-name");
  const priceInput = document.getElementById("menu-item-price");
  const imageInput = document.getElementById("menu-item-image");
  const availableInput = document.getElementById("menu-item-available");

  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const imageUrl = imageInput.value.trim();
  const isAvailable = availableInput.checked;

  if (!name || Number.isNaN(price) || price < 0) {
    alert("Please enter a valid item name and price.");
    return;
  }

  if (editingItemId) {
    // Update existing
    const item = menuItems.find((m) => m.id === editingItemId);
    if (!item) return;
    item.name = name;
    item.price = price;
    item.imageUrl = imageUrl || DEFAULT_IMAGE;
    item.isAvailable = isAvailable;
  } else {
    // Create new
    const newItem = {
      id: `item-${Date.now()}`,
      name,
      price,
      imageUrl: imageUrl || DEFAULT_IMAGE,
      isAvailable,
    };
    menuItems.push(newItem);
  }

  saveToStorage(STORAGE_KEYS.MENU, menuItems);
  renderMenu();
  renderManageMenuTable();
  resetMenuForm();
}

// ---- Initialization ----

function initState() {
  const storedVersion = loadFromStorage(MENU_VERSION_KEY, null);
  menuItems = loadFromStorage(STORAGE_KEYS.MENU, []);

  const needResetMenu =
    !Array.isArray(menuItems) ||
    menuItems.length === 0 ||
    storedVersion !== MENU_VERSION ||
    menuItems.some((item) => !item.imageUrl);

  if (needResetMenu) {
    menuItems = getDefaultMenu();
    saveToStorage(STORAGE_KEYS.MENU, menuItems);
    saveToStorage(MENU_VERSION_KEY, MENU_VERSION);
  }

  sales = loadFromStorage(STORAGE_KEYS.SALES, []);
  if (!Array.isArray(sales)) sales = [];

  cart = loadFromStorage(STORAGE_KEYS.CART, {});
  if (!cart || typeof cart !== "object") cart = {};
}

function initEventHandlers() {
  // Cart buttons
  const clearBtn = document.getElementById("btn-clear-cart");
  if (clearBtn) clearBtn.addEventListener("click", clearCart);

  const payNowBtn = document.getElementById("btn-pay-now");
  if (payNowBtn) payNowBtn.addEventListener("click", showQrOverlay);

  const printBtn = document.getElementById("btn-print-bill");
  if (printBtn) printBtn.addEventListener("click", printBill);

  const closeQrBtn = document.getElementById("btn-close-qr");
  if (closeQrBtn) closeQrBtn.addEventListener("click", hideQrOverlay);

  const paymentDoneBtn = document.getElementById("btn-payment-done");
  if (paymentDoneBtn)
    paymentDoneBtn.addEventListener("click", completeOrder);

  // Reports
  const genReportBtn = document.getElementById("btn-generate-report");
  if (genReportBtn)
    genReportBtn.addEventListener("click", renderMonthlyReport);

  // Manage menu form
  const menuForm = document.getElementById("menu-form");
  if (menuForm)
    menuForm.addEventListener("submit", handleMenuFormSubmit);

  const resetBtn = document.getElementById("menu-form-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetMenuForm);
}

document.addEventListener("DOMContentLoaded", () => {
  initState();
  setupNavigation();
  setupReportSelectors();
  initEventHandlers();

  renderMenu();
  renderCart();
  buildBillPreview();
  renderManageMenuTable();
  renderMonthlyReport();
});

