// Configuration
/* eslint-disable */
const API_BASE = 'http://localhost:3000/api';
const SESSION_ID = 'session_' + Math.random().toString(36).substr(2, 9);

// State
let products = [];
let cart = [];

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartIcon = document.getElementById('cartIcon');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const totalAmount = document.getElementById('totalAmount');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartView = document.getElementById('cartView');
const checkoutForm = document.getElementById('checkoutForm');
const customerForm = document.getElementById('customerForm');
const backToCart = document.getElementById('backToCart');
const successMessage = document.getElementById('successMessage');
const continueShopping = document.getElementById('continueShopping');

// Performance tracking (for Cypress integration)
window.performanceMetrics = {
    pageLoadTime: 0,
    apiCalls: [],
    userActions: []
};

// Track page load time
window.addEventListener('load', () => {
    window.performanceMetrics.pageLoadTime = performance.now();
});

// API Helper with performance tracking
async function apiCall(endpoint, options = {}) {
    const startTime = performance.now();
    const url = `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track API call performance
        window.performanceMetrics.apiCalls.push({
            endpoint,
            method: options.method || 'GET',
            duration,
            timestamp: new Date().toISOString()
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Track user actions
function trackAction(action, details = {}) {
    window.performanceMetrics.userActions.push({
        action,
        details,
        timestamp: new Date().toISOString()
    });
}

// Load Products
async function loadProducts() {
    try {
        const response = await apiCall('/products');
        if (response.success) {
            products = response.data;
            renderProducts();
            trackAction('products_loaded', { count: products.length });
        }
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Render Products
function renderProducts() {
    productsGrid.innerHTML = products.map(product => `
    <div class="product-card" data-testid="product-${product.id}">
      <div class="product-image">${product.image}</div>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-category">${product.category}</p>
      <p class="product-price">$${product.price.toFixed(2)}</p>
      <p class="product-stock ${product.stock < 10 ? 'low' : ''} ${product.stock === 0 ? 'out' : ''}" 
         data-testid="stock-${product.id}">
        ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
      </p>
      <button 
        class="btn btn-primary" 
        onclick="addToCart(${product.id})"
        ${product.stock === 0 ? 'disabled' : ''}
        data-testid="add-to-cart-${product.id}">
        ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  `).join('');
}

// Add to Cart
async function addToCart(productId) {
    trackAction('add_to_cart', { productId });

    try {
        const response = await apiCall(`/cart/${SESSION_ID}`, {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: 1 })
        });

        if (response.success) {
            cart = response.data;
            updateCartUI();

            // Show brief feedback
            const btn = document.querySelector(`[data-testid="add-to-cart-${productId}"]`);
            const originalText = btn.textContent;
            btn.textContent = 'Added! ✓';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);
    }
}

// Update Cart UI
function updateCartUI() {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = itemCount;

    if (itemCount > 0) {
        cartCount.style.display = 'flex';
    } else {
        cartCount.style.display = 'none';
    }
}

// Load Cart
async function loadCart() {
    try {
        const response = await apiCall(`/cart/${SESSION_ID}`);
        if (response.success) {
            cart = response.data;
            renderCart();
            updateCartUI();
        }
    } catch (error) {
        console.error('Failed to load cart:', error);
    }
}

// Render Cart
function renderCart() {
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        checkoutBtn.disabled = true;
        totalAmount.textContent = '$0.00';
        return;
    }

    checkoutBtn.disabled = false;

    cartItems.innerHTML = cart.map(item => `
    <div class="cart-item" data-testid="cart-item-${item.productId}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">$${item.product.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-controls">
        <button class="quantity-btn" onclick="updateQuantity(${item.productId}, ${item.quantity - 1})" 
                data-testid="decrease-${item.productId}">-</button>
        <span class="quantity" data-testid="quantity-${item.productId}">${item.quantity}</span>
        <button class="quantity-btn" onclick="updateQuantity(${item.productId}, ${item.quantity + 1})"
                data-testid="increase-${item.productId}">+</button>
        <button class="remove-btn" onclick="removeFromCart(${item.productId})"
                data-testid="remove-${item.productId}">🗑️</button>
      </div>
    </div>
  `).join('');

    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    totalAmount.textContent = `$${total.toFixed(2)}`;
}

// Update Quantity
async function updateQuantity(productId, newQuantity) {
    trackAction('update_quantity', { productId, newQuantity });

    if (newQuantity < 1) {
        return removeFromCart(productId);
    }

    try {
        const response = await apiCall(`/cart/${SESSION_ID}/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (response.success) {
            cart = response.data;
            renderCart();
            updateCartUI();
        }
    } catch (error) {
        console.error('Failed to update quantity:', error);
    }
}

// Remove from Cart
async function removeFromCart(productId) {
    trackAction('remove_from_cart', { productId });

    try {
        const response = await apiCall(`/cart/${SESSION_ID}/${productId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            cart = response.data;
            renderCart();
            updateCartUI();
        }
    } catch (error) {
        console.error('Failed to remove from cart:', error);
    }
}

// Show Cart Modal
function showCart() {
    trackAction('open_cart');
    loadCart();
    cartModal.classList.add('active');
    cartView.style.display = 'block';
    checkoutForm.classList.remove('active');
    successMessage.classList.remove('active');
}

// Hide Cart Modal
function hideCart() {
    trackAction('close_cart');
    cartModal.classList.remove('active');
}

// Show Checkout Form
function showCheckout() {
    trackAction('start_checkout');
    cartView.style.display = 'none';
    checkoutForm.classList.add('active');
}

// Back to Cart
function showCartView() {
    trackAction('back_to_cart');
    cartView.style.display = 'block';
    checkoutForm.classList.remove('active');
}

// Place Order
async function placeOrder(event) {
    event.preventDefault();
    trackAction('place_order');

    const formData = new FormData(customerForm);
    const customerInfo = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address')
    };

    try {
        const response = await apiCall(`/checkout/${SESSION_ID}`, {
            method: 'POST',
            body: JSON.stringify({ customerInfo })
        });

        if (response.success) {
            trackAction('order_success', { orderId: response.data.id });

            // Show success message
            checkoutForm.classList.remove('active');
            successMessage.classList.add('active');
            document.getElementById('orderId').textContent = `#${response.data.id}`;

            // Reset cart
            cart = [];
            updateCartUI();

            // Reset form
            customerForm.reset();

            // Reload products to update stock
            loadProducts();
        }
    } catch (error) {
        console.error('Failed to place order:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Continue Shopping
function closeModalAndContinue() {
    trackAction('continue_shopping');
    hideCart();
    successMessage.classList.remove('active');
    cartView.style.display = 'block';
}

// Event Listeners
cartIcon.addEventListener('click', showCart);
closeCart.addEventListener('click', hideCart);
checkoutBtn.addEventListener('click', showCheckout);
backToCart.addEventListener('click', showCartView);
customerForm.addEventListener('submit', placeOrder);
continueShopping.addEventListener('click', closeModalAndContinue);

// Close modal on outside click
cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        hideCart();
    }
});

// Initialize
loadProducts();
loadCart();
