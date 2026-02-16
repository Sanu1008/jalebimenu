const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db'); // MySQL connection pool
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Middleware ----------------
// Serve static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'html')));

// Parse JSON and form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
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
        image_path TEXT
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

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');
    // Ensure price is number
    const data = rows.map(r => ({ ...r, price: Number(r.price) }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add new item
app.post('/api/items', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const image_path = req.file ? '/images/' + req.file.filename : '';
    await pool.query(
      'INSERT INTO items (name, category, price, description, image_path) VALUES (?, ?, ?, ?, ?)',
      [name, category, price, description, image_path]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
      sql += ', image_path=?';
      params.push('/images/' + req.file.filename);
    }

    sql += ' WHERE id=?';
    params.push(id);

    await pool.query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete item
app.delete('/api/items/:id', isAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM items WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------------- HTML Pages ----------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'html/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html/dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html/menu.html')));

// ---------------- Start Server ----------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
