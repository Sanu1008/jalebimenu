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

// ---------------- Multer Setup (Memory Storage) ----------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------- Admin Setup ----------------
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
        image LONGBLOB
      );
    `);

    // Table for extra prices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        label VARCHAR(100) NOT NULL,
        price DECIMAL(10,3) NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ MySQL tables ready');
  } catch (err) {
    console.error('❌ Table creation error:', err);
  }
}
createTables();

// ---------------- APIs ----------------

// Admin login/logout
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
      // Fetch extra prices
      const [extraPrices] = await pool.query(
        'SELECT id, label, price FROM item_prices WHERE item_id=?',
        [item.id]
      );

      let imageBase64 = '';
      if (item.image) {
        let buffer = item.image;
        if (typeof item.image === 'string') {
          const hex = item.image.replace(/^0x/, '');
          buffer = Buffer.from(hex, 'hex');
        }
        const isPng = buffer.length > 3 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E;
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const { image, ...rest } = item;
      items.push({
        ...rest,
        image_base64: imageBase64,
        extra_prices: extraPrices // new field
      });
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

// Convert empty string to NULL
const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const imageData = req.file ? req.file.buffer : null;

    const [result] = await pool.query(
      'INSERT INTO items (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
      [name, category, priceValue, description, imageData]
    );

    const itemId = result.insertId;

    // Insert extra prices
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
const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const id = req.params.id;

    // Update main item
    let sql = 'UPDATE items SET name=?, category=?, price=?, description=?';
    const params = [name, category, priceValue, description];

    if (req.file) {
      const imageData = req.file.buffer;
      sql += ', image=?';
      params.push(imageData);
    }
    sql += ' WHERE id=?';
    params.push(id);
    await pool.query(sql, params);

    // Clear previous extra prices
    await pool.query('DELETE FROM item_prices WHERE item_id=?', [id]);

    // Insert new extra prices
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

// ---------------- HTML Pages ----------------
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'html/admin.html'))
);
app.get('/dashboard', (req, res) =>
  res.sendFile(path.join(__dirname, 'html/dashboard.html'))
);
app.get('/menu', (req, res) =>
  res.sendFile(path.join(__dirname, 'html/menu.html'))
);

// ---------------- Start Server ----------------
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
