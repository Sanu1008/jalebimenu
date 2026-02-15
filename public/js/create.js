// DOM elements
const createItemForm = document.getElementById('createItemForm');
const preview = document.getElementById('preview');
const toastEl = document.getElementById('toast');
const toast = toastEl ? new bootstrap.Toast(toastEl) : null;

// Preview selected image
const itemImage = document.getElementById('itemImage');
if (itemImage) {
  itemImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview.innerHTML = `<img src="${reader.result}" width="150">`;
    reader.readAsDataURL(file);
  });
}

// Submit form
if (createItemForm) {
  createItemForm.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(createItemForm);

    // ✅ Send session cookie with fetch
    const res = await fetch('/api/items', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    // Unauthorized check
    if(res.status === 401){
      alert('Unauthorized! Please login first');
      window.location.href = '/';
      return;
    }

    if(res.ok){
      if(toastEl && toast){
        toastEl.classList.remove('text-bg-danger');
        toastEl.classList.add('text-bg-success');
        document.getElementById('toastBody').textContent = 'Item created successfully!';
        toast.show();
      }

      createItemForm.reset();
      preview.innerHTML = '';

      // Redirect after 1.5 seconds
      setTimeout(() => window.location.href='/dashboard', 1500);
    } else {
      if(toastEl && toast){
        toastEl.classList.remove('text-bg-success');
        toastEl.classList.add('text-bg-danger');
        const err = await res.json();
        document.getElementById('toastBody').textContent = err.error || 'Failed to create item';
        toast.show();
      }
    }
  });
}
