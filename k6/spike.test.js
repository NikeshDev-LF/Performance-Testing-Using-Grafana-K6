import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/spike.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Spike test configuration from fixture
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
    return `spike_session_${__VU}_${__ITER}`;
}

export default function () {
    const sessionId = getSessionId();

    // Group 1: Visit product listing page
    group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        const ok = check(response, {
            'products loaded during spike': (r) => r.status === 200,
            'products response acceptable': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
        });

        if (!ok) {
            errorRate.add(1);
            if (__VU > 100) {
                console.log(`⚡ SPIKE: Products endpoint struggling at ${__VU} VUs - ${response.timings.duration}ms`);
            }
        }

        apiResponseTime.add(response.timings.duration);

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
                quantity: 1,
            }),
            { 
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'AddToCart', method: 'POST' },
            }
        );

        const ok = check(response, {
            'cart operation during spike': (r) => r.status === 200,
        });

        if (!ok) {
            errorRate.add(1);
            if (__VU > 100) {
                console.log(`⚡ SPIKE: Cart endpoint failing at ${__VU} VUs`);
            }
        }

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(0.3); // Minimal think time during spike
    });

    // Group 3: Checkout (only 30% of users during spike)
    if (Math.random() > 0.7) {
        group('checkout process', function () {
            const response = http.post(
                `${BASE_URL}/api/checkout/${sessionId}`,
                JSON.stringify({
                    customerInfo: {
                        name: `Spike User ${__VU}`,
                        email: `spike${__VU}@example.com`,
                        phone: `999${__VU}`,
                        address: `Spike Test ${__VU}`,
                    },
                }),
                { 
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'Checkout', method: 'POST' },
                }
            );

            const ok = check(response, {
                'checkout survives spike': (r) => r.status === 200,
            });

            if (!ok) {
                errorRate.add(1);
                if (__VU > 100) {
                    console.log(`⚡ SPIKE: Checkout failing at ${__VU} VUs`);
                }
            }

            apiResponseTime.add(response.timings.duration);

            if (response.status === 200) {
                successfulRequests.add(1);
            } else {
                failedRequests.add(1);
            }
        });
    }

    sleep(config.sleepTimes.afterIteration);
}

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
