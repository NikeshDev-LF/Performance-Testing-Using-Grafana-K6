import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration from fixtures
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/breakpoint.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Breakpoint test configuration from fixture
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
    return `breakpoint_session_${__VU}_${__ITER}`;
}

export default function () {
    const sessionId = getSessionId();
    const currentVUs = __VU;

    // Group 1: Visit product listing page
    group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        const ok = check(response, {
            'products loaded': (r) => r.status === 200,
            'products response acceptable': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
        });

        if (!ok) {
            errorRate.add(1);
            // Log when we start seeing failures
            if (currentVUs > 80) {
                console.log(`🔴 BREAKPOINT: Products failing at ${currentVUs} VUs - ${response.status} - ${response.timings.duration}ms`);
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
            'cart operation successful': (r) => r.status === 200,
        });

        if (!ok) {
            errorRate.add(1);
            if (currentVUs > 80) {
                console.log(`🔴 BREAKPOINT: Cart failing at ${currentVUs} VUs`);
            }
        }

        apiResponseTime.add(response.timings.duration);

        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }

        sleep(0.3);
    });

    // Group 3: Checkout (25% of users)
    if (Math.random() > 0.75) {
        group('checkout process', function () {
            const response = http.post(
                `${BASE_URL}/api/checkout/${sessionId}`,
                JSON.stringify({
                    customerInfo: {
                        name: `Break User ${__VU}`,
                        email: `break${__VU}@example.com`,
                        phone: `999${__VU}`,
                        address: `Breakpoint ${__VU}`,
                    },
                }),
                { 
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'Checkout', method: 'POST' },
                }
            );

            const ok = check(response, {
                'checkout successful': (r) => r.status === 200,
            });

            if (!ok) {
                errorRate.add(1);
                if (currentVUs > 80) {
                    console.log(`🔴 BREAKPOINT: Checkout failing at ${currentVUs} VUs`);
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
