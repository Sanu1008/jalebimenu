document.addEventListener('DOMContentLoaded', () => {

  const menuItemsDiv = document.getElementById('menuItems');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartButton = document.getElementById('cartButton');

  const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
  const cartItemsDiv = document.getElementById('cartItems');
  const cartTotalSpan = document.getElementById('cartTotal');
  const sendOrderBtn = document.getElementById('sendOrderBtn');

  // ================= ORDER TYPE ELEMENTS =================
  const orderType = document.getElementById('orderType');
  const diningFields = document.getElementById('diningFields');
  const deliveryFields = document.getElementById('deliveryFields');

  const tableNo = document.getElementById('tableNo');
  const personsCount = document.getElementById('personsCount');

  const custName = document.getElementById('custName');
  const custMobile = document.getElementById('custMobile');
  const custAddress = document.getElementById('custAddress');
  const autoAddressBtn = document.getElementById('autoAddressBtn');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');

  // ================= ORDER TYPE TOGGLE =================
  orderType.addEventListener('change', () => {
    const isDining = orderType.value === 'dining';
    diningFields.style.display = isDining ? 'block' : 'none';
    deliveryFields.style.display = isDining ? 'none' : 'block';
  });

  if (!menuItemsDiv || !searchInput || !categoryFilter || !cartButton) return;

  let allItems = [];
  let cart = [];

  // ---------------- Fetch menu items ----------------
  async function fetchMenuItems() {
    const res = await fetch('/api/items');
    const data = await res.json();

    allItems = data.map(i => ({
      ...i,
      price: i.price !== null ? Number(i.price) : null,
      image_base64: i.image_base64 || ''
    }));

    populateCategoryFilter();
    renderItems(allItems);
  }

  // ---------------- Categories ----------------
  function populateCategoryFilter() {
    categoryFilter.innerHTML = `<option value="">All Categories</option>`;
    [...new Set(allItems.map(i => i.category))]
      .forEach(c => categoryFilter.innerHTML += `<option>${c}</option>`);
  }

 // ---------------- Render Items ----------------
function renderItems(items) {
  menuItemsDiv.innerHTML = '';
  items.forEach(item => {
    let priceOptions = '';
    if (item.price !== null && item.price > 0) {
      priceOptions += `<option value="${item.price}">Regular - ${item.price.toFixed(3)} BHD</option>`;
    }
    if (item.extra_prices) {
      item.extra_prices.forEach(p => {
        priceOptions += `<option value="${p.price}">${p.label} - ${Number(p.price).toFixed(3)} BHD</option>`;
      });
    }

    const col = document.createElement('div');
    col.className = 'col';

    col.innerHTML = `
      <div class="card menu-card shadow-sm" data-id="${item.id}">
        ${item.image_base64 ? `<img src="${item.image_base64}" class="menu-img">` : ''}
        <div class="card-body">
          <h6 class="fw-bold">${item.name}</h6>
          <small class="variant-display text-muted mb-1 d-block">${item.extra_prices && item.extra_prices.length ? 'Regular' : ''}</small>
          <select class="form-select form-select-sm my-2 price-select">
            ${priceOptions}
          </select>
          <div class="qty-wrapper d-flex justify-content-center align-items-center gap-2 mb-2">
            <button class="btn btn-outline-secondary qty-minus">−</button>
            <span class="qty-badge badge bg-success px-3">0</span>
            <button class="btn btn-outline-secondary qty-plus">+</button>
          </div>
          <div class="text-center small text-success fw-bold">Tap + to add</div>
        </div>
      </div>
    `;

    menuItemsDiv.appendChild(col);
  });
}

// ---------------- Update Variant Display ----------------
document.addEventListener('change', e => {
  if (!e.target.classList.contains('price-select')) return;

  const card = e.target.closest('.card');
  const variantDisplay = card.querySelector('.variant-display');
  const selectedVariant = e.target.options[e.target.selectedIndex].text.split(' - ')[0];
  variantDisplay.textContent = selectedVariant;
});


  // ---------------- Search/Filter ----------------
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allItems.filter(i =>
      i.name.toLowerCase().includes(term) &&
      (!categoryFilter.value || i.category === categoryFilter.value)
    );
    renderItems(filtered);
  });

  categoryFilter.addEventListener('change', () =>
    searchInput.dispatchEvent(new Event('input'))
  );

  // ---------------- Card Qty + - (With Variants) ----------------
  document.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;

    const id = card.dataset.id;
    const priceSelect = card.querySelector('.price-select');
    const price = parseFloat(priceSelect.value);
    const variant = priceSelect.options[priceSelect.selectedIndex].text.split(' - ')[0];

    const badge = card.querySelector('.qty-badge');

    const item = allItems.find(i => i.id == id);
    if (!item) return;

    const key = id + '-' + price; // unique per variant
    const existing = cart.find(c => c.key === key);

    let current = parseInt(badge.textContent);

    if (e.target.classList.contains('qty-plus')) {
      current++;
      badge.textContent = current;
      if (existing) existing.qty++;
      else cart.push({ key, name: item.name, variant, price, qty: 1 });
      updateCartButton();
    }

    if (e.target.classList.contains('qty-minus')) {
      if (current <= 0) return;
      current--;
      badge.textContent = current;
      if (!existing) return;
      existing.qty--;
      if (existing.qty <= 0) cart = cart.filter(c => c.key !== key);
      updateCartButton();
    }
  });

  // ---------------- Update Cart Button (Show Variant Summary) ----------------
  // ---------------- Update Cart Button (Simple Summary) ----------------
