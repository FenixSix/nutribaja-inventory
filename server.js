const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Inicializar base de datos
const db = new sqlite3.Database('./nutribaja.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT, price REAL, stock INTEGER)");
  db.run("CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, quantity INTEGER, total_price REAL, date DATETIME DEFAULT CURRENT_TIMESTAMP)");
  
  // Insertar datos iniciales si la tabla está vacía
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row.count === 0) {
      db.run("INSERT INTO products (name, category, price, stock) VALUES ('BIOBAJA Creatina', 'Suplementos', 450, 50)");
      db.run("INSERT INTO products (name, category, price, stock) VALUES ('BIOBAJA Proteína', 'Suplementos', 850, 30)");
      db.run("INSERT INTO products (name, category, price, stock) VALUES ('BIOBAJA Multivitamínico', 'Suplementos', 350, 20)");
      db.run("INSERT INTO products (name, category, price, stock) VALUES ('BIOBAJA Omega 3', 'Suplementos', 250, 40)");
    }
  });
});

// API: Obtener todos los productos
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Crear nuevo producto
app.post('/api/products', (req, res) => {
  const { name, category, price, stock } = req.body;
  db.run("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)", [name, category, price, stock], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// API: Registrar una venta
app.post('/api/sales', (req, res) => {
  const { product_id, quantity, total_price } = req.body;
  db.serialize(() => {
    db.run("INSERT INTO sales (product_id, quantity, total_price) VALUES (?, ?, ?)", [product_id, quantity, total_price]);
    db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product_id]);
  });
  res.json({ status: 'success' });
});

// API: Obtener historial de ventas
app.get('/api/sales', (req, res) => {
  db.all("SELECT s.*, p.name FROM sales s JOIN products p ON s.product_id = p.id ORDER BY s.date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor NutriBaja ejecutándose en puerto ${port}`);
});
