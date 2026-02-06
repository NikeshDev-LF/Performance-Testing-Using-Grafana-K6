# Browser-Based vs API-Based Performance Testing with K6

## Overview

K6 supports two distinct approaches to performance testing:
- **API-Based Testing** (`k6/http`): Tests backend services directly via HTTP/HTTPS requests
- **Browser-Based Testing** (`k6/browser`): Tests frontend applications using a real Chromium browser

Each approach serves different testing objectives and comes with unique characteristics, advantages, and trade-offs.

---

## Quick Comparison

| Aspect | API-Based Testing | Browser-Based Testing |
|--------|------------------|----------------------|
| **Module** | `k6/http` | `k6/browser` |
| **Execution** | Synchronous | Asynchronous (async/await) |
| **Target** | Backend APIs | Frontend UI |
| **Protocol** | HTTP/REST/GraphQL | Browser automation |
| **Resource Usage** | Lightweight | Resource-intensive |
| **Max VUs** | Thousands | Dozens to hundreds |
| **Speed** | Fast (ms) | Slower (seconds) |
| **Test Focus** | API endpoints | User experience |
| **Visual Validation** | ❌ No | ✅ Yes (screenshots) |
| **JavaScript Execution** | ❌ No | ✅ Yes (frontend code) |
| **Real User Simulation** | Partial | Full |

---

## When to Use Each Approach

### Use API-Based Testing When:
- ✅ Testing backend API performance and scalability
- ✅ Validating API response times, status codes, and data structure
- ✅ Running high-volume load tests (1000+ concurrent users)
- ✅ Testing microservices or REST/GraphQL endpoints
- ✅ Focusing on server-side performance
- ✅ Running tests in CI/CD pipelines with limited resources
- ✅ Need fast feedback cycles

### Use Browser-Based Testing When:
- ✅ Testing frontend performance from user perspective
- ✅ Measuring page load times, rendering, and interactivity
- ✅ Validating JavaScript execution and DOM interactions
- ✅ Testing Single Page Applications (SPAs)
- ✅ Capturing visual evidence (screenshots, videos)
- ✅ Detecting frontend-specific issues (layout shifts, resource loading)
- ✅ Simulating real browser behavior
- ✅ Testing authenticated flows requiring cookie/session management

---

## Code Structure Comparison

### API-Based Test Example
```javascript
// Import HTTP module (synchronous)
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for API testing
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Configuration: stages-based load pattern
export const options = {
    vus: 1,
    duration: '1m',
    thresholds: {
        'http_req_duration': ['p(95)<500'],
        'http_req_failed': ['rate<0.1'],
        'errors': ['rate<0.05'],
    },
};

const BASE_URL = 'http://localhost:3000';

// Synchronous execution
export default function () {
    // HTTP GET request
    const response = http.get(`${BASE_URL}/api/products`, {
        tags: { name: 'GetProducts', method: 'GET' },
    });
    
    // Validate HTTP response
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'valid JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch {
                return false;
            }
        },
        'has products array': (r) => JSON.parse(r.body).data.length > 0,
    }) || errorRate.add(1);
    
    apiResponseTime.add(response.timings.duration);
    
    // HTTP POST request
    const cartResponse = http.post(
        `${BASE_URL}/api/cart/session_123`,
        JSON.stringify({ productId: 1, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(cartResponse, {
        'product added': (r) => r.status === 200,
        'has cart data': (r) => JSON.parse(r.body).data !== undefined,
    });
    
    sleep(1);
}
```

### Browser-Based Test Example
```javascript
// Import browser module (asynchronous)
import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for browser testing
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Rate('successful_navigations');

// Configuration: scenarios with browser options
export const options = {
    scenarios: {
        browser: {
            executor: 'constant-vus',
            vus: 1,
            duration: '1m',
            options: {
                browser: {
                    type: 'chromium',  // Browser type required
                },
            },
        },
    },
    thresholds: {
        'browser_errors': ['rate<0.1'],
        'page_load_time': ['p(95)<3000'],
        'successful_navigations': ['rate>0.9'],
    },
};

const BASE_URL = 'http://localhost:3000';

// Asynchronous execution with async/await
export default async function () {
    const page = browser.newPage();
    
    try {
        // Navigate to page (browser action)
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        
        const loadTime = Date.now();
        await page.waitForSelector('.product-list', { timeout: 5000 });
        pageLoadTime.add(Date.now() - loadTime);
        
        // DOM interactions
        const productCount = await page.locator('.product-card').count();
        check(productCount, {
            'products visible': (count) => count > 0,
        });
        
        // Click button (user interaction)
        const addButton = page.locator('.product-card').first().locator('button:has-text("Add to Cart")');
        await addButton.click();
        
        // Wait for dynamic content
        await page.waitForSelector('.cart-badge', { timeout: 3000 });
        
        const cartBadge = await page.locator('.cart-badge').textContent();
        check(cartBadge, {
            'cart updated': (text) => parseInt(text) > 0,
        });
        
        // Visual validation - screenshot capture
        await page.screenshot({ path: 'screenshots/smoke-cart.png' });
        
        successfulNavigations.add(1);
        
        sleep(1);
        
    } catch (error) {
        console.error('Browser test error:', error);
        errorRate.add(1);
    } finally {
        page.close();  // Always close page
    }
}
```

