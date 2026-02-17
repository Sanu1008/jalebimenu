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
const storage = multer.memoryStorage();  // Store file in memory instead of disk
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
        price DECIMAL(10,3) NOT NULL,
        description TEXT,
        image LONGBLOB
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

// Get all items and convert BLOB to Base64 string for frontend display
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');

    // Convert BLOB to Base64 string for frontend display
    const items = rows.map(item => ({
      ...item,
      image_base64: item.image ? `data:image/jpeg;base64,${item.image.toString('base64')}` : '' // For JPEG images
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add new item with image
app.post('/api/items', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    
    // Ensure the image is properly uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const imageData = req.file.buffer;  // Get image as binary data (BLOB)

    // Insert item with image
    await pool.query(
      'INSERT INTO items (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
      [name, category, price, description, imageData]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update item
app.put('/api/items/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const id = req.params.id;
    let sql = 'UPDATE items SET name=?, category=?, price=?, description=?';
    const params = [name, category, price, description];
    
    if (req.file) {
      const imageData = req.file.buffer;  // Get image as binary data (BLOB)
      sql += ', image=?';
      params.push(imageData);
    }

    sql += ' WHERE id=?';
    params.push(id);
    await pool.query(sql, params);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'html/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html/dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html/menu.html')));

// ---------------- Start Server ----------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
