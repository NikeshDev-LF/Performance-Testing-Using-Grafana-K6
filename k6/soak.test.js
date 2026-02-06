import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/soak.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const memoryLeakIndicator = new Trend('response_time_trend');

// Soak test configuration from fixture
export const options = {
    stages: config.stages,
    thresholds: config.thresholds,
    tags: {
        test_type: config.testType,
        environment: config.environment,
    },
};

const BASE_URL = config.baseUrl;

function getSessionId() {
    return `soak_session_${__VU}_${Date.now()}`;
}

export default function () {
    const sessionId = getSessionId();
    const startTime = Date.now();

    // Group 1: Visit product listing page
    group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        check(response, {
            // HTTP Status Validation
            'products loaded': (r) => r.status === 200,
            'status not 5xx': (r) => r.status < 500,
            'no timeout error': (r) => r.status !== 0,
            
            // Response Time Validation
            'products response time stable': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
            'response time < 500ms': (r) => r.timings.duration < 500,
            'response time < 1s': (r) => r.timings.duration < 1000,
            
            // JSON & Content Validation
            'valid JSON response': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
            'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
            'response not empty': (r) => r.body.length > 0,
            
            // Business Logic Validation
            'products data exists': (r) => JSON.parse(r.body).data !== undefined,
            'products array not empty': (r) => JSON.parse(r.body).data.length > 0,
            'each product has id': (r) => JSON.parse(r.body).data.every(p => p.id),
            'each product has name': (r) => JSON.parse(r.body).data.every(p => p.name),
            'each product has price': (r) => JSON.parse(r.body).data.every(p => p.price > 0),
            'each product has stock': (r) => JSON.parse(r.body).data.every(p => p.stock >= 0),
            
            // Security Checks
            'no SQL errors exposed': (r) => !r.body.toLowerCase().includes('sql'),
            'no stack traces leaked': (r) => !r.body.includes(' at ') && !r.body.includes('Error:'),
            'no sensitive data in response': (r) => {
                const body = r.body.toLowerCase();
                return !body.includes('password') && !body.includes('secret') && !body.includes('apikey');
            },
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);
        memoryLeakIndicator.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
            return JSON.parse(response.body).data;
        } else {
            failedRequests.add(1);
            return null;
        }
    });

    // Group 2: Add products to cart
    group('add products to cart', function () {
        let response = http.get(`${BASE_URL}/api/products`);
        
        if (response.status !== 200) {
            failedRequests.add(1);
            return;
        }

        const products = JSON.parse(response.body).data;
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const requestedQty = Math.floor(Math.random() * 3) + 1;

        response = http.post(
            `${BASE_URL}/api/cart/${sessionId}`,
            JSON.stringify({
                productId: randomProduct.id,
                quantity: requestedQty,
            }),
            { 
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'AddToCart', method: 'POST' },
            }
        );

        check(response, {
            // HTTP Status Validation
            'product added to cart': (r) => r.status === 200,
            'status not 5xx': (r) => r.status < 500,
            
            // Response Time Validation
            'cart response time stable': (r) => r.timings.duration < config.thresholdLimits.addToCartResponseTime,
            'add to cart < 500ms': (r) => r.timings.duration < 500,
            
            // JSON Validation
            'valid JSON response': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
            'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
            
            // Business Logic - Cart Item Validation
            'returns cart item data': (r) => r.status === 200 ? JSON.parse(r.body).data !== undefined : true,
            'cart item has id': (r) => r.status === 200 ? JSON.parse(r.body).data.id !== undefined : true,
            'correct product id returned': (r) => r.status === 200 ? JSON.parse(r.body).data.productId === randomProduct.id : true,
            'correct quantity returned': (r) => r.status === 200 ? JSON.parse(r.body).data.quantity === requestedQty : true,
            
            // Error Handling
            'proper error format on failure': (r) => {
                if (r.status >= 400) {
                    const body = JSON.parse(r.body);
                    return body.error !== undefined || body.message !== undefined;
                }
                return true;
            },
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(Math.random() * 2 + 1);
    });

    // Group 3: View cart
    group('view cart', function () {
        const response = http.get(`${BASE_URL}/api/cart/${sessionId}`, {
            tags: { name: 'GetCart', method: 'GET' },
        });
        
        check(response, {
            // HTTP Status Validation
            'cart retrieved': (r) => r.status === 200,
            'status not 5xx': (r) => r.status < 500,
            
            // Response Time Validation
            'cart retrieval < 500ms': (r) => r.timings.duration < 500,
            
            // JSON Validation
            'valid JSON response': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
            'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
            
            // Business Logic - Cart Structure
            'cart has data property': (r) => JSON.parse(r.body).data !== undefined,
            'cart has items': (r) => JSON.parse(r.body).data.length > 0,
            'each item has id': (r) => JSON.parse(r.body).data.every(item => item.id),
            'each item has productId': (r) => JSON.parse(r.body).data.every(item => item.productId),
            'each item has quantity': (r) => JSON.parse(r.body).data.every(item => item.quantity > 0),
            'each item has price': (r) => JSON.parse(r.body).data.every(item => item.price > 0),
            
            // Cart Total Calculation Validation
            'cart total exists': (r) => {
                const cart = JSON.parse(r.body);
                return cart.total !== undefined;
            },
            'cart total matches items': (r) => {
                const cart = JSON.parse(r.body);
                if (!cart.total || !cart.data) return false;
                const calculatedTotal = cart.data.reduce((sum, item) => 
                    sum + (item.price * item.quantity), 0);
                return Math.abs(cart.total - calculatedTotal) < 0.01;
            },
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(Math.random() * 2 + 2);
    });

    // Group 4: Checkout process
    group('checkout process', function () {
        // Get cart total before checkout for validation
        const cartResponse = http.get(`${BASE_URL}/api/cart/${sessionId}`);
        const cartTotal = cartResponse.status === 200 ? JSON.parse(cartResponse.body).total : 0;
        const cartItemCount = cartResponse.status === 200 ? JSON.parse(cartResponse.body).data.length : 0;
        
        const response = http.post(
            `${BASE_URL}/api/checkout/${sessionId}`,
            JSON.stringify({
                customerInfo: {
                    name: `Soak User ${__VU}`,
                    email: `soak${__VU}@example.com`,
                    phone: `123456${__VU}`,
                    address: `${__VU} Endurance Street`,
                },
            }),
            { 
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'Checkout', method: 'POST' },
            }
        );

        check(response, {
            // HTTP Status Validation
            'checkout successful': (r) => r.status === 200,
            'status not 5xx': (r) => r.status < 500,
            
            // Response Time Validation
            'checkout response time stable': (r) => r.timings.duration < 1200,
            'checkout < 1s': (r) => r.timings.duration < 1000,
            
            // JSON Validation
            'valid JSON response': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
            'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
            
            // Business Logic - Order Validation
            'order created': (r) => r.status === 200 ? JSON.parse(r.body).data.id !== undefined : true,
            'order id is valid': (r) => r.status === 200 ? JSON.parse(r.body).data.id.length > 0 : true,
            'order has timestamp': (r) => r.status === 200 ? JSON.parse(r.body).data.timestamp !== undefined : true,
            'order total exists': (r) => r.status === 200 ? JSON.parse(r.body).data.total !== undefined : true,
            'order total matches cart': (r) => r.status === 200 ? Math.abs(JSON.parse(r.body).data.total - cartTotal) < 0.01 : true,
            'order has items': (r) => r.status === 200 ? JSON.parse(r.body).data.items !== undefined : true,
            'order items preserved': (r) => r.status === 200 ? JSON.parse(r.body).data.items.length === cartItemCount : true,
            'order has customer info': (r) => r.status === 200 ? JSON.parse(r.body).data.customerInfo !== undefined : true,
            
            // Error Handling
            'proper error format on failure': (r) => {
                if (r.status >= 400) {
                    const body = JSON.parse(r.body);
                    return body.error !== undefined || body.message !== undefined;
                }
                return true;
            },
            'error message is meaningful': (r) => {
                if (r.status >= 400) {
                    const body = JSON.parse(r.body);
                    return (body.message || body.error || '').length > 0;
                }
                return true;
            },
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }
    });

    // Log degradation indicators periodically
    const elapsed = Date.now() - startTime;
    if (__ITER % 100 === 0) {
        console.log(`🕐 Soak Progress: VU${__VU} completed ${__ITER} iterations over ${(elapsed / 1000 / 60).toFixed(1)} minutes`);
    }

    sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
