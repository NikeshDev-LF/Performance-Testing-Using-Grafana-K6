import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/stress.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Stress test configuration from fixture
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
    return `stress_session_${__VU}_${__ITER}`;
}

export default function () {
    const sessionId = getSessionId();

    // Simplified journey for stress testing

    // Group 1: Health check
    group('health check', function () {
        const response = http.get(`${BASE_URL}/api/health`, {
            tags: { name: 'HealthCheck', method: 'GET' },
        });
        
        check(response, {
            'health check passed': (r) => r.status === 200,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);
    });

    // Group 2: Visit product listing page
    const products = group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        const productsOk = check(response, {
            'products loaded under stress': (r) => r.status === 200,
            'products response time acceptable': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
        });

        if (!productsOk) {
            errorRate.add(1);
            console.log(`⚠️  Products endpoint degraded at ${__VU} VUs - Response time: ${response.timings.duration}ms`);
        }

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            return JSON.parse(response.body).data;
        }
        return null;
    });

    if (products) {
        // Group 3: Add products to cart
        group('add products to cart', function () {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const response = http.post(
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

            const cartOk = check(response, {
                'cart operation successful under stress': (r) => r.status === 200,
            });

            if (!cartOk) {
                errorRate.add(1);
                console.log(`⚠️  Cart endpoint degraded at ${__VU} VUs`);
            }

            apiResponseTime.add(response.timings.duration);
        });

        // Group 4: Checkout process (50% of users)
        if (Math.random() > 0.5) {
            group('checkout process', function () {
                const response = http.post(
                    `${BASE_URL}/api/checkout/${sessionId}`,
                    JSON.stringify({
                        customerInfo: {
                            name: `Stress User ${__VU}`,
                            email: `stress${__VU}@example.com`,
                            phone: `999${__VU}`,
                            address: `Stress Test ${__VU}`,
                        },
                    }),
                    { 
                        headers: { 'Content-Type': 'application/json' },
                        tags: { name: 'Checkout', method: 'POST' },
                    }
                );

                const checkoutOk = check(response, {
                    'checkout works under stress': (r) => r.status === 200,
                });

                if (!checkoutOk) {
                    errorRate.add(1);
                    console.log(`⚠️  Checkout endpoint degraded at ${__VU} VUs`);
                }

                apiResponseTime.add(response.timings.duration);
            });
        }
    }

    sleep(config.sleepTimes.afterIteration); // Shorter think time for stress test
}

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
