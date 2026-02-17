// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const addItemForm = document.getElementById('addItemForm');
const itemsTableBody = document.getElementById('itemsTableBody');
// OR
// const itemsTableBody = document.querySelector('#itemsTableBody');

// ---------------- LOGIN ----------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const data = Object.fromEntries(formData.entries());

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    loginSection.classList.add('d-none');
    dashboardSection.classList.remove('d-none');
    fetchItems();
  } else {
    const err = await res.json();
    loginError.textContent = err.error;
    loginError.classList.remove('d-none');
  }
});

// ---------------- LOGOUT ----------------
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout');
  dashboardSection.classList.add('d-none');
  loginSection.classList.remove('d-none');
});

// ---------------- FETCH ITEMS ----------------
async function fetchItems() {
  const res = await fetch('/api/items');
  if (!res.ok) return;

  const items = await res.json();
  itemsTableBody.innerHTML = ''; // Clear table before adding items

  items.forEach(item => {
    console.log(item.image_base64);  // Log Base64 string for each item

    // 🔥 Show main price + extra prices
    let priceHTML = `${item.price}`;
    if (item.extra_prices && item.extra_prices.length > 0) {
      priceHTML += '<br><small>';
      priceHTML += item.extra_prices.map(p => `${p.label}: ${p.price}`).join('<br>');
      priceHTML += '</small>';
    }

    itemsTableBody.innerHTML += `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${priceHTML}</td>
        <td>${item.description}</td>
        <td>${item.image_base64 ? `<img src="${item.image_base64}" width="50">` : 'No image'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">Delete</button></td>
      </tr>
    `;
  });
}

// ---------------- ADD ITEM ----------------
addItemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(addItemForm);

  // 🔥 Add multiple prices to FormData
  const priceLabels = document.querySelectorAll('.price-label');
  const priceValues = document.querySelectorAll('.price-value');

  priceLabels.forEach((input, idx) => {
    if (input.value && priceValues[idx].value) {
      formData.append('labels', input.value);
      formData.append('prices', priceValues[idx].value);
    }
  });

  const res = await fetch('/api/items', {
    method: 'POST',
    body: formData
  });

  if (res.ok) {
    addItemForm.reset();
    fetchItems();
  } else {
    alert('Failed to add item');
  }
});

// ---------------- DELETE ITEM ----------------
async function deleteItem(id) {
  if (!confirm('Are you sure?')) return;
  const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
  if (res.ok) fetchItems();
}
