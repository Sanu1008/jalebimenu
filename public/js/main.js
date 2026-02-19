const logoutBtn = document.getElementById('logoutBtn');
const itemsTableBody = document.getElementById('itemsTableBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const pagination = document.getElementById('pagination');
const editModal = new bootstrap.Modal(document.getElementById('editModal'));
const editItemForm = document.getElementById('editItemForm');
const currentImageDiv = document.getElementById('currentImage');
// Multi-price elements
const extraPricesList = document.getElementById('extraPricesList');
const addExtraPriceBtn = document.getElementById('addExtraPriceBtn');

// Function to add a new extra price row
function addExtraPriceRow(label = '', price = '') {
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 mb-1 extra-price-row';
  row.innerHTML = `
    <input type="text" class="form-control price-label" placeholder="Label" value="${label}">
    <input type="number" class="form-control price-value" placeholder="Price" value="${price}" step="0.01">
    <button type="button" class="btn btn-danger btn-sm remove-price-btn">&times;</button>
  `;
  extraPricesList.appendChild(row);

  // Remove button
  row.querySelector('.remove-price-btn').addEventListener('click', () => row.remove());
}

// Add new row on button click
addExtraPriceBtn.addEventListener('click', () => addExtraPriceRow());


let allItems = [];
let currentPage = 1;
const itemsPerPage = 5;

// ---------------- LOGOUT ----------------
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout');
  window.location.href = '/';
});

// ---------------- FETCH ITEMS ----------------
async function fetchItems() {
  const res = await fetch('/api/items');
  if(!res.ok) return;
  allItems = await res.json();

  populateCategoryFilter();
  renderTable();
}

// Populate Category Dropdown
function populateCategoryFilter() {
  const categories = [...new Set(allItems.map(i => i.category))];
  categoryFilter.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach(cat => {
    categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

// Filter & Search & Pagination
function renderTable() {
  const term = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  let filtered = allItems.filter(item => 
    (item.name.toLowerCase().includes(term)) &&
    (!selectedCategory || item.category === selectedCategory)
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if(currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage -1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = filtered.slice(start, end);

  itemsTableBody.innerHTML = '';
  pageItems.forEach(item => {
    itemsTableBody.innerHTML += `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>
  ${
    item.extra_prices && item.extra_prices.length > 0
      ? item.extra_prices
          .map(p => `<strong>${p.label}</strong>: ${parseFloat(p.price).toFixed(3)} BHD`)
          .join('<br>')
      : (item.price !== null && item.price !== undefined
          ? `${parseFloat(item.price).toFixed(3)} BHD`
          : '')
  }
</td>

        <td>${item.description || ''}</td>
        <td>${item.image_base64 ? `<img src="${item.image_base64}" width="50">` : ''}</td>
        <td>
          <button class="btn btn-sm btn-info me-2" onclick="openEditModal(${item.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  // Pagination
  pagination.innerHTML = '';
  for(let i=1; i<=totalPages; i++){
    pagination.innerHTML += `<li class="page-item ${i===currentPage?'active':''}">
      <a class="page-link" href="#" onclick="gotoPage(${i})">${i}</a>
    </li>`;
  }
}


function gotoPage(page){
  currentPage = page;
  renderTable();
}

// ---------------- SEARCH & FILTER ----------------
searchInput.addEventListener('input', renderTable);
categoryFilter.addEventListener('change', renderTable);

// ---------------- DELETE ----------------
async function deleteItem(id){
  if(!confirm('Are you sure?')) return;
  const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
  if(res.ok) fetchItems();  // Refresh the table after deletion
}


// ---------------- EDIT ----------------
// ---------------- EDIT ----------------
async function openEditModal(id){
  const item = allItems.find(i => i.id === id);
  if(!item) return;

  document.getElementById('editId').value = item.id;
  document.getElementById('editName').value = item.name;
  document.getElementById('editCategory').value = item.category;
  document.getElementById('editPrice').value = item.price;
  document.getElementById('editDescription').value = item.description || '';

  // Pre-fill VAT checkbox
  const vatCheckbox = document.getElementById('editVatEnabled');
  vatCheckbox.checked = item.vat_enabled === 1;

  // Pre-fill Active checkbox
  const activeCheckbox = document.getElementById('editIsActive');
  activeCheckbox.checked = item.is_active === 1;  

  currentImageDiv.innerHTML = item.image_base64 ? `<img src="${item.image_base64}" width="100">` : '';

  // Clear previous extra prices
  extraPricesList.innerHTML = '';
  if (item.extra_prices && item.extra_prices.length > 0) {
    item.extra_prices.forEach(p => addExtraPriceRow(p.label, p.price));
  }

  editModal.show();
}

editItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(editItemForm);
  const id = document.getElementById('editId').value;

  // ---------------- ADD ACTIVE STATE ----------------
  const isActive = document.getElementById('editIsActive').checked;
  formData.append('isActive', isActive ? '1' : '0');

  // ---------------- COLLECT EXTRA PRICES ----------------
  const mainPrice = document.getElementById('editPrice').value.trim();
  const labels = document.querySelectorAll('#extraPricesList .price-label');
  const values = document.querySelectorAll('#extraPricesList .price-value');
  let hasExtraPrice = false;

  labels.forEach((input, idx) => {
    const label = input.value.trim();
    const price = values[idx].value.trim();
    if (label && price) hasExtraPrice = true;
  });

  if (!mainPrice && !hasExtraPrice) {
    alert('Please enter at least one price (main or extra)');
    return;
  }

  labels.forEach((input, idx) => {
    const label = input.value.trim();
    const price = values[idx].value.trim();
    if(label && price) {
      formData.append('labels', label);
      formData.append('prices', price);
    }
  });

  const res = await fetch(`/api/items/${id}`, { method: 'PUT', body: formData });
  if(res.ok){
    editModal.hide();
    fetchItems();  // Refresh the table after editing
  } else {
    alert('Failed to update item');
  }
});


// ---------------- INITIAL LOAD ----------------
fetchItems();
