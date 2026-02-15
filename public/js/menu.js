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
    // Use responsive row-cols classes instead of fixed col-md-4
    col.className = 'col'; // Let Bootstrap row-cols-* handle sizing

    col.innerHTML = `
      <div class="card h-100 menu-card shadow-sm">
        ${item.image_path ? `<img src="${item.image_path}" class="menu-img card-img-top" alt="${item.name}">` : ''}
        <div class="card-body">
          <h5 class="card-title">${item.name}</h5>
          <p class="card-text">${item.description || ''}</p>
          <p class="fw-bold">${item.price.toFixed(3)} BHD</p>
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
