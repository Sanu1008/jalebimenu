document.addEventListener('DOMContentLoaded', () => {

  // ================= SHOP LOCATION =================
  const SHOP_LAT = 11.38059;
  const SHOP_LNG = 75.72436;

  // ================= DELIVERY SETTINGS =================
  const FREE_KM = 1;
  const PRICE_PER_KM = 1; // 1 BHD per KM

  const menuItemsDiv = document.getElementById('menuItems');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartButton = document.getElementById('cartButton');

  const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
  const cartItemsDiv = document.getElementById('cartItems');
  const cartTotalSpan = document.getElementById('cartTotal');
  const sendOrderBtn = document.getElementById('sendOrderBtn');

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

  let allItems = [];
  let cart = [];

  // ================= DISTANCE CALCULATION =================
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calculateDelivery(customerLat, customerLng) {
    if (!customerLat || !customerLng) {
      return { distance: 0, charge: 0 };
    }

    const distance = calculateDistanceKm(
      SHOP_LAT,
      SHOP_LNG,
      parseFloat(customerLat),
      parseFloat(customerLng)
    );

    if (distance <= FREE_KM) {
      return { distance, charge: 0 };
    }

    const extraKm = Math.ceil(distance - FREE_KM);
    const charge = extraKm * PRICE_PER_KM;

    return { distance, charge };
  }

  // ================= ORDER TYPE TOGGLE =================
  orderType.addEventListener('change', () => {
    const isDining = orderType.value === 'dining';
    diningFields.style.display = isDining ? 'block' : 'none';
    deliveryFields.style.display = isDining ? 'none' : 'block';
    renderCartModal();
  });

  // ================= UPDATE CART BUTTON =================
  function updateCartButton() {
    if (!cart.length) {
      cartButton.style.display = 'none';
      return;
    }

    cartButton.style.display = 'block';
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    cartButton.textContent = `🛒 Cart (${totalQty} items)`;
  }

  // ================= RENDER CART MODAL =================
  function renderCartModal() {

    cartItemsDiv.innerHTML = '';
    let total = 0;
    let totalVAT = 0;

    cart.forEach((item, index) => {

      const itemTotal = item.price * item.qty;
      total += itemTotal;

      cartItemsDiv.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <b>${item.name}${item.variant ? ' (' + item.variant + ')' : ''}</b><br>
            <small>${item.price.toFixed(3)} x ${item.qty}</small>
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

    // ================= DELIVERY =================
    let deliveryCharge = 0;
    let distance = 0;

    if (orderType.value === 'delivery') {

      const result = calculateDelivery(latInput.value, lngInput.value);
      deliveryCharge = result.charge;
      distance = result.distance;

      total += deliveryCharge;

      cartItemsDiv.innerHTML += `
        <hr>
        <div class="d-flex justify-content-between text-primary">
          <div>
            🚚 Delivery (${distance.toFixed(2)} KM)
          </div>
          <div>
            ${deliveryCharge.toFixed(3)} BHD
          </div>
        </div>
      `;
    }

    cartTotalSpan.textContent = total.toFixed(3);
  }

  // ================= MODAL BUTTON ACTIONS =================
  document.addEventListener('click', e => {
    const i = e.target.dataset.i;
    if (i === undefined) return;

    if (e.target.classList.contains('cart-plus')) cart[i].qty++;
    if (e.target.classList.contains('cart-minus') && --cart[i].qty <= 0) cart.splice(i, 1);
    if (e.target.classList.contains('cart-remove')) cart.splice(i, 1);

    renderCartModal();
    updateCartButton();
  });

  // ================= WHATSAPP RECEIPT =================
  function generateWhatsAppReceipt(orderType, cart, customer = {}) {

    let msg = "🛍️ *New Customer Order*\n\n";
    let grandTotal = 0;

    if (orderType === 'delivery') {
      msg += `🚚 *Delivery*\n`;
      msg += `Name: ${customer.name}\n`;
      msg += `Mobile: ${customer.mobile}\n`;
      msg += `Address: ${customer.address}\n\n`;
    }

    msg += "🛒 *Order Items*\n";

    cart.forEach(i => {
      const itemTotal = i.price * i.qty;
      grandTotal += itemTotal;
      msg += `${i.name} x ${i.qty} = ${itemTotal.toFixed(3)} BHD\n`;
    });

    // DELIVERY
    if (orderType === 'delivery') {
      const result = calculateDelivery(customer.lat, customer.lng);
      grandTotal += result.charge;

      msg += `\n🚚 Delivery (${result.distance.toFixed(2)} KM): ${result.charge.toFixed(3)} BHD\n`;
    }

    msg += `\n💰 *Grand Total: ${grandTotal.toFixed(3)} BHD*`;

    return msg;
  }

  // ================= SEND ORDER =================
  sendOrderBtn.addEventListener('click', (e) => {

    e.preventDefault();
    if (!cart.length) return;

    if (orderType.value === 'delivery') {
      if (!custName.value || !custMobile.value || !custAddress.value) {
        alert("Please complete delivery details");
        return;
      }
    }

    const message = generateWhatsAppReceipt(orderType.value, cart, {
      name: custName.value,
      mobile: custMobile.value,
      address: custAddress.value,
      lat: latInput.value,
      lng: lngInput.value
    });

    window.open(`https://api.whatsapp.com/send?phone=97366939332&text=${encodeURIComponent(message)}`, '_blank');
  });

  // ================= GPS AUTO DETECT =================
  autoAddressBtn?.addEventListener('click', () => {

    if (!navigator.geolocation) {
      alert("GPS not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      latInput.value = lat;
      lngInput.value = lng;

      renderCartModal();

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        custAddress.value = data.display_name || `${lat}, ${lng}`;
      } catch {
        custAddress.value = `${lat}, ${lng}`;
      }

    });
  });

});