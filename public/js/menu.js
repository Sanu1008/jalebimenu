document.addEventListener('DOMContentLoaded', () => {

  const menuItemsDiv = document.getElementById('menuItems');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartButton = document.getElementById('cartButton');

  const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
  const cartItemsDiv = document.getElementById('cartItems');
  const cartTotalSpan = document.getElementById('cartTotal');
  const sendOrderBtn = document.getElementById('sendOrderBtn');

  if (!menuItemsDiv || !searchInput || !categoryFilter || !cartButton) return;

  let allItems = [];
  let cart = [];

  // ---------------- Fetch menu items ----------------
  async function fetchMenuItems() {
    const res = await fetch('/api/items');
    const data = await res.json();

    allItems = data.map(i => ({
      ...i,
      price: Number(i.price),
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

      if (item.price !== null) {
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
        <div class="card menu-card shadow-sm">

          ${item.image_base64 ? `<img src="${item.image_base64}" class="menu-img">` : ''}

          <div class="card-body">

            <h6 class="fw-bold">${item.name}</h6>

            <select class="form-select form-select-sm my-2 price-select">
              ${priceOptions}
            </select>

            <div class="input-group input-group-sm mb-2">
              <button class="btn btn-outline-secondary qty-minus">-</button>
              <input type="number" class="form-control text-center qty-input" value="1" min="1">
              <button class="btn btn-outline-secondary qty-plus">+</button>
            </div>

            <button class="btn btn-success btn-sm w-100 add-to-cart" data-id="${item.id}">
              Add
            </button>

          </div>
        </div>
      `;

      menuItemsDiv.appendChild(col);
    });
  }

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


  // ---------------- Card Qty + - ----------------
  document.addEventListener('click', e => {

    if (e.target.classList.contains('qty-plus')) {
      const input = e.target.parentElement.querySelector('.qty-input');
      input.value++;
    }

    if (e.target.classList.contains('qty-minus')) {
      const input = e.target.parentElement.querySelector('.qty-input');
      if (input.value > 1) input.value--;
    }
  });


  // ---------------- Add To Cart ----------------
  document.addEventListener('click', e => {

    if (!e.target.classList.contains('add-to-cart')) return;

    const card = e.target.closest('.card');

    const id = e.target.dataset.id;
    const price = parseFloat(card.querySelector('.price-select').value);
    const qty = parseInt(card.querySelector('.qty-input').value);

    const item = allItems.find(i => i.id == id);

    const key = id + '-' + price;

    const existing = cart.find(c => c.key === key);

    if (existing) existing.qty += qty;
    else cart.push({ key, name: item.name, price, qty });

    updateCartButton();
  });


  // ---------------- Cart Button ----------------
  function updateCartButton() {
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);

    cartButton.style.display = totalQty ? 'block' : 'none';
    cartButton.textContent = `🛒 Cart (${totalQty})`;
  }


  // ---------------- Open Modal ----------------
  cartButton.addEventListener('click', () => {
    renderCartModal();
    cartModal.show();
  });


  // ---------------- Render Cart ----------------
  function renderCartModal() {

    cartItemsDiv.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {

      const itemTotal = item.price * item.qty;
      total += itemTotal;

      cartItemsDiv.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-2">

          <div>
            <b>${item.name}</b><br>
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

    let msg = "Hello, I would like to place an order:\n\n";
    let total = 0;

    cart.forEach(i => {
      const t = i.price * i.qty;
      total += t;
      msg += `• ${i.name} x${i.qty} - ${t.toFixed(3)} BHD\n`;
    });

    msg += `\nTotal: ${total.toFixed(3)} BHD`;

    window.open(`https://wa.me/97366939332?text=${encodeURIComponent(msg)}`, '_blank');
  });


  // ---------------- Start ----------------
  fetchMenuItems();
});
