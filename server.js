const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
//const PORT = 3000;
const PORT = process.env.PORT || 3000;
// Static files
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Database
const db = new sqlite3.Database('./database/menu.db', err => {
  if (err) console.error(err.message);
  else console.log('Connected to SQLite database.');
});

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  image_path TEXT
)`);

// Admin credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = bcrypt.hashSync('1234', 10);

// Middleware
function isAdmin(req, res, next) {
  if (req.session.loggedIn) next();
  else res.status(401).json({ error: 'Unauthorized' });
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

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

// Items CRUD
app.get('/api/items', (req, res) => {
  db.all(`SELECT * FROM items`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/items', isAdmin, upload.single('image'), (req, res) => {
  const { name, category, price, description } = req.body;
  const image_path = req.file ? '/images/' + req.file.filename : '';
  db.run(`INSERT INTO items (name, category, price, description, image_path) VALUES (?, ?, ?, ?, ?)`,
    [name, category, price, description, image_path],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

app.put('/api/items/:id', isAdmin, upload.single('image'), (req, res) => {
  const { name, category, price, description } = req.body;
  const id = req.params.id;
  const image_path = req.file ? '/images/' + req.file.filename : null;

  let sql = `UPDATE items SET name = ?, category = ?, price = ?, description = ?`;
  const params = [name, category, price, description];
  if (image_path) {
    sql += `, image_path = ?`;
    params.push(image_path);
  }
  sql += ` WHERE id = ?`;
  params.push(id);

  db.run(sql, params, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/items/:id', isAdmin, (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM items WHERE id = ?`, [id], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// HTML Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'html/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html/dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html/menu.html')));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