---

## Key Differences Breakdown

### 1. Module Imports

**API-Based:**
```javascript
import http from 'k6/http';
// All HTTP methods available: get, post, put, delete, patch, head, options
```

**Browser-Based:**
```javascript
import { browser } from 'k6/browser';
// Provides Chromium browser automation via Playwright-like API
```

### 2. Configuration Options

**API-Based:**
```javascript
export const options = {
    vus: 10,              // Virtual users
    duration: '5m',       // Test duration
    stages: [             // Load pattern
        { duration: '1m', target: 10 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'],  // HTTP-specific metrics
        'http_req_failed': ['rate<0.1'],
    },
};
```

**Browser-Based:**
```javascript
export const options = {
    scenarios: {                  // Scenarios required for browser tests
        browser: {
            executor: 'constant-vus',
            vus: 5,               // Fewer VUs (browser-intensive)
            duration: '5m',
            options: {
                browser: {
                    type: 'chromium',  // Must specify browser type
                },
            },
        },
    },
    thresholds: {
        'browser_web_vital_fcp': ['p(95)<2000'],  // Browser-specific metrics
        'browser_web_vital_lcp': ['p(95)<3000'],
        'page_load_time': ['p(95)<3000'],
    },
};
```

### 3. Execution Model

**API-Based (Synchronous):**
```javascript
export default function () {
    // Synchronous code - executes line by line
    const response = http.get(URL);  // Blocks until response
    check(response, {...});           // Executes immediately after
    sleep(1);                         // Blocks for 1 second
}
```

**Browser-Based (Asynchronous):**
```javascript
export default async function () {
    // Async function required
    const page = browser.newPage();
    
    await page.goto(URL);             // Must await browser actions
    await page.click('.button');      // Await user interactions
    await page.screenshot();          // Await I/O operations
    
    page.close();
}
```

### 4. Request/Action Methods

**API-Based (HTTP Requests):**
```javascript
// GET request
http.get(url, params);

// POST request with JSON body
http.post(url, JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
});

// Other HTTP methods
http.put(url, body, params);
http.delete(url, params);
http.patch(url, body, params);
```

**Browser-Based (DOM Interactions):**
```javascript
// Navigate
await page.goto(url, { waitUntil: 'networkidle' });

// Find elements
const button = page.locator('button#submit');
const text = page.locator('.product-name');

// Interact with elements
await button.click();
await page.fill('#username', 'testuser');
await page.selectOption('#country', 'US');

// Read element data
const count = await page.locator('.item').count();
const content = await page.textContent('.price');
const value = await page.inputValue('#email');

// Wait for elements
await page.waitForSelector('.loaded', { timeout: 5000 });
```

### 5. Validation Approach

**API-Based (Data Validation):**
```javascript
check(response, {
    // HTTP status validation
    'status is 200': (r) => r.status === 200,
    
    // Response time validation
    'response time < 500ms': (r) => r.timings.duration < 500,
    
    // JSON structure validation
    'valid JSON': (r) => {
        try {
            JSON.parse(r.body);
            return true;
        } catch {
            return false;
        }
    },
    
    // Business logic validation
    'has products': (r) => JSON.parse(r.body).data.length > 0,
    'all prices positive': (r) => 
        JSON.parse(r.body).data.every(p => p.price > 0),
});
```

**Browser-Based (Visual & Functional Validation):**
```javascript
// Element presence
const productCount = await page.locator('.product').count();
check(productCount, {
    'products visible': (count) => count > 0,
});

// Element content
const cartBadge = await page.textContent('.cart-badge');
check(cartBadge, {
    'cart updated': (text) => parseInt(text) > 0,
});

// Visual snapshot
await page.screenshot({ path: 'screenshots/page.png' });

// Navigation validation
check(page.url(), {
    'navigated to checkout': (url) => url.includes('/checkout'),
});

// Form validation
const inputValue = await page.inputValue('#name');
check(inputValue, {
    'form filled': (val) => val === 'Test User',
});
```

