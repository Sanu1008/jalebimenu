const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db'); // MySQL connection file
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Middleware ----------------
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// ---------------- Multer Setup ----------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------- Admin ----------------
const ADMIN_USER = 'admin';
const ADMIN_PASS = bcrypt.hashSync('1234', 10);
function isAdmin(req, res, next) {
  if (req.session.loggedIn) next();
  else res.status(401).json({ error: 'Unauthorized' });
}

// ---------------- Create Tables ----------------
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10,3) NULL,
        description TEXT,
        image LONGBLOB,
        vat_enabled TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        label VARCHAR(100) NOT NULL,
        price DECIMAL(10,3) NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );
    `);
await pool.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
    console.log('✅ Tables ready');
  } catch (err) {
    console.error('❌ Table creation error:', err);
  }
}
createTables();

// ---------------- Admin Login/Logout ----------------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_PASS)) {
    req.session.loggedIn = true;
    res.json({ success: true });
  } else res.status(401).json({ error: 'Invalid credentials' });
});
app.get('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ---------------- GET ITEMS ----------------
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');
    const items = [];

    for (let item of rows) {
      const [extraPrices] = await pool.query(
        'SELECT id, label, price FROM item_prices WHERE item_id=?',
        [item.id]
      );

      let imageBase64 = '';
      if (item.image) {
        let buffer = typeof item.image === 'string' ? Buffer.from(item.image.replace(/^0x/, ''), 'hex') : item.image;
        const isPng = buffer.length > 3 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E;
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const { image, ...rest } = item;
      items.push({ ...rest, image_base64: imageBase64, extra_prices: extraPrices });
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ADD ITEM ----------------
app.post('/api/items', isAdmin, upload.single('image'), async (req, res) => {
  try {
   const { name, category, price, description } = req.body;
const vatValue = req.body.vatEnabled ? 1 : 0;
const activeValue = req.body.isActive ? 1 : 0;   // ⭐ ADD

    const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const imageData = req.file ? req.file.buffer : null;

    const [result] = await pool.query(
      'INSERT INTO items (name, category, price, description, image, vat_enabled, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, priceValue, description, imageData, vatValue, activeValue]

    );

    const itemId = result.insertId;

    // Extra prices
    if (req.body.labels && req.body.prices) {
      const labels = Array.isArray(req.body.labels) ? req.body.labels : [req.body.labels];
      const prices = Array.isArray(req.body.prices) ? req.body.prices : [req.body.prices];
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] && prices[i]) {
          await pool.query(
            'INSERT INTO item_prices (item_id, label, price) VALUES (?, ?, ?)',
            [itemId, labels[i], prices[i]]
          );
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- UPDATE ITEM ----------------
app.put('/api/items/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const vatValue = req.body.vatEnabled ? 1 : 0;
const activeValue = req.body.isActive ? 1 : 0;   // ⭐ ADD
    const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const id = req.params.id;

    let sql = 'UPDATE items SET name=?, category=?, price=?, description=?, vat_enabled=?, is_active=?';
const params = [name, category, priceValue, description, vatValue, activeValue];
    if (req.file) { sql += ', image=?'; params.push(req.file.buffer); }
    sql += ' WHERE id=?'; params.push(id);
    await pool.query(sql, params);

    // Reset extra prices
    await pool.query('DELETE FROM item_prices WHERE item_id=?', [id]);
    let labels = req.body.labels || []; 
    let values = req.body.prices || [];
    if (!Array.isArray(labels)) labels = [labels];
    if (!Array.isArray(values)) values = [values];
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] && values[i]) {
        await pool.query(
          'INSERT INTO item_prices (item_id, label, price) VALUES (?, ?, ?)',
          [id, labels[i], values[i]]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- DELETE ITEM ----------------
app.delete('/api/items/:id', isAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM items WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==================================================
// CATEGORY MASTER APIs (NEW – DOES NOT TOUCH ITEMS)
// ==================================================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add category
app.post('/api/categories', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ error: 'Category name required' });

    await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name.trim()]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category
app.delete('/api/categories/:id', isAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM categories WHERE id=?',
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- HTML Pages ----------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'html/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html/dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html/menu.html')));
app.get('/categories', (req, res) => res.sendFile(path.join(__dirname, 'html/category-master')));
// ---------------- Start Server ----------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