function updateCartButton() {
  if (!cart.length) {
    cartButton.style.display = 'none';
    return;
  }

  cartButton.style.display = 'block';

  // Option 1: Show only total item count
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  cartButton.textContent = `🛒 Cart (${totalQty} items)`;
}


  cartButton.addEventListener('click', () => {
    renderCartModal();
    cartModal.show();
  });

  // ---------------- Render Cart Modal ----------------
  function renderCartModal() {
    cartItemsDiv.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;
      cartItemsDiv.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <b>${item.name}${item.variant ? ' (' + item.variant + ')' : ''}</b><br>
            <small>${item.price.toFixed(3)} BHD</small>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-secondary cart-minus" data-i="${index}">-</button>
            <span class="mx-2">${item.qty}</span>
            <button class="btn btn-sm btn-outline-secondary cart-plus" data-i="${index}">+</button>
            <button class="btn btn-sm btn-danger ms-2 cart-remove" data-i="${index}">✕</button>
          </div>
        </div>
      `;
    });
    cartTotalSpan.textContent = total.toFixed(3);
  }

  // ---------------- Modal Qty / Remove ----------------
  document.addEventListener('click', e => {
    const i = e.target.dataset.i;
    if (i === undefined) return;

    if (e.target.classList.contains('cart-plus')) cart[i].qty++;
    if (e.target.classList.contains('cart-minus') && --cart[i].qty <= 0) cart.splice(i, 1);
    if (e.target.classList.contains('cart-remove')) cart.splice(i, 1);

    renderCartModal();
    updateCartButton();
  });

  // ---------------- WhatsApp Send ----------------
  sendOrderBtn.addEventListener('click', () => {
    if (!cart.length) return;

    const customerData = {
      tableNo: tableNo.value,
      personsCount: personsCount.value,
      name: custName.value.trim(),
      mobile: custMobile.value.trim(),
      address: custAddress.value.trim(),
      lat: latInput.value,
      lng: lngInput.value
    };

    const message = generateWhatsAppReceipt(orderType.value, cart, customerData);
    window.open(`https://wa.me/97366939332?text=${encodeURIComponent(message)}`, '_blank');

    // Reset everything
    cartModal.hide();
    cart = [];
    updateCartButton();
    document.querySelectorAll('.qty-badge').forEach(b => b.textContent = '0');
    tableNo.value = '';
    personsCount.value = '';
    custName.value = '';
    custMobile.value = '';
    custAddress.value = '';
    latInput.value = '';
    lngInput.value = '';
    autoAddressBtn.innerText = "📍 Auto Detect Address";
    orderType.value = 'dining';
    diningFields.style.display = 'block';
    deliveryFields.style.display = 'none';
    categoryFilter.value = '';
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    menuItemsDiv.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    searchInput.focus();
  });

  // ---------------- WhatsApp Receipt ----------------
  function generateWhatsAppReceipt(orderType, cart, customer = {}) {
  let msg = "🛍️ *New Customer Order*\n\n";

  if (orderType === 'dining') {
    const table = customer.tableNo || '-';
    const persons = customer.personsCount || '-';
    msg += `🍽️ *Dining*\nTable: ${table} | Persons: ${persons}\n\n`;
  } else if (orderType === 'delivery') {
    const name = customer.name || '-';
    const mobile = customer.mobile || '-';
    const address = customer.address || '-';
    const lat = customer.lat || '';
    const lng = customer.lng || '';

    msg += `🚚 *Delivery*\n*Name:* ${name}\n*Mobile:* ${mobile}\n*Address:* ${address}\n`;
    if (lat && lng) msg += `📍 Map: https://maps.google.com/?q=${lat},${lng}\n`;
    msg += `\n`;
  }

  msg += "🛒 *Order Items*\n";

  // Fixed column widths
  const itemColWidth = 20; // max width for item names
  const qtyColWidth = 3;
  const priceColWidth = 6;
  const totalColWidth = 6;

  // Header
  msg += `Item${' '.repeat(itemColWidth - 4)}  Qty  Price  Total\n`;
  msg += '-'.repeat(itemColWidth + qtyColWidth + priceColWidth + totalColWidth + 6) + '\n';

  let grandTotal = 0;
  cart.forEach(i => {
    const itemTotal = i.price * i.qty;
    grandTotal += itemTotal;

    let name = i.name;
    if (i.variant) name += ` (${i.variant})`;
    if (name.length > itemColWidth) name = name.substring(0, itemColWidth - 3) + '...';

    const itemCol = name.padEnd(itemColWidth, ' ');
    const qtyCol = i.qty.toString().padStart(qtyColWidth, ' ');
    const priceCol = i.price.toFixed(3).padStart(priceColWidth, ' ');
    const totalCol = itemTotal.toFixed(3).padStart(totalColWidth, ' ');

    msg += `${itemCol}  ${qtyCol}  ${priceCol}  ${totalCol}\n`;
  });

  msg += '-'.repeat(itemColWidth + qtyColWidth + priceColWidth + totalColWidth + 6) + '\n';
  msg += `💰 *Grand Total:* ${grandTotal.toFixed(3)} BHD\n`;
  msg += "\n📌 Please process this order promptly.";

  return msg;
}


  // ================= GPS / AUTO DETECT ADDRESS =================
  autoAddressBtn?.addEventListener('click', () => {

    if (!navigator.geolocation) {
      alert("GPS not supported on this device");
      return;
    }

    autoAddressBtn.innerText = "Getting location...";

    navigator.geolocation.getCurrentPosition(async (pos) => {

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      latInput.value = lat;
      lngInput.value = lng;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        custAddress.value = data.display_name ? data.display_name.trim() : `${lat}, ${lng}`;
        autoAddressBtn.innerText = "📍 Address Detected ✓";
      } catch {
        custAddress.value = `${lat}, ${lng}`;
        autoAddressBtn.innerText = "📍 Location Added";
      }

    }, (err) => {
      autoAddressBtn.innerText = "📍 Auto Detect Address";
      alert("Location permission denied or error");
      console.error(err);
    });

  });

  // ---------------- Start ----------------
  fetchMenuItems();
});