### 6. Custom Metrics

**API-Based Metrics:**
```javascript
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');

// Track in test
errorRate.add(response.status >= 400 ? 1 : 0);
apiResponseTime.add(response.timings.duration);
successfulRequests.add(1);
```

**Browser-Based Metrics:**
```javascript
import { Rate, Trend } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time');
const browserErrors = new Rate('browser_errors');
const successfulNavigations = new Rate('successful_navigations');
const failedNavigations = new Rate('failed_navigations');

// Track in test
const startTime = Date.now();
await page.goto(URL);
pageLoadTime.add(Date.now() - startTime);

successfulNavigations.add(1);  // On success
browserErrors.add(1);           // On error
```

### 7. Error Handling

**API-Based:**
```javascript
export default function () {
    const response = http.get(URL);
    
    if (response.status !== 200) {
        errorRate.add(1);
        console.error(`Request failed: ${response.status}`);
        return;
    }
    
    try {
        const data = JSON.parse(response.body);
        // Process data
    } catch (e) {
        console.error('JSON parse error:', e);
    }
}
```

**Browser-Based:**
```javascript
export default async function () {
    const page = browser.newPage();
    
    try {
        await page.goto(URL);
        await page.click('.button');
        successfulNavigations.add(1);
        
    } catch (error) {
        console.error('Browser test error:', error);
        errorRate.add(1);
        failedNavigations.add(1);
        
    } finally {
        page.close();  // Always close page to prevent memory leaks
    }
}
```

---

## Performance Characteristics

### Resource Consumption

| Resource | API-Based | Browser-Based |
|----------|-----------|---------------|
| **CPU Usage** | Low | High |
| **Memory per VU** | ~1-5 MB | ~50-100 MB |
| **Network Bandwidth** | Minimal (only API data) | High (HTML, CSS, JS, images) |
| **Disk I/O** | None (unless screenshots) | High (screenshots, videos) |
| **Max Concurrent VUs** | 10,000+ | 50-200 |

### Execution Speed

**API Test (1 iteration):**
```
Group: visit products    → ~20-100ms
Group: add to cart       → ~30-150ms
Group: view cart         → ~20-100ms
Group: checkout          → ~50-200ms
Total iteration time     → ~120-550ms
```

**Browser Test (1 iteration):**
```
Group: visit products    → ~1000-3000ms (page load + rendering)
Group: add to cart       → ~500-1500ms (click + AJAX + DOM update)
Group: view cart         → ~800-2000ms (navigation + page load)
Group: checkout          → ~1000-2500ms (form fill + validation)
Total iteration time     → ~3-9 seconds
```

### Scalability

**API-Based:**
- ✅ Can simulate 1000+ concurrent users on standard hardware
- ✅ Linear scaling with CPU cores
- ✅ Suitable for large-scale load testing
- ✅ Fast feedback (minutes for comprehensive tests)

**Browser-Based:**
- ⚠️ Limited to 50-200 concurrent browsers on powerful hardware
- ⚠️ High memory and CPU requirements
- ⚠️ Better suited for functional testing or small-scale load tests
- ⚠️ Slower feedback (may take 10x longer than API tests)

---

## Use Case Examples

### Scenario 1: E-commerce Site Testing

**Goal:** Test checkout flow under load

**API-Based Approach:**
```javascript
// Pros: Can simulate 1000+ users, fast execution, tests backend
// Cons: Doesn't validate UI, misses frontend issues
export default function () {
    const products = http.get(`${BASE_URL}/api/products`);
    
    const addToCart = http.post(`${BASE_URL}/api/cart`, 
        JSON.stringify({ productId: 1, qty: 1 }));
    
    const checkout = http.post(`${BASE_URL}/api/checkout`,
        JSON.stringify({ name: 'Test', email: 'test@example.com' }));
    
    check(checkout, {
        'checkout successful': (r) => r.status === 200,
    });
}
```
**Best for:** Backend capacity planning, API performance optimization

**Browser-Based Approach:**
```javascript
// Pros: Validates full UX, detects UI bugs, measures real user experience
// Cons: Limited scale (50-100 users), slower execution
export default async function () {
    const page = browser.newPage();
    
    await page.goto(BASE_URL);
    await page.click('.product:first-child .add-to-cart');
    await page.click('.cart-icon');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Checkout")');
    
    await page.screenshot({ path: 'checkout-success.png' });
    page.close();
}
```
**Best for:** UX validation, frontend performance, visual regression

### Scenario 2: Login Flow Testing

