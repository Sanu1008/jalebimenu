document.addEventListener('DOMContentLoaded', () => {

  const menuItemsDiv = document.getElementById('menuItems');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cartButton = document.getElementById('cartButton');

  if (!menuItemsDiv || !searchInput || !categoryFilter || !cartButton) return;

  let allItems = [];
  let cart = [];

  // ---------------- Fetch menu items ----------------
  async function fetchMenuItems() {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error(`Failed to fetch items. Status: ${res.status}`);
      const data = await res.json();
      allItems = data.map(item => ({
        ...item,
        price: Number(item.price),  // convert price to number
        image_base64: item.image_base64 || '' // Ensure image is processed correctly
      }));
      populateCategoryFilter();
      renderItems(allItems);
    } catch (err) {
      menuItemsDiv.innerHTML = `<p class="text-danger">Unable to load menu. Please try later.</p>`;
      console.error('Menu fetch error:', err);
    }
  }

  // ---------------- Populate category filter ----------------
  function populateCategoryFilter() {
    categoryFilter.innerHTML = `<option value="">All Categories</option>`;
    const categories = [...new Set(allItems.map(i => i.category))];
    categories.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      categoryFilter.appendChild(option);
    });
  }

  // ---------------- Render items ----------------
  function renderItems(items) {
  menuItemsDiv.innerHTML = '';

  if (items.length === 0) {
    menuItemsDiv.innerHTML = `<p class="text-center">No items found.</p>`;
    return;
  }

  items.forEach(item => {

    // price options (default + extra prices)
    let priceOptions = '';

    // default/base price
    if (item.price !== null) {
      priceOptions += `<option value="${item.price}">Regular - ${Number(item.price).toFixed(3)} BHD</option>`;
    }

    // extra prices
    if (item.extra_prices && item.extra_prices.length) {
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

          <h6 class="fw-bold mb-1">${item.name}</h6>
          <small class="text-muted">${item.description || ''}</small>

          <!-- price select -->
          <select class="form-select form-select-sm my-2 price-select">
            ${priceOptions}
          </select>

          <!-- quantity -->
          <input type="number"
                 class="form-control form-control-sm mb-2 qty-input"
                 value="1" min="1">

          <button
            class="btn btn-success btn-sm w-100 add-to-cart"
            data-id="${item.id}">
            Add to Cart
          </button>

        </div>
      </div>
    `;

    menuItemsDiv.appendChild(col);
  });
}


  // ---------------- Search & Filter ----------------
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allItems.filter(i =>
      i.name.toLowerCase().includes(term) &&
      (categoryFilter.value === '' || i.category === categoryFilter.value)
    );
    renderItems(filtered);
  });

  categoryFilter.addEventListener('change', () => {
    searchInput.dispatchEvent(new Event('input'));
  });

  // ---------------- Add to cart ----------------
  document.addEventListener('click', function (e) {
  if (e.target.classList.contains('add-to-cart')) {

    const card = e.target.closest('.card');

    const id = e.target.dataset.id;
    const price = parseFloat(card.querySelector('.price-select').value);
    const qty = parseInt(card.querySelector('.qty-input').value) || 1;

    const item = allItems.find(i => i.id == id);
    if (!item) return;

    const key = id + '-' + price; // differentiate prices

    const existing = cart.find(c => c.key === key);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        key,
        id,
        name: item.name,
        price,
        qty
      });
    }

    updateCartButton();
  }
});


  function updateCartButton() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > 0) {
      cartButton.style.display = 'block';
      cartButton.textContent = `🛒 Cart (${totalQty})`;
    } else {
      cartButton.style.display = 'none';
    }
  }

  // ---------------- WhatsApp Order ----------------
  cartButton.addEventListener('click', () => {
    if (cart.length === 0) return;

    let message = "Hello, I would like to place an order:\n\n";
    let total = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;
      message += `• ${item.name} x${item.qty} - ${itemTotal.toFixed(3)} BHD\n`;
    });

    message += `\nTotal: ${total.toFixed(3)} BHD`;

    const phoneNumber = "97366939332"; // 🔴 CHANGE TO YOUR NUMBER
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
  });

  // ---------------- Initial Load ----------------
  fetchMenuItems();
});
