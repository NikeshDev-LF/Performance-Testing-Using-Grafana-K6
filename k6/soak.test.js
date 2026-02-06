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
            'products loaded': (r) => r.status === 200,
            'products response time stable': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
            'products data exists': (r) => JSON.parse(r.body).data.length > 0,
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
            'cart response time stable': (r) => r.timings.duration < config.thresholdLimits.addToCartResponseTime,
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
            'cart retrieved': (r) => r.status === 200,
            'cart has items': (r) => JSON.parse(r.body).data.length > 0,
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
            'checkout successful': (r) => r.status === 200,
            'checkout response time stable': (r) => r.timings.duration < 1200,
            'order created': (r) => JSON.parse(r.body).data.id !== undefined,
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