**API-Based:**
```javascript
export default function () {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
        JSON.stringify({ username: 'testuser', password: 'test123' }), 
        { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
        'login successful': (r) => r.status === 200,
        'token received': (r) => JSON.parse(r.body).token !== undefined,
    });
    
    const token = JSON.parse(response.body).token;
    
    // Use token in subsequent requests
    const profile = http.get(`${BASE_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
```

**Browser-Based:**
```javascript
export default async function () {
    const page = browser.newPage();
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for authentication redirect
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    
    check(page.url(), {
        'redirected to dashboard': (url) => url.includes('/dashboard'),
    });
    
    page.close();
}
```

---

## Migration Guide: API to Browser Tests

### Step 1: Change Imports
```javascript
// Before (API)
import http from 'k6/http';

// After (Browser)
import { browser } from 'k6/browser';
```

### Step 2: Update Configuration
```javascript
// Before (API)
export const options = {
    vus: 100,
    duration: '5m',
};

// After (Browser)
export const options = {
    scenarios: {
        browser: {
            executor: 'constant-vus',
            vus: 10,  // Reduce VU count
            duration: '5m',
            options: {
                browser: { type: 'chromium' }
            },
        },
    },
};
```

### Step 3: Convert Function to Async
```javascript
// Before (API)
export default function () {
    const response = http.get(URL);
}

// After (Browser)
export default async function () {
    const page = browser.newPage();
    try {
        await page.goto(URL);
    } finally {
        page.close();
    }
}
```

### Step 4: Replace HTTP Calls with Browser Actions
```javascript
// Before (API)
const response = http.get(`${BASE_URL}/products`);
check(response, {
    'status 200': (r) => r.status === 200,
    'has products': (r) => JSON.parse(r.body).data.length > 0,
});

// After (Browser)
await page.goto(`${BASE_URL}/products`);
const productCount = await page.locator('.product-card').count();
check(productCount, {
    'has products': (count) => count > 0,
});
```

### Step 5: Update Checks
```javascript
// Before (API) - JSON validation
'valid JSON': (r) => {
    try {
        JSON.parse(r.body);
        return true;
    } catch {
        return false;
    }
}

// After (Browser) - DOM validation
const element = await page.locator('.data').textContent();
check(element, {
    'valid data': (text) => text.length > 0,
});
```

---

## Best Practices

### API-Based Testing Best Practices

1. **Use Appropriate Think Time**
```javascript
sleep(Math.random() * 2 + 1);  // Random sleep 1-3 seconds
```

2. **Batch Independent Requests**
```javascript
const responses = http.batch([
    ['GET', `${BASE_URL}/api/products`],
    ['GET', `${BASE_URL}/api/categories`],
    ['GET', `${BASE_URL}/api/brands`],
]);
```

3. **Tag Requests for Reporting**
```javascript
http.get(URL, { tags: { name: 'GetProducts', api: 'v2' } });
```

4. **Validate Response Structure**
```javascript
check(response, {
    'has required fields': (r) => {
        const data = JSON.parse(r.body);
        return data.id && data.name && data.price;
    },
});
```

5. **Monitor Custom Business Metrics**
```javascript
const successRate = new Rate('business_success_rate');
successRate.add(response.status === 200 && data.success === true);
```

### Browser-Based Testing Best Practices

1. **Always Close Pages**
```javascript
export default async function () {
    const page = browser.newPage();
    try {
        await page.goto(URL);
    } finally {
        page.close();  // Prevent memory leaks
    }
}
```

2. **Use Explicit Waits**
```javascript
// Wait for specific element
await page.waitForSelector('.loaded', { timeout: 5000 });

// Wait for navigation
await page.waitForLoadState('networkidle');
```

3. **Handle Timeouts Gracefully**
```javascript
try {
    await page.click('.button', { timeout: 3000 });
} catch (error) {
    console.error('Button click timeout:', error);
    errorRate.add(1);
}
```

4. **Limit Screenshot Usage**
```javascript
// Only capture on failure or key checkpoints
if (checkFailed) {
    await page.screenshot({ path: `error-${Date.now()}.png` });
}
```

5. **Keep VU Count Realistic**
```javascript
// Browser tests: 5-50 VUs typical
// API tests: 100-10000+ VUs typical
export const options = {
    scenarios: {
        browser: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 10 },   // Max 10 VUs for browser
                { duration: '1m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            options: { browser: { type: 'chromium' } },
        },
    },
};
```

---

## Combining Both Approaches

You can run both API and browser tests in the same suite using scenarios:

```javascript
import http from 'k6/http';
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
    scenarios: {
        // Heavy API load testing
        api_load: {
            executor: 'ramping-vus',
            exec: 'apiTest',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 100 },
                { duration: '3m', target: 100 },
                { duration: '1m', target: 0 },
            ],
        },
        // Concurrent browser testing
        browser_test: {
            executor: 'constant-vus',
            exec: 'browserTest',
            vus: 5,
            duration: '5m',
            options: {
                browser: { type: 'chromium' },
            },
        },
    },
};

