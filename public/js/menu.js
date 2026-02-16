const menuItemsDiv = document.getElementById('menuItems');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

let allItems = [];

// Fetch items from server
async function fetchMenuItems() {
  try {
    const res = await fetch('/api/items');
    if (!res.ok) throw new Error('Failed to fetch items');
    allItems = await res.json();
    populateCategoryFilter();
    renderItems(allItems);
  } catch (err) {
    menuItemsDiv.innerHTML = `<p class="text-danger">Unable to load menu. Please try later.</p>`;
    console.error(err);
  }
}

// Populate category dropdown
function populateCategoryFilter() {
  const categories = [...new Set(allItems.map(i => i.category))];
  categories.forEach(c => {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    categoryFilter.appendChild(option);
  });
}

// Render items as cards
function renderItems(items) {
  menuItemsDiv.innerHTML = '';
  if (items.length === 0) {
    menuItemsDiv.innerHTML = `<p class="text-center">No items found.</p>`;
    return;
  }

  items.forEach(item => {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="card menu-card shadow-sm">
        ${item.image_path ? `<img src="${item.image_path}" class="menu-img">` : ''}
        <div class="card-body">
          <h5 class="card-title mb-1">${item.name}</h5>
          <p class="card-text mb-1">${item.description || ''}</p>
          <p class="price mb-2">${item.price.toFixed(3)} BHD</p>
          <button class="btn btn-success btn-sm w-100 add-to-cart"
            data-id="${item.id}">
            Add to Cart
          </button>
        </div>
      </div>
    `;
    menuItemsDiv.appendChild(col);
  });
}


// Search/filter functionality
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

// Initial load
fetchMenuItems();
let cart = [];

// Add to Cart Click
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('add-to-cart')) {
    const id = e.target.dataset.id;
    const item = allItems.find(i => i.id == id);

    const existing = cart.find(c => c.id == id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...item, qty: 1 });
    }

    updateCartButton();
  }
});

function updateCartButton() {
  const cartButton = document.getElementById('cartButton');
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  if (totalQty > 0) {
    cartButton.style.display = 'block';
    cartButton.textContent = `🛒 Cart (${totalQty})`;
  } else {
    cartButton.style.display = 'none';
  }
}

// WhatsApp Order
document.getElementById('cartButton').addEventListener('click', function () {
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
  const whatsappURL =
    `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  window.open(whatsappURL, '_blank');
});

