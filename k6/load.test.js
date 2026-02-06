import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/load.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration from fixture
export const options = {
    stages: config.stages,
    thresholds: config.thresholds,
    tags: {
        test_type: config.testType,
        environment: config.environment,
    },
};

const BASE_URL = config.baseUrl;

// Generate unique session ID for each VU
function getSessionId() {
    return `session_${__VU}_${Date.now()}`;
}

export default function () {
    const sessionId = getSessionId();

    // Scenario: Complete shopping journey

    // Group 1: Visit product listing page
    group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        check(response, {
            'products loaded': (r) => r.status === 200,
            'products response time OK': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
            'products data exists': (r) => JSON.parse(r.body).data.length > 0,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
            const products = JSON.parse(response.body).data;

            // Store products for next group
            return products;
        } else {
            failedRequests.add(1);
            return null;
        }
    });

    // Group 2: Add products to shopping cart
    const _products = group('add products to cart', function () {
        // Get products first
        let response = http.get(`${BASE_URL}/api/products`);
        
        if (response.status !== 200) {
            failedRequests.add(1);
            return null;
        }

        const products = JSON.parse(response.body).data;
        const randomProduct = products[Math.floor(Math.random() * products.length)];

        response = http.post(
            `${BASE_URL}/api/cart/${sessionId}`,
            JSON.stringify({
                productId: randomProduct.id,
                quantity: Math.floor(Math.random() * 3) + 1,
            }),
            { 
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'AddToCart', method: 'POST' },
            }
        );

        check(response, {
            'product added to cart': (r) => r.status === 200,
            'cart response time OK': (r) => r.timings.duration < config.thresholdLimits.addToCartResponseTime,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(config.sleepTimes.afterAddToCart); // User thinks about adding more items

        return response.status === 200;
    });

    // Group 3: View cart
    group('view cart', function () {
        const response = http.get(`${BASE_URL}/api/cart/${sessionId}`, {
            tags: { name: 'GetCart', method: 'GET' },
        });
        
        check(response, {
            'cart retrieved': (r) => r.status === 200,
            'cart has items': (r) => JSON.parse(r.body).data.length > 0,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(config.sleepTimes.afterViewCart); // User reviews cart
    });

    // Group 4: Checkout process
    group('checkout process', function () {
        const response = http.post(
            `${BASE_URL}/api/checkout/${sessionId}`,
            JSON.stringify({
                customerInfo: {
                    name: `User ${__VU}`,
                    email: `user${__VU}@example.com`,
                    phone: `123456${__VU}`,
                    address: `${__VU} Test Street`,
                },
            }),
            { 
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'Checkout', method: 'POST' },
            }
        );

        check(response, {
            'checkout successful': (r) => r.status === 200,
            'checkout response time OK': (r) => r.timings.duration < config.thresholdLimits.checkoutResponseTime,
            'order created': (r) => JSON.parse(r.body).data.id !== undefined,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }
    });

    sleep(config.sleepTimes.afterIteration); // Think time between iterations
}

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