const BASE_URL = 'http://localhost:3000';

// API test function
export function apiTest() {
    const response = http.get(`${BASE_URL}/api/products`);
    check(response, {
        'API status 200': (r) => r.status === 200,
    });
}

// Browser test function
export async function browserTest() {
    const page = browser.newPage();
    try {
        await page.goto(BASE_URL);
        const count = await page.locator('.product').count();
        check(count, {
            'Browser: products visible': (c) => c > 0,
        });
    } finally {
        page.close();
    }
}
```

**Benefits of Combined Approach:**
- Test backend performance under realistic load (API tests)
- Validate frontend UX simultaneously (browser tests)
- Detect issues that only appear under combined load
- Comprehensive performance picture

---

## Troubleshooting

### API-Based Test Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| High failure rate | Server overload | Reduce VUs or increase ramp-up time |
| Slow response times | Network latency | Check server location, use local test env |
| JSON parse errors | Invalid API response | Add try-catch, validate content-type |
| 429 Too Many Requests | Rate limiting | Add delays, implement token bucket |
| Connection timeouts | Server unavailable | Check BASE_URL, ensure server is running |

### Browser-Based Test Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Out of memory | Too many browsers | Reduce VUs, ensure `page.close()` |
| Slow execution | Heavy page load | Optimize frontend, increase timeouts |
| Element not found | Timing issue | Use `waitForSelector()` with timeout |
| Screenshots failing | Disk space | Limit screenshots, use conditional capture |
| Browser crashes | Resource exhaustion | Reduce VUs, increase system resources |
| Timeout errors | Slow navigation | Increase `timeout` in goto/wait methods |

### Common Pitfalls

**API Tests:**
```javascript
// ❌ Bad: Missing error handling
const data = JSON.parse(response.body);  // May throw error

// ✅ Good: Safe parsing
let data;
try {
    data = JSON.parse(response.body);
} catch (e) {
    console.error('Parse error:', e);
    return;
}
```

**Browser Tests:**
```javascript
// ❌ Bad: Not closing pages (memory leak)
export default async function () {
    const page = browser.newPage();
    await page.goto(URL);
}

// ✅ Good: Always close
export default async function () {
    const page = browser.newPage();
    try {
        await page.goto(URL);
    } finally {
        page.close();
    }
}
```

---

## Decision Matrix

Use this matrix to choose the right approach:

```
                    API-Based    Browser-Based
                    ─────────    ──────────────
Backend focus          ✅✅          ❌
Frontend focus         ❌           ✅✅
High VU count          ✅✅          ❌
Visual validation      ❌           ✅✅
JavaScript testing     ❌           ✅✅
Fast execution         ✅✅          ❌
Low resources          ✅✅          ❌
Real user simulation   ⚠️            ✅✅
CI/CD friendly         ✅✅          ⚠️
Cost-effective         ✅✅          ❌

Legend: ✅✅ Excellent  ✅ Good  ⚠️ Limited  ❌ Not suitable
```

---

## Summary

### API-Based Testing (k6/http)
**Strengths:**
- High performance and scalability (1000+ VUs)
- Fast execution and quick feedback
- Low resource requirements
- Ideal for backend/API performance testing
- CI/CD friendly

**Limitations:**
- No frontend validation
- Misses browser-specific issues
- No visual validation
- Limited real user experience simulation

### Browser-Based Testing (k6/browser)
**Strengths:**
- Full user experience simulation
- Frontend performance measurement
- Visual validation (screenshots)
- JavaScript execution testing
- Detects UI/UX issues

**Limitations:**
- Resource-intensive (limited VUs)
- Slower execution
- Higher infrastructure costs
- Not suitable for high-scale load testing

### Recommendation
- **Use API-based testing** for backend performance, scalability testing, and high-volume load tests
- **Use browser-based testing** for frontend validation, UX testing, and visual regression
- **Use both together** for comprehensive application testing under realistic conditions

---

## Additional Resources

- [K6 HTTP Documentation](https://k6.io/docs/javascript-api/k6-http/)
- [K6 Browser Documentation](https://k6.io/docs/javascript-api/k6-browser/)
- [K6 Best Practices](https://k6.io/docs/misc/fine-tuning-os/)
- [Performance Testing Types](https://k6.io/docs/test-types/introduction/)
