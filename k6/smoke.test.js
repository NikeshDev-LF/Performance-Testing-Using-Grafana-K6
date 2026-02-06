import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/smoke.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Smoke test configuration from fixture
export const options = {
    vus: config.vus,
    duration: config.duration,
    thresholds: config.thresholds,
    tags: {
        test_type: config.testType,
        environment: config.environment,
    },
};

const BASE_URL = config.baseUrl;

function getSessionId() {
    return `smoke_session_${__VU}_${Date.now()}`;
}

export default function () {
    const sessionId = getSessionId();

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
            return JSON.parse(response.body).data;
        }
        return null;
    });

    // Group 2: Add products to cart
    const _products = group('add products to cart', function () {
        let response = http.get(`${BASE_URL}/api/products`);
        
        if (response.status !== 200) {
            errorRate.add(1);
            return null;
        }

        const products = JSON.parse(response.body).data;
        const randomProduct = products[Math.floor(Math.random() * products.length)];

        response = http.post(
            `${BASE_URL}/api/cart/${sessionId}`,
            JSON.stringify({
                productId: randomProduct.id,
                quantity: 1,
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

        sleep(config.sleepTimes.afterAddToCart);
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
        sleep(config.sleepTimes.afterViewCart);
    });

    // Group 4: Checkout process
    group('checkout process', function () {
        const response = http.post(
            `${BASE_URL}/api/checkout/${sessionId}`,
            JSON.stringify({
                customerInfo: {
                    name: `Smoke User`,
                    email: `smoke@example.com`,
                    phone: `1234567890`,
                    address: `Smoke Test Address`,
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
    });

    sleep(config.sleepTimes.afterIteration);
}

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
