const logoutBtn = document.getElementById('logoutBtn');
const itemsTableBody = document.getElementById('itemsTableBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const pagination = document.getElementById('pagination');
const editModal = new bootstrap.Modal(document.getElementById('editModal'));
const editItemForm = document.getElementById('editItemForm');
const currentImageDiv = document.getElementById('currentImage');

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
        <td>${item.price}</td>
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
async function openEditModal(id){
  const item = allItems.find(i => i.id === id);
  if(!item) return;

  document.getElementById('editId').value = item.id;
  document.getElementById('editName').value = item.name;
  document.getElementById('editCategory').value = item.category;
  document.getElementById('editPrice').value = item.price;
  document.getElementById('editDescription').value = item.description || '';
  currentImageDiv.innerHTML = item.image_base64 ? `<img src="${item.image_base64}" width="100">` : '';
  
  editModal.show();
}


editItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(editItemForm);
  const id = document.getElementById('editId').value;

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
