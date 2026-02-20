const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db'); // MySQL connection
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

// ---------------- Client ----------------
function isClient(req, res, next) {
  if (req.session.clientId) next();
  else res.status(401).json({ error: 'Unauthorized' });
}

// ---------------- Create Tables ----------------
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10,3) NULL,
        description TEXT,
        image LONGBLOB,
        vat_enabled TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
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
        client_id INT NULL,
        name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
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

// ---------------- Client Login/Logout ----------------
app.post('/api/client/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM clients WHERE username=?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const client = rows[0];
    if (!bcrypt.compareSync(password, client.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    req.session.clientId = client.id;
    req.session.clientUsername = client.username;
    res.json({ success: true, client: { id: client.id, username: client.username, name: client.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/client/logout', (req, res) => {
  req.session.clientId = null;
  req.session.clientUsername = null;
  res.json({ success: true });
});

// ---------------- GET ITEMS ----------------
app.get('/api/items', async (req, res) => {
  try {
    let sql = 'SELECT * FROM items';
    let params = [];

    if (req.session.clientId) {
      sql += ' WHERE client_id=?';
      params.push(req.session.clientId);
    }

    const [rows] = await pool.query(sql, params);
    const items = [];

    for (let item of rows) {
      const [extraPrices] = await pool.query('SELECT id, label, price FROM item_prices WHERE item_id=?', [item.id]);

      let imageBase64 = '';
      if (item.image) {
        const buffer = Buffer.isBuffer(item.image) ? item.image : Buffer.from(item.image, 'binary');
        const mimeType = buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
        imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const { image, ...rest } = item;
      items.push({ ...rest, quantity: item.quantity,image_base64: imageBase64, extra_prices: extraPrices });
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PUBLIC MENU (CLIENT ID WISE) ----------------
// Anyone (customer) can view menu using client id
// 1️⃣ ALL ITEMS (no client filter)
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM items WHERE is_active=1 ORDER BY category, name'
    );

    const items = [];

    for (let item of rows) {
      const [extraPrices] = await pool.query(
        'SELECT id, label, price FROM item_prices WHERE item_id=?',
        [item.id]
      );

      let imageBase64 = '';
      if (item.image) {
        const buffer = Buffer.isBuffer(item.image)
          ? item.image
          : Buffer.from(item.image, 'binary');
        const mimeType =
          buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
        imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const { image, ...rest } = item;

      items.push({
        ...rest,
        image_base64: imageBase64,
        extra_prices: extraPrices
      });
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2️⃣ CLIENT-SPECIFIC ITEMS
app.get('/api/menu/:id', async (req, res) => {
  try {
    const clientId = req.params.id;

    const [rows] = await pool.query(
      'SELECT * FROM items WHERE client_id=? AND is_active=1 ORDER BY category, name',
      [clientId]
    );

    const items = [];

    for (let item of rows) {
      const [extraPrices] = await pool.query(
        'SELECT id, label, price FROM item_prices WHERE item_id=?',
        [item.id]
      );

      let imageBase64 = '';
      if (item.image) {
        const buffer = Buffer.isBuffer(item.image)
          ? item.image
          : Buffer.from(item.image, 'binary');
        const mimeType =
          buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
        imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const { image, ...rest } = item;

      items.push({
        ...rest,
        image_base64: imageBase64,
        extra_prices: extraPrices
      });
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items } = req.body; // [{ itemId, qty }, ...]
    
    for (const orderItem of items) {
      const [rows] = await pool.query('SELECT quantity FROM items WHERE id=? AND client_id=?', 
                                      [orderItem.itemId, req.session.clientId]);
      if (rows.length && rows[0].quantity !== null) {
        if (rows[0].quantity < orderItem.qty) {
          return res.status(400).json({ error: `Only ${rows[0].quantity} available for item ${orderItem.itemId}` });
        }
        await pool.query('UPDATE items SET quantity = quantity - ? WHERE id=?', [orderItem.qty, orderItem.itemId]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// server.js (Node/Express)
app.get('/api/me', (req,res)=>{
  if(req.session.clientId){
    res.json({ role:'client', id: req.session.clientId, username: req.session.clientUsername });
  } else if(req.session.loggedIn){
    res.json({ role:'admin' });
  } else {
    res.status(401).json({ error:'Unauthorized' });
  }
});
// ---------------- ADD ITEM ----------------
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, clientId } = req.body;
    const vatValue = req.body.vatEnabled ? 1 : 0;
    const activeValue = req.body.isActive ? 1 : 0;
    const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const imageData = req.file ? req.file.buffer : null;

    const clientIdFinal = req.session.clientId || clientId || null; // client or admin

    const [result] = await pool.query(
      'INSERT INTO items (client_id, name, category, price, description, image, vat_enabled, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [clientIdFinal, name, category, priceValue, description, imageData, vatValue, activeValue]
    );

    const itemId = result.insertId;

    // Extra prices
    if (req.body.labels && req.body.prices) {
      const labels = Array.isArray(req.body.labels) ? req.body.labels : [req.body.labels];
      const prices = Array.isArray(req.body.prices) ? req.body.prices : [req.body.prices];
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] && prices[i]) {
          await pool.query('INSERT INTO item_prices (item_id, label, price) VALUES (?, ?, ?)', [itemId, labels[i], prices[i]]);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- UPDATE ITEM ----------------
app.put('/api/items/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const vatValue = req.body.vatEnabled ? 1 : 0;
    const activeValue = req.body.isActive ? 1 : 0;
    const priceValue = price && price.trim() !== '' ? parseFloat(price) : null;
    const id = req.params.id;

    // Check ownership if client
    if (req.session.clientId) {
      const [rows] = await pool.query('SELECT client_id FROM items WHERE id=?', [id]);
      if (!rows.length || rows[0].client_id !== req.session.clientId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

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
        await pool.query('INSERT INTO item_prices (item_id, label, price) VALUES (?, ?, ?)', [id, labels[i], values[i]]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- DELETE ITEM ----------------
app.delete('/api/items/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Check ownership if client
    if (req.session.clientId) {
      const [rows] = await pool.query('SELECT client_id FROM items WHERE id=?', [id]);
      if (!rows.length || rows[0].client_id !== req.session.clientId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    await pool.query('DELETE FROM items WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- CATEGORY MASTER ----------------
app.get('/api/categories', async (req, res) => {
  try {
    let sql = 'SELECT * FROM categories';
    let params = [];
    if(req.session.clientId){
      sql += ' WHERE client_id=?';
      params.push(req.session.clientId);
    }
    sql += ' ORDER BY name';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name required' });

    const clientIdFinal = req.session.clientId || null; // admin can leave null
    await pool.query('INSERT INTO categories (name, client_id) VALUES (?, ?)', [name.trim(), clientIdFinal]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    // Check ownership if client
    if(req.session.clientId) {
      const [rows] = await pool.query('SELECT client_id FROM categories WHERE id=?', [req.params.id]);
      if(!rows.length || rows[0].client_id !== req.session.clientId){
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    await pool.query('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- HTML Pages ----------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'html/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html/dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html/menu.html')));
app.get('/categories', (req, res) => res.sendFile(path.join(__dirname, 'html/category-master.html')));
app.get('/categories.html', (req, res) => res.redirect('/categories'));
// ---------------- MENU WITH CLIENT ID ----------------
app.get('/menu/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'html/menu.html'));
});
// ---------------- Start Server ----------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));