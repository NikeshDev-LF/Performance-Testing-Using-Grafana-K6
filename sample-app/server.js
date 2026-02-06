import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
const products = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', stock: 200, image: '🎧' },
  { id: 2, name: 'Smart Watch', price: 199.99, category: 'Electronics', stock: 300, image: '⌚' },
  { id: 3, name: 'Laptop Backpack', price: 49.99, category: 'Accessories', stock: 1000, image: '🎒' },
  { id: 4, name: 'USB-C Cable', price: 12.99, category: 'Accessories', stock: 2000, image: '🔌' },
  { id: 5, name: 'Bluetooth Speaker', price: 59.99, category: 'Electronics', stock: 750, image: '🔊' },
  { id: 6, name: 'Phone Stand', price: 19.99, category: 'Accessories', stock: 1500, image: '📱' },
  { id: 7, name: 'Wireless Mouse', price: 34.99, category: 'Electronics', stock: 800, image: '🖱️' },
  { id: 8, name: 'Keyboard', price: 89.99, category: 'Electronics', stock: 450, image: '⌨️' }
];

const carts = {}; // { sessionId: [items] }
const orders = [];

// Simulate variable response times for performance testing
const simulateDelay = (min = 50, max = 200) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
  await simulateDelay(100, 300);
  res.json({ success: true, data: products });
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  await simulateDelay(50, 150);
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.status(404).json({ success: false, message: 'Product not found' });
  }
});

// Get cart
app.get('/api/cart/:sessionId', async (req, res) => {
  await simulateDelay(50, 100);
  const sessionId = req.params.sessionId;
  const cart = carts[sessionId] || [];
  res.json({ success: true, data: cart });
});

// Add to cart
app.post('/api/cart/:sessionId', async (req, res) => {
  await simulateDelay(100, 200);
  const sessionId = req.params.sessionId;
  const { productId, quantity } = req.body;
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  if (product.stock < quantity) {
    return res.status(400).json({ success: false, message: 'Insufficient stock' });
  }
  
  if (!carts[sessionId]) {
    carts[sessionId] = [];
  }
  
  const existingItem = carts[sessionId].find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[sessionId].push({ productId, quantity, product });
  }
  
  res.json({ success: true, data: carts[sessionId] });
});

// Update cart item
app.put('/api/cart/:sessionId/:productId', async (req, res) => {
  await simulateDelay(50, 150);
  const sessionId = req.params.sessionId;
  const productId = parseInt(req.params.productId);
  const { quantity } = req.body;
  
  if (!carts[sessionId]) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }
  
  const item = carts[sessionId].find(item => item.productId === productId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found in cart' });
  }
  
  if (quantity === 0) {
    carts[sessionId] = carts[sessionId].filter(item => item.productId !== productId);
  } else {
    item.quantity = quantity;
  }
  
  res.json({ success: true, data: carts[sessionId] });
});

// Remove from cart
app.delete('/api/cart/:sessionId/:productId', async (req, res) => {
  await simulateDelay(50, 100);
  const sessionId = req.params.sessionId;
  const productId = parseInt(req.params.productId);
  
  if (!carts[sessionId]) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }
  
  carts[sessionId] = carts[sessionId].filter(item => item.productId !== productId);
  res.json({ success: true, data: carts[sessionId] });
});

// Checkout
app.post('/api/checkout/:sessionId', async (req, res) => {
  await simulateDelay(200, 500); // Checkout takes longer
  const sessionId = req.params.sessionId;
  const { customerInfo } = req.body;
  
  const cart = carts[sessionId];
  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }
  
  // Validate stock and calculate total
  let total = 0;
  for (const item of cart) {
    const product = products.find(p => p.id === item.productId);
    if (!product || product.stock < item.quantity) {
      return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.name || 'product'}` });
    }
    total += product.price * item.quantity;
  }
  
  // Update stock
  for (const item of cart) {
    const product = products.find(p => p.id === item.productId);
    product.stock -= item.quantity;
  }
  
  // Create order
  const order = {
    id: orders.length + 1,
    sessionId,
    items: cart,
    customerInfo,
    total,
    timestamp: new Date().toISOString()
  };
  orders.push(order);
  
  // Clear cart
  delete carts[sessionId];
  
  res.json({ success: true, data: order });
});

// Get orders (for testing)
app.get('/api/orders', async (req, res) => {
  await simulateDelay(100, 200);
  res.json({ success: true, data: orders });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 E-commerce API server running on http://localhost:${PORT}`);
  console.log(`📊 Ready for performance testing!`);
});
