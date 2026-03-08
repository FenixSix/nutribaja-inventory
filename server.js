const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Configurar conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/nutribaja',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Inicializar base de datos
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar datos iniciales si la tabla está vacía
    const result = await pool.query('SELECT COUNT(*) as count FROM products');
    if (result.rows[0].count === 0) {
      await pool.query(
        "INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)",
        ['BIOBAJA Creatina', 'Suplementos', 450, 50]
      );
      await pool.query(
        "INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)",
        ['BIOBAJA Proteína', 'Suplementos', 850, 30]
      );
      await pool.query(
        "INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)",
        ['BIOBAJA Multivitamínico', 'Suplementos', 350, 20]
      );
      await pool.query(
        "INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)",
        ['BIOBAJA Omega 3', 'Suplementos', 250, 40]
      );
    }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
}

initializeDatabase();

// API: Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Crear nuevo producto
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, category, price, stock]
    );
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Registrar una venta
app.post('/api/sales', async (req, res) => {
  try {
    const { product_id, quantity, total_price } = req.body;
    
    // Registrar venta
    await pool.query(
      'INSERT INTO sales (product_id, quantity, total_price) VALUES ($1, $2, $3)',
      [product_id, quantity, total_price]
    );
    
    // Actualizar stock
    await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [quantity, product_id]
    );
    
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Obtener historial de ventas
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, p.name FROM sales s JOIN products p ON s.product_id = p.id ORDER BY s.date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor NutriBaja ejecutándose en puerto ${port}`);
});
