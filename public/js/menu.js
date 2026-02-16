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
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${item.name}</h5>
          <p class="card-text mb-1">${item.description || ''}</p>
          <p class="price mb-0">${item.price.toFixed(3)} BHD</p>
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
