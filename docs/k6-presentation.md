# K6 Performance Testing - Complete Presentation Guide

## Table of Contents
1. [What is Performance Testing?](#1-what-is-performance-testing)
2. [Introduction to K6](#2-introduction-to-k6)
3. [K6 Architecture & Execution Model](#3-k6-architecture--execution-model)
4. [Types of Performance Tests](#4-types-of-performance-tests)
5. [K6 Basics](#5-k6-basics)
6. [Options & Configuration](#6-options--configuration)
7. [Thresholds](#7-thresholds)
8. [Grouping](#8-grouping)
9. [API-Based Testing](#9-api-based-testing)
10. [Browser-Based Testing](#10-browser-based-testing)
11. [Metrics & Observability](#11-metrics--observability)
12. [Reporting](#12-reporting)
13. [CI/CD Pipeline Integration](#13-cicd-pipeline-integration)
14. [Best Practices](#14-best-practices)

---

## 1. What is Performance Testing?

### Definition

**Performance Testing** is a type of software testing that evaluates how a system performs under various conditions, focusing on speed, responsiveness, stability, and scalability.

### Why Performance Testing Matters

🎯 **User Experience**: 53% of mobile users abandon sites that take longer than 3 seconds to load

💰 **Business Impact**: 
- Amazon: 100ms delay = 1% sales loss
- Google: 500ms delay = 20% traffic drop
- Every second of delay can cost thousands in revenue

🔍 **Early Detection**: Find bottlenecks before production
- Cheaper to fix issues in testing vs production
- Prevents reputation damage
- Ensures SLA compliance

### Core Questions Performance Testing Answers

1. **How fast?** - Response times under normal conditions
2. **How many?** - Maximum concurrent users the system can handle
3. **How stable?** - System reliability over extended periods
4. **How resilient?** - Recovery from sudden traffic spikes
5. **What breaks?** - System limits and failure points

### Performance Testing vs Functional Testing

| Aspect | Functional Testing | Performance Testing |
|--------|-------------------|---------------------|
| **Focus** | Does it work correctly? | How fast/stable does it work? |
| **Validates** | Features, logic, outputs | Speed, capacity, stability |
| **Test Data** | Sample inputs | Realistic load patterns |
| **Users** | Single user typically | Multiple concurrent users |
| **Metrics** | Pass/Fail | Response time, throughput, errors |
| **Environment** | Any environment | Production-like |

### Key Performance Metrics

#### Response Time
- **Definition**: Time from request to complete response
- **User Perspective**: How long they wait
- **Goal**: Minimize to acceptable levels (typically <1s for web)

#### Throughput
- **Definition**: Requests processed per time unit (req/s)
- **System Perspective**: Processing capacity
- **Goal**: Maximize within resource constraints

#### Error Rate
- **Definition**: Percentage of failed requests
- **Reliability Indicator**: System stability
- **Goal**: Keep below acceptable threshold (typically <1%)

#### Concurrent Users
- **Definition**: Number of simultaneous active users
- **Scalability Indicator**: System capacity
- **Goal**: Support expected peak loads

### The Cost of Poor Performance

**Financial Impact:**
- Lost sales and conversions
- Increased infrastructure costs
- Customer churn

**Reputation Impact:**
- Negative reviews and social media
- Brand damage
- Competitive disadvantage

**Operational Impact:**
- Firefighting production issues
- Emergency scaling
- Team morale and burnout

### When to Test Performance

✅ **During Development**
- Continuous performance testing in CI/CD
- Catch regressions early
- Unit-level performance tests

✅ **Before Major Releases**
- Full load testing suite
- Stress and soak tests
- Production-like environments

✅ **After Infrastructure Changes**
- New deployments
- Database migrations
- CDN or caching changes

✅ **Regularly Scheduled**
- Weekly/monthly baseline tests
- Track performance trends
- Capacity planning

---

## 2. Introduction to K6

### What is K6?

**K6** is a modern, open-source load testing tool designed for testing the performance of APIs, websites, and microservices. Built with developers in mind, K6 uses JavaScript (ES6) to write test scripts.

### Key Features

✅ **Developer-Friendly**: Write tests in JavaScript
✅ **CLI-Based**: Easy integration with CI/CD pipelines
✅ **Performance Focused**: High performance with low resource usage
✅ **Rich Metrics**: Built-in metrics and custom metrics support
✅ **Cloud & Local**: Run tests locally or in the cloud
✅ **Browser Testing**: Full browser automation with Chromium
✅ **Protocol Support**: HTTP, WebSockets, gRPC, and more

### Why Use K6?

| Use Case | Description |
|----------|-------------|
| **Load Testing** | Test system behavior under expected traffic |
| **Stress Testing** | Push system beyond its limits |
| **Spike Testing** | Test sudden traffic surges |
| **Soak Testing** | Long-duration tests for stability |
| **Smoke Testing** | Minimal load to verify basic functionality |

### Test Suite Overview

The project includes **7 test types**, each available in both API and browser versions:

| Test Type | Purpose | API Test File | Browser Test File |
|-----------|---------|---------------|-------------------|
| **Smoke** | Minimal load validation | `k6/smoke.test.js` | `k6-browser/smoke.browser.test.js` |
| **Load** | Expected traffic testing | `k6/load.test.js` | `k6-browser/load.browser.test.js` |
| **Average Load** | Sustained normal traffic | `k6/average-load.test.js` | `k6-browser/average-load.browser.test.js` |
| **Stress** | Beyond capacity testing | `k6/stress.test.js` | `k6-browser/stress.browser.test.js` |
| **Spike** | Sudden traffic surge | `k6/spike.test.js` | `k6-browser/spike.browser.test.js` |
| **Soak** | Long-duration stability | `k6/soak.test.js` | `k6-browser/soak.browser.test.js` |
| **Breakpoint** | Find system limits | `k6/breakpoint.test.js` | `k6-browser/breakpoint.browser.test.js` |

**Folder Structure:**
```
k6/                          # API-based tests (HTTP requests)
k6-browser/                  # Browser-based tests (Chromium)
fixture/                     # Configuration files
  common.config.json         # Shared settings
  smoke.config.json          # Test-specific configs
  load.config.json
  average-load.config.json
  ...
reports/                     # Generated HTML & JSON reports
  smoke/
  load/
  average-load/
  ...
```

---

## 3. K6 Architecture & Execution Model

### How K6 Works

K6 is built in **Go** for performance, but tests are written in **JavaScript** (ES6). Understanding this architecture helps you write better tests.

### Core Components

```
┌─────────────────────────────────────────────────┐
│  Test Script (JavaScript ES6)                   │
│  - User code                                    │
│  - Test logic                                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  K6 Engine (Go Runtime)                         │
│  - JavaScript interpreter (goja)                │
│  - Metric collection                            │
│  - VU orchestration                             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Virtual Users (VUs)                            │
│  - Independent execution contexts               │
│  - Each runs default function repeatedly        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  HTTP Requests / Browser Actions                │
│  - Target system                                │
└─────────────────────────────────────────────────┘
```

### Test Lifecycle

**1. Init Phase (Once)**
```javascript
// Runs once per VU at startup
import http from 'k6/http';
const config = JSON.parse(open('config.json'));
```

**2. Setup Phase (Once)**
```javascript
// Runs once before test starts
export function setup() {
    // Initialize test data, create test users, authentication
    return { token: 'xyz' };
}
```

**3. VU Phase (Repeated)**
```javascript
// Each VU runs this repeatedly
export default function (data) {
    // Main test logic
    // data = return value from setup()
}
```

**4. Teardown Phase (Once)**
```javascript
// Runs once after test completes
export function teardown(data) {
    // Cleanup, delete test data
}
```

### Virtual User (VU) Execution

**Key Concepts:**

1. **Iteration**: One complete execution of the `default function`
2. **VU**: Independent execution context (like a user)
3. **Shared State**: VUs are isolated (no shared variables)
4. **Built-in Variables**:
   - `__VU`: Current VU number (1, 2, 3...)
   - `__ITER`: Current iteration number for this VU

```javascript
export default function () {
    console.log(`VU ${__VU}, Iteration ${__ITER}`);
    // VU 1, Iteration 0
    // VU 1, Iteration 1
    // VU 2, Iteration 0
}
```

### Execution Flow Example

```
Time: 0s         30s          60s         90s
      ├───────────┬────────────┬───────────┤
VU 1  │████████████████████████████████████│ → Iterations
VU 2  │    ██████████████████████████████████│
VU 3  │         ██████████████████████████
VU 4  │              ████████████████████████│
VU 5  │                   ███████████████████│

Each █ block = one iteration (default function execution)
```

### Memory Model

**VU Code Isolation:**
```javascript
// ❌ This won't work - VUs don't share state
let counter = 0;

export default function () {
    counter++; // Each VU has its own counter
    console.log(counter); // Always prints 1, 2, 3...
}
```

**Solution for Shared Data:**
```javascript
// ✅ Use setup() for shared initialization
export function setup() {
    return { users: ['user1', 'user2', 'user3'] };
}

export default function (data) {
    // All VUs can access this shared data
    const user = data.users[__VU % data.users.length];
}
```

---

## 4. Types of Performance Tests

### Overview

Different test types answer different questions about your system's performance. Understanding when and how to use each type is critical for comprehensive performance testing.

### Test Type Characteristics

| Test Type | Load | Duration | Purpose | Frequency |
|-----------|------|----------|---------|-----------|
| **Smoke** | Minimal (1-2 VUs) | 1-2 min | Verify basics | Every commit |
| **Load** | Average (10-50 VUs) | 5-10 min | Normal traffic | Daily/PR |
| **Average Load** | Sustained (20-40 VUs) | 15-20 min | Realistic patterns | Weekly |
| **Stress** | High (100-200 VUs) | 10-15 min | Breaking point | Weekly |
| **Spike** | Sudden surge | 3-5 min | Traffic spikes | Weekly |
| **Soak** | Sustained (30+ VUs) | 4-24 hours | Stability | Monthly |
| **Breakpoint** | Incremental | 20-30 min | Max capacity | Ad-hoc |

### Load Pattern Visualizations

**Smoke Test:**
```
VUs
 1  │████████████████
    └────────────────
    1 minute
```

**Load Test:**
```
VUs
20  │        ┌──────────┐
    │       /            \
10  │  ┌───┘              └───┐
    │ /                        \
 0  └──────────────────────────
    30s  1m    1m    1m    30s
```

**Stress Test:**
```
VUs
200 │              ┌─────┐
    │             /       \
100 │      ┌─────┘         \
    │     /                 \
 20 │────┘                   └──
    └────────────────────────────
    2m  2m   3m     3m   2m
```

**Spike Test:**
```
VUs
200 │         ┌──┐
    │         │  │
    │         │  │
 10 │────────┘  └────────
    └────────────────────
    1m   30s  30s   1m
```

**Average Load Test (Your Implementation):**
```
VUs
40  │         ┌───────────┐
    │        /             \
20  │   ┌───┘               └───┐
    │  /                         \
 0  └──────────────────────────────
    2m  5m       5m      5m  2m
```

### When to Use Each Test Type

**Smoke Test - Daily/Every Commit:**
- Verify script works
- Check all endpoints accessible
- Quick sanity check (1-2 minutes)

**Load Test - Regular Testing:**
- Validate normal performance
- Ensure SLAs are met
- Baseline measurements

**Average Load Test - Weekly Validation:**
- Realistic sustained traffic
- Performance regression detection
- Pre-release validation

**Stress Test - Capacity Planning:**
- Find degradation points
- Test error handling
- Plan infrastructure scaling

**Spike Test - Event Preparation:**
- Marketing campaigns
- Flash sales
- Sudden viral traffic

**Soak Test - Stability Verification:**
- Memory leak detection
- Resource exhaustion
- Long-term stability

**Breakpoint Test - Limit Finding:**
- Maximum capacity
- Infrastructure sizing
- Bottleneck identification

---

## 5. K6 Basics

### Installation

```bash
# Windows (via Chocolatey)
choco install k6

# macOS (via Homebrew)
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Basic Test Structure

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Configuration
export const options = {
    vus: 10,        // Virtual Users
    duration: '30s', // Test duration
};

// 2. Setup (runs once before test)
export function setup() {
    // Initialize test data
    return { token: 'auth-token' };
}

// 3. Default function (main test logic)
export default function (data) {
    // Make HTTP request
    const response = http.get('https://api.example.com/products');
    
    // Validate response
    check(response, {
        'status is 200': (r) => r.status === 200,
    });
    
    // Pause between iterations
    sleep(1);
}

// 4. Teardown (runs once after test)
export function teardown(data) {
    // Cleanup test data
}
```

### Core Modules

| Module | Purpose | Import Statement |
|--------|---------|------------------|
| `k6/http` | HTTP requests | `import http from 'k6/http';` |
| `k6/browser` | Browser automation | `import { browser } from 'k6/browser';` |
| `k6/metrics` | Custom metrics | `import { Rate, Trend } from 'k6/metrics';` |
| `k6` | Checks, groups, sleep | `import { check, group, sleep } from 'k6';` |

### Virtual Users (VUs)

**Virtual Users** simulate real users interacting with your application.

```javascript
export const options = {
    vus: 50,        // 50 concurrent users
    duration: '5m',  // Run for 5 minutes
};
```

**Each VU:**
- Runs the `default function()` repeatedly
- Maintains its own iteration state
- Simulates a single user session

---

## 6. Options & Configuration

### What are Options?

**Options** define how K6 executes your test. They control:
- Number of virtual users
- Test duration
- Load patterns (stages)
- Thresholds for pass/fail criteria
- Tags and metadata

### Configuration Approaches

#### Approach 1: Inline Options

```javascript
export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<500'],
    },
};
```

#### Approach 2: External Configuration (Recommended)

**File Structure:**
```
fixture/
├── common.config.json           # Shared settings
└── load.config.json             # Test-specific settings
```

**common.config.json:**
```json
{
  "environment": "local",
  "baseUrl": "http://localhost:3000"
}
```

**average-load.config.json:**
```json
{
  "testName": "Average Load Test",
  "testType": "average_load_test",
  "stages": [
    { "duration": "2m", "target": 20 },
    { "duration": "5m", "target": 20 },
    { "duration": "2m", "target": 40 },
    { "duration": "5m", "target": 40 },
    { "duration": "2m", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<500", "p(99)<1000"],
    "http_req_failed": ["rate<0.05"],
    "errors": ["rate<0.05"],
    "api_response_time": ["p(95)<400"],
    "group_duration{group:::visit product listing page}": ["p(95)<500"],
    "group_duration{group:::add products to cart}": ["p(95)<400"],
    "group_duration{group:::view cart}": ["p(95)<300"],
    "group_duration{group:::checkout process}": ["p(95)<1000"]
  },
  "thresholdLimits": {
    "productsResponseTime": 500,
    "addToCartResponseTime": 400,
    "viewCartResponseTime": 300,
    "checkoutResponseTime": 1000
  },
  "sleepTimes": {
    "afterAddToCart": "random",
    "afterIteration": "random"
  },
  "reportPath": "reports/average-load/average-load-test-report.html",
  "jsonReportPath": "reports/average-load/average-load-test-report.json"
}
```

**Loading Configuration in Test:**
```javascript
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load and merge configurations
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/average-load.config.json'));
const config = { ...commonConfig, ...testConfig };

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Average-load test configuration from fixture
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
    return `avg_session_${__VU}_${Date.now()}`;
}

// Generate reports at end of test
export function handleSummary(data) {
    return generateHTMLReport(data, config.reportPath);
}
```

### Load Patterns with Stages

**Stages** define how load changes over time:

```javascript
export const options = {
    stages: [
        { duration: '1m', target: 20 },   // Ramp-up to 20 VUs
        { duration: '3m', target: 20 },   // Stay at 20 VUs
        { duration: '1m', target: 50 },   // Ramp-up to 50 VUs
        { duration: '3m', target: 50 },   // Stay at 50 VUs
        { duration: '2m', target: 0 },    // Ramp-down to 0
    ],
};
```

**Visual Representation:**
```
VUs
50 |          ┌────────────┐
   |         /              \
20 |────────┘                \
   |                          \
 0 └────────────────────────────
    1m  3m  1m     3m       2m
```

### Common Options

| Option | Description | Example |
|--------|-------------|---------|
| `vus` | Number of virtual users | `vus: 10` |
| `duration` | Test duration | `duration: '5m'` |
| `stages` | Load pattern stages | `stages: [...]` |
| `thresholds` | Pass/fail criteria | `thresholds: {...}` |
| `iterations` | Total iterations | `iterations: 100` |
| `tags` | Metadata tags | `tags: { env: 'prod' }` |
| `scenarios` | Complex execution patterns | `scenarios: {...}` |

### Scenarios (Advanced)

**Scenarios** provide fine-grained control over test execution:

```javascript
export const options = {
    scenarios: {
        // Scenario 1: Constant VUs
        constant_load: {
            executor: 'constant-vus',
            vus: 10,
            duration: '5m',
        },
        // Scenario 2: Ramping VUs
        ramping_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 20 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 0 },
            ],
        },
        // Scenario 3: Per-VU iterations
        shared_iterations: {
            executor: 'shared-iterations',
            vus: 10,
            iterations: 100,
        },
    },
};
```

---

## 7. Thresholds

### What are Thresholds?

**Thresholds** define pass/fail criteria for your test. If any threshold fails, K6 exits with a non-zero status code (useful for CI/CD).

### Thresholds vs Checks

| Aspect | Checks | Thresholds |
|--------|--------|------------|
| **Purpose** | Validate individual responses | Define overall test success criteria |
| **Failure Impact** | Logs failure, continues test | Fails entire test |
| **Scope** | Per request | Entire test run |
| **Usage** | Data validation | Performance SLAs |

### Syntax

```javascript
export const options = {
    thresholds: {
        'metric_name': ['condition1', 'condition2'],
    },
};
```

### Built-in Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `http_req_duration` | Total request time | milliseconds |
| `http_req_failed` | Failed requests rate | percentage |
| `http_req_waiting` | Time waiting for response | milliseconds |
| `http_reqs` | Total HTTP requests | count |
| `iterations` | Total iterations | count |
| `iteration_duration` | Time for full iteration | milliseconds |
| `vus` | Active virtual users | count |
| `data_received` | Data received | bytes |
| `data_sent` | Data sent | bytes |

### Common Threshold Conditions

#### Percentiles (Response Time)
```javascript
thresholds: {
    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],
    
    // 99% of requests should be below 1000ms
    'http_req_duration': ['p(99)<1000'],
    
    // Median should be below 300ms
    'http_req_duration': ['p(50)<300'],
}
```

#### Error Rates
```javascript
thresholds: {
    // Less than 1% of requests should fail
    'http_req_failed': ['rate<0.01'],
    
    // Less than 5% error rate on custom metric
    'errors': ['rate<0.05'],
}
```

#### Aggregations
```javascript
thresholds: {
    // Average response time
    'http_req_duration': ['avg<400'],
    
    // Maximum response time
    'http_req_duration': ['max<2000'],
    
    // Minimum throughput
    'http_reqs': ['rate>100'], // At least 100 req/s
}
```

### Custom Metrics with Thresholds

```javascript
import { Rate, Trend, Counter } from 'k6/metrics';

// Define custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const paymentFailures = new Counter('payment_failures');

export const options = {
    thresholds: {
        // Thresholds for custom metrics
        'errors': ['rate<0.05'],
        'api_response_time': ['p(95)<600', 'avg<400'],
        'payment_failures': ['count<10'],
    },
};

export default function () {
    const response = http.get('https://api.example.com/products');
    
    // Record custom metrics
    apiResponseTime.add(response.timings.duration);
    
    check(response, {
        'status is 200': (r) => r.status === 200,
    }) || errorRate.add(1); // Increment error rate on failure
}
```

### Group Thresholds

Apply thresholds to specific groups:

```javascript
export const options = {
    thresholds: {
        // Threshold for specific group
        'group_duration{group:::checkout}': ['p(95)<3000'],
        'group_duration{group:::product listing}': ['p(95)<500'],
    },
};

export default function () {
    group('product listing', function () {
        http.get(`${BASE_URL}/api/products`);
    });
    
    group('checkout', function () {
        http.post(`${BASE_URL}/api/checkout`, payload);
    });
}
```

### Real-World Threshold Examples

```javascript
export const options = {
    thresholds: {
        // Response time SLAs
        'http_req_duration': [
            'p(50)<200',   // 50% under 200ms
            'p(95)<500',   // 95% under 500ms
            'p(99)<1000',  // 99% under 1s
        ],
        
        // Error budget: 0.1% failure rate
        'http_req_failed': ['rate<0.001'],
        
        // Throughput requirement
        'http_reqs': ['rate>50'], // At least 50 req/s
        
        // Custom business metrics
        'successful_checkouts': ['rate>0.95'],
        'cart_abandonment': ['rate<0.2'],
        
        // Group-specific SLAs
        'group_duration{group:::homepage}': ['p(95)<2000'],
        'group_duration{group:::search}': ['p(95)<1000'],
        'group_duration{group:::checkout}': ['p(95)<3000'],
    },
};
```

---

## 8. Grouping

### What is Grouping?

**Groups** organize related requests into logical sections, making it easier to:
- Identify performance bottlenecks
- Apply specific thresholds to workflows
- Structure reports by user journey
- Analyze metrics by business function

### Basic Group Syntax

```javascript
import { group } from 'k6';

export default function () {
    group('user login', function () {
        // Login-related requests
        http.post(`${BASE_URL}/api/login`, payload);
    });
    
    group('browse products', function () {
        // Product browsing requests
        http.get(`${BASE_URL}/api/products`);
        http.get(`${BASE_URL}/api/categories`);
    });
}
```

### Nested Groups

```javascript
export default function () {
    group('e-commerce workflow', function () {
        
        group('authentication', function () {
            http.post(`${BASE_URL}/api/login`);
            sleep(1);
        });
        
        group('shopping', function () {
            http.get(`${BASE_URL}/api/products`);
            sleep(2);
            http.post(`${BASE_URL}/api/cart/add`);
            sleep(1);
        });
        
        group('checkout', function () {
            http.get(`${BASE_URL}/api/cart`);
            http.post(`${BASE_URL}/api/checkout`);
            sleep(2);
        });
    });
}
```

### Group Metrics

Groups automatically generate metrics:

```javascript
// Automatic metrics for each group:
// - group_duration{group:::group_name}
// - groups (counter)
```

**View in Results:**
```
group_duration{group:::authentication}.....: avg=250ms p(95)=350ms
group_duration{group:::shopping}............: avg=450ms p(95)=650ms
group_duration{group:::checkout}.............: avg=850ms p(95)=1200ms
```

### Real-World Example

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';

export default function () {
    const sessionId = getSessionId();

    // Group 1: Visit product listing page
    group('visit product listing page', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        check(response, {
            // HTTP Status Validation
            'products loaded': (r) => r.status === 200,
            'products - status not 5xx': (r) => r.status < 500,
            'no timeout error': (r) => r.status !== 0,
            
            // Response Time Validation
            'products response time OK': (r) => r.timings.duration < config.thresholdLimits.productsResponseTime,
            'products - response time < 500ms': (r) => r.timings.duration < 500,
            
            // JSON & Content Validation
            'products - valid JSON response': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
            'products - content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
            
            // Business Logic Validation
            'products data exists': (r) => JSON.parse(r.body).data !== undefined,
            'products array not empty': (r) => JSON.parse(r.body).data.length > 0,
            'each product has id': (r) => JSON.parse(r.body).data.every(p => p.id),
            'each product has price': (r) => JSON.parse(r.body).data.every(p => p.price > 0),
            
            // Security Checks
            'no SQL errors exposed': (r) => !r.body.toLowerCase().includes('sql'),
            'no stack traces leaked': (r) => !r.body.includes(' at ') && !r.body.includes('Error:'),
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);
        
        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }
    });

    // Group 2: Add products to cart
    group('add products to cart', function () {
        // First get products list
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
            'product added to cart': (r) => r.status === 200,
            'add to cart - status not 5xx': (r) => r.status < 500,
            'add to cart - response time OK': (r) => r.timings.duration < config.thresholdLimits.addToCartResponseTime,
            'returns cart item data': (r) => r.status === 200 ? JSON.parse(r.body).data !== undefined : true,
            'correct product id returned': (r) => r.status === 200 ? JSON.parse(r.body).data.productId === randomProduct.id : true,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);
        
        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }
        
        sleep(Math.random() * 2 + 1); // 1-3 seconds
    });

    // Group 3: View cart
    group('view cart', function () {
        const response = http.get(`${BASE_URL}/api/cart/${sessionId}`, {
            tags: { name: 'GetCart', method: 'GET' },
        });
        
        check(response, {
            'cart retrieved': (r) => r.status === 200,
            'view cart - status not 5xx': (r) => r.status < 500,
            'view cart - response time OK': (r) => r.timings.duration < config.thresholdLimits.viewCartResponseTime,
            'cart has data property': (r) => JSON.parse(r.body).data !== undefined,
            'cart has items': (r) => JSON.parse(r.body).data.length > 0,
            'each item has productId': (r) => JSON.parse(r.body).data.every(item => item.productId),
            'each item has quantity': (r) => JSON.parse(r.body).data.every(item => item.quantity > 0),
            'cart total exists': (r) => JSON.parse(r.body).total !== undefined,
        }) || errorRate.add(1);

        apiResponseTime.add(response.timings.duration);
        
        if (response.status === 200) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
        }
        
        sleep(Math.random() * 2 + 2); // 2-4 seconds
    });

    // Group 4: Checkout process
    group('checkout process', function () {
        // Get cart total before checkout for validation
        const cartResponse = http.get(`${BASE_URL}/api/cart/${sessionId}`);
        const cartTotal = cartResponse.status === 200 ? JSON.parse(cartResponse.body).total : 0;
        
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
            'checkout - status not 5xx': (r) => r.status < 500,
            'checkout - response time OK': (r) => r.timings.duration < config.thresholdLimits.checkoutResponseTime,
            'order id returned': (r) => r.status === 200 ? JSON.parse(r.body).data?.orderId !== undefined : true,
            'order total matches cart': (r) => {
                if (r.status === 200 && cartTotal > 0) {
                    const orderTotal = JSON.parse(r.body).data?.total;
                    return Math.abs(orderTotal - cartTotal) < 0.01;
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
        
        sleep(Math.random() * 3 + 2); // 2-5 seconds
    });
}
```

### Group Benefits

✅ **Better Organization**: Clear test structure
✅ **Granular Metrics**: Per-group performance data
✅ **Targeted Thresholds**: Different SLAs per workflow
✅ **Easier Debugging**: Identify slow sections quickly
✅ **Business Context**: Metrics aligned with user journeys

---

## 9. API-Based Testing

### Overview

**API-based testing** focuses on testing backend services directly via HTTP/HTTPS requests without a browser.

### When to Use API Testing

✅ Testing backend API performance
✅ High-volume load tests (1000+ VUs)
✅ Fast execution required
✅ REST/GraphQL endpoints
✅ Microservices testing
✅ CI/CD integration

### Basic API Test Structure

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'],
        'http_req_failed': ['rate<0.1'],
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // GET request
    group('GET Products', function () {
        const response = http.get(`${BASE_URL}/api/products`);
        
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
        }) || errorRate.add(1);
        
        apiResponseTime.add(response.timings.duration);
    });
    
    sleep(1);
}
```

### HTTP Methods

#### GET Request
```javascript
const response = http.get('https://api.example.com/products');
```

#### POST Request
```javascript
const payload = JSON.stringify({
    name: 'Product',
    price: 29.99,
});

const params = {
    headers: {
        'Content-Type': 'application/json',
    },
};

const response = http.post('https://api.example.com/products', payload, params);
```

#### PUT Request
```javascript
const payload = JSON.stringify({
    name: 'Updated Product',
    price: 39.99,
});

const response = http.put('https://api.example.com/products/1', payload, params);
```

#### DELETE Request
```javascript
const response = http.del('https://api.example.com/products/1');
```

#### PATCH Request
```javascript
const payload = JSON.stringify({ price: 34.99 });
const response = http.patch('https://api.example.com/products/1', payload, params);
```

### Request Parameters

```javascript
const params = {
    // Headers
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
        'Custom-Header': 'value',
    },
    
    // Tags for filtering metrics
    tags: {
        name: 'GetProducts',
        method: 'GET',
        endpoint: '/api/products',
    },
    
    // Timeout
    timeout: '60s',
    
    // Redirects
    redirects: 5,
};

const response = http.get(`${BASE_URL}/api/products`, params);
```

### Response Object

```javascript
const response = http.get('https://api.example.com/products');

// Status code
console.log(response.status);        // 200

// Response body
console.log(response.body);          // JSON string

// Headers
console.log(response.headers);       // Object with headers

// Timings
console.log(response.timings.duration);  // Total time
console.log(response.timings.waiting);   // Time to first byte
console.log(response.timings.connecting); // Connection time

// Parsed JSON (if applicable)
const data = JSON.parse(response.body);
```

### Comprehensive Checks

```javascript
check(response, {
    // HTTP Status Validation
    'status is 200': (r) => r.status === 200,
    'status not 5xx': (r) => r.status < 500,
    'no timeout error': (r) => r.status !== 0,
    
    // Response Time Validation
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
    'each product has price': (r) => JSON.parse(r.body).data.every(p => p.price > 0),
    
    // Security Checks
    'no SQL errors exposed': (r) => !r.body.toLowerCase().includes('sql'),
    'no stack traces leaked': (r) => !r.body.includes('Error:'),
});
```

### Complete API Test Example

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
    stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 40 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<800'],
        'http_req_failed': ['rate<0.1'],
        'errors': ['rate<0.05'],
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    const sessionId = `session_${__VU}_${Date.now()}`;

    // Group 1: Get Products
    group('API - Get Products', function () {
        const response = http.get(`${BASE_URL}/api/products`, {
            tags: { name: 'GetProducts', method: 'GET' },
        });
        
        const success = check(response, {
            'products loaded': (r) => r.status === 200,
            'valid JSON': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            },
        });
        
        if (success) {
            successfulRequests.add(1);
        } else {
            failedRequests.add(1);
            errorRate.add(1);
        }
        
        apiResponseTime.add(response.timings.duration);
        sleep(1);
    });

    // Group 2: Add to Cart
    group('API - Add to Cart', function () {
        const productId = Math.floor(Math.random() * 10) + 1;
        const payload = JSON.stringify({
            sessionId: sessionId,
            productId: productId,
            quantity: 1,
        });

        const response = http.post(`${BASE_URL}/api/cart/add`, payload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'AddToCart', method: 'POST' },
        });
        
        check(response, {
            'product added': (r) => r.status === 200,
            'cart updated': (r) => JSON.parse(r.body).success === true,
        }) || errorRate.add(1);
        
        sleep(1);
    });

    // Group 3: Checkout
    group('API - Checkout', function () {
        const checkoutPayload = JSON.stringify({
            sessionId: sessionId,
            paymentMethod: 'credit_card',
        });

        const response = http.post(`${BASE_URL}/api/checkout`, checkoutPayload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'Checkout', method: 'POST' },
        });
        
        check(response, {
            'checkout successful': (r) => r.status === 200,
            'order created': (r) => JSON.parse(r.body).orderId !== undefined,
        }) || errorRate.add(1);
        
        sleep(2);
    });
}
```

---

## 10. Browser-Based Testing

### Overview

**Browser-based testing** uses a real Chromium browser to test frontend applications, simulating actual user interactions.

### When to Use Browser Testing

✅ Testing frontend performance
✅ Measuring page load times
✅ Validating JavaScript execution
✅ Testing Single Page Applications (SPAs)
✅ Capturing screenshots/videos
✅ Testing authenticated flows with cookies
✅ Real user behavior simulation

### Comparison: API vs Browser

| Aspect | API Testing | Browser Testing |
|--------|-------------|-----------------|
| **Execution** | Synchronous | Async/await |
| **Speed** | Fast (ms) | Slower (seconds) |
| **Max VUs** | 1000+ | 10-100 |
| **Resource** | Lightweight | Heavy |
| **Target** | Backend API | Frontend UI |
| **Module** | `k6/http` | `k6/browser` |

### Basic Browser Test Structure

```javascript
import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';

export const options = {
    scenarios: {
        browser: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 5 },
                { duration: '3m', target: 10 },
                { duration: '1m', target: 0 },
            ],
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
    thresholds: {
        'browser_errors': ['rate<0.05'],
        'page_load_time': ['p(95)<8000'],
    },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
    const page = browser.newPage();

    try {
        // Navigate to page
        const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        
        check(response, {
            'page loaded': (r) => r.status() === 200,
        });
        
        sleep(2);
        
    } finally {
        page.close();
    }
}
```

### Browser Navigation

```javascript
// Navigate to URL
await page.goto('http://localhost:3000');

// Wait for network idle
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

// Wait for DOM content loaded
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

// Reload page
await page.reload();

// Go back
await page.goBack();

// Go forward
await page.goForward();
```

### Element Interactions

```javascript
// Click button
await page.locator('button:has-text("Add to Cart")').click();

// Type text
await page.locator('input[name="email"]').type('user@example.com');

// Fill input (faster than type)
await page.locator('input[name="password"]').fill('password123');

// Select dropdown
await page.locator('select[name="country"]').selectOption('US');

// Check checkbox
await page.locator('input[type="checkbox"]').check();

// Hover
await page.locator('.menu-item').hover();
```

### Waiting Strategies

```javascript
// Wait for selector
await page.waitForSelector('.product-item', { timeout: 5000 });

// Wait for navigation
await page.waitForNavigation();

// Wait for load state
await page.waitForLoadState('networkidle');

// Custom timeout
await page.locator('#submit-btn').click({ timeout: 10000 });
```

### Element Selection

```javascript
// By CSS selector
page.locator('.product-item')

// By text content
page.locator('button:has-text("Add to Cart")')

// By ID
page.locator('#product-123')

// By attribute
page.locator('[data-testid="cart-icon"]')

// XPath
page.locator('//button[contains(text(), "Submit")]')

// Get element count
const count = await page.locator('.product-item').count();

// Get nth element
await page.locator('.product-item').nth(0).click();
```

### Extracting Data

```javascript
// Get text content
const title = await page.locator('h1').textContent();

// Get input value
const email = await page.locator('input[name="email"]').inputValue();

// Get attribute
const href = await page.locator('a').getAttribute('href');

// Evaluate JavaScript
const result = await page.evaluate(() => {
    return document.title;
});

// Scroll page
await page.evaluate(() => window.scrollBy(0, 300));
```

### Screenshots

```javascript
// Take screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full page screenshot
await page.screenshot({ 
    path: 'fullpage.png',
    fullPage: true 
});

// Element screenshot
await page.locator('.product-card').screenshot({ 
    path: 'product.png' 
});
```

### Complete Browser Test Example

```javascript
import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');

export const options = {
    scenarios: {
        browser: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 10 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 0 },
            ],
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
    thresholds: {
        'browser_errors': ['rate<0.05'],
        'page_load_time': ['p(95)<8000', 'p(99)<12000'],
        'group_duration{group:::visit product page}': ['p(95)<8000'],
        'group_duration{group:::add to cart}': ['p(95)<5000'],
        'group_duration{group:::checkout}': ['p(95)<8000'],
    },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
  const page = browser.newPage();

  try {
    // Group 1: Visit product page
    await group('visit product page', async () => {
      const startTime = Date.now();
      
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      pageLoadTime.add(loadTime);
      
      const success = check(response, {
        'page loaded successfully': (r) => r.status() === 200,
        'page load time acceptable': () => loadTime < 8000,
      });
      
      if (success) {
        successfulNavigations.add(1);
      } else {
        failedNavigations.add(1);
        errorRate.add(1);
      }
      
      // Simulate user scrolling
      await page.evaluate(() => window.scrollBy(0, 300));
      sleep(1);
      await page.evaluate(() => window.scrollBy(0, 300));
      
      sleep(2);
    });

    // Group 2: Add to cart
    await group('add to cart', async () => {
      await page.waitForSelector('.product-item', { timeout: 5000 });
      
      // Randomly add products
      const addButtons = page.locator('button:has-text("Add to Cart")');
      const buttonCount = await addButtons.count();
      const itemsToAdd = Math.min(Math.floor(Math.random() * 3) + 1, buttonCount);
      
      for (let i = 0; i < itemsToAdd; i++) {
        await addButtons.nth(i).click();
        sleep(0.5);
      }
      
      // Verify cart updated
      await page.waitForSelector('.cart-count', { timeout: 3000 });
      const cartCount = await page.locator('.cart-count').textContent();
      
      check(cartCount, {
        'cart updated correctly': (count) => parseInt(count) >= itemsToAdd,
      }) || errorRate.add(1);
      
      sleep(2);
    });

    // Group 3: View cart
    await group('view cart', async () => {
      await page.locator('a:has-text("Cart")').click();
      
      await page.waitForSelector('.cart-items', { timeout: 3000 });
      
      const cartItems = await page.locator('.cart-item').count();
      check(cartItems, {
        'cart displays items': (count) => count > 0,
      }) || errorRate.add(1);
      
      // Review cart items
      await page.evaluate(() => window.scrollBy(0, 200));
      
      sleep(3);
    });

    // Group 4: Checkout
    await group('checkout', async () => {
      await page.locator('button:has-text("Checkout")').click();
      
      await page.waitForSelector('#checkout-form', { timeout: 5000 });
      
      // Fill form with realistic delays
      await page.fill('#name', `User${__VU}`);
      sleep(1);
      
      await page.fill('#email', `user${__VU}@test.com`);
      sleep(0.5);
      
      await page.fill('#address', `${__VU} Main Street, City`);
      sleep(0.5);
      
      // Verify form completion
      const nameValue = await page.locator('#name').inputValue();
      check(nameValue, {
        'checkout form completed': (val) => val.length > 0,
      }) || errorRate.add(1);
      
      sleep(2);
    });
    
  } catch (error) {
    console.error(`VU ${__VU} Browser error:`, error.message);
    errorRate.add(1);
    failedNavigations.add(1);
  } finally {
    page.close();
  }

  sleep(3);
}
```

### Browser Test Best Practices

✅ **Always close pages**: Use try/finally blocks
✅ **Limit VUs**: Browser tests are resource-intensive (5-20 VUs)
✅ **Use appropriate waits**: `waitForSelector`, `waitForNavigation`
✅ **Realistic think time**: Add `sleep()` between actions
✅ **Handle asynchronous operations**: Use `async/await`
✅ **Take screenshots on failures**: For debugging

---

## 11. Metrics & Observability

### Understanding K6 Metrics

Metrics are the foundation of performance testing. They provide quantitative data about how your system performs.

### Built-in HTTP Metrics

K6 automatically collects these for every HTTP request:

| Metric | Description | Use Case |
|--------|-------------|----------|
| `http_req_duration` | Total request time | Overall response time |
| `http_req_waiting` | Time to first byte (TTFB) | Backend processing time |
| `http_req_connecting` | TCP connection time | Network latency |
| `http_req_tls_handshaking` | TLS negotiation time | HTTPS overhead |
| `http_req_sending` | Time sending data | Upload performance |
| `http_req_receiving` | Time receiving data | Download performance |
| `http_req_blocked` | Time waiting for connection | Connection pool issues |
| `http_req_failed` | Failed requests rate | Reliability |
| `http_reqs` | Total HTTP requests | Throughput |

### Request Timing Breakdown

```
Total Request Duration (http_req_duration)
├─ Blocked (http_req_blocked)        [Wait for free connection]
├─ Connecting (http_req_connecting)  [TCP handshake]
├─ TLS (http_req_tls_handshaking)   [HTTPS negotiation]
├─ Sending (http_req_sending)        [Upload request]
├─ Waiting (http_req_waiting)        [Backend processing]
└─ Receiving (http_req_receiving)    [Download response]
```

### Custom Metrics

Create metrics specific to your business logic:

#### Rate (Success/Failure Tracking)
```javascript
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const successfulLogins = new Rate('successful_logins');

export default function () {
    const response = http.get('https://api.example.com');
    
    // Track errors
    if (response.status !== 200) {
        errorRate.add(1);  // Add failure
    } else {
        errorRate.add(0);  // Add success
    }
}
// Result: errors............: 5.00% (5 failed out of 100)
```

#### Trend (Response Time Tracking)
```javascript
import { Trend } from 'k6/metrics';

const apiResponseTime = new Trend('api_response_time');
const dbQueryTime = new Trend('db_query_time');

export default function () {
    const response = http.get('https://api.example.com');
    apiResponseTime.add(response.timings.duration);
}
// Result: api_response_time..: avg=234ms min=120ms max=450ms p(95)=380ms
```

#### Counter (Event Counting)
```javascript
import { Counter } from 'k6/metrics';

const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const cartItemsAdded = new Counter('cart_items_added');

export default function () {
    const response = http.post('/api/cart/add', payload);
    
    if (response.status === 200) {
        successfulRequests.add(1);
        cartItemsAdded.add(JSON.parse(response.body).quantity);
    } else {
        failedRequests.add(1);
    }
}
// Result: successful_requests: 450
//         cart_items_added...: 650
```

#### Gauge (Point-in-time Values)
```javascript
import { Gauge } from 'k6/metrics';

const cartSize = new Gauge('cart_size');

export default function () {
    const response = http.get('/api/cart');
    const items = JSON.parse(response.body).items.length;
    cartSize.add(items);
}
// Result: cart_size..........: min=0 max=12 latest=5
```

### Tagging for Granular Analysis

Tags add context to individual requests:

```javascript
export default function () {
    // Tag individual requests
    http.get(`${BASE_URL}/api/products`, {
        tags: {
            name: 'GetProducts',
            method: 'GET',
            endpoint: '/api/products',
            region: 'us-east',
        },
    });
    
    http.post(`${BASE_URL}/api/cart`, payload, {
        tags: {
            name: 'AddToCart',
            method: 'POST',
            endpoint: '/api/cart',
        },
    });
}
```

**Benefits:**
- Filter metrics by tag in results
- Apply thresholds to specific endpoints
- Analyze performance by endpoint/region/method

### Analyzing Results

**Console Output:**
```
     ✓ products loaded
     ✓ cart updated

     checks.........................: 95.00% ✓ 190      ✗ 10
     data_received..................: 1.2 MB  20 kB/s
     data_sent......................: 156 kB  2.6 kB/s
     http_req_duration..............: avg=234ms min=120ms max=980ms p(95)=450ms
     http_req_failed................: 5.00%  ✓ 10       ✗ 190
     http_reqs......................: 200     3.33/s
     iterations.....................: 100     1.67/s
     errors.........................: 5.00%  ✓ 10       ✗ 190
```

**Key Observations:**
- **95% check pass rate**: 5% validation failures
- **avg=234ms**: Average response time
- **p(95)=450ms**: 95th percentile (5% slower)
- **http_req_failed=5%**: 5% HTTP errors
- **3.33 req/s**: Throughput

---

## 12. Reporting

### Overview

K6 provides multiple ways to generate and export test results:
- Console output (default)
- JSON summary
- HTML reports (custom)
- Cloud reporting
- Third-party integrations (Grafana, InfluxDB)

### Default Console Output

```bash
k6 run test.js

# Output:
     ✓ status is 200
     ✓ response time < 500ms

     checks.........................: 95.00% ✓ 190      ✗ 10
     data_received..................: 1.2 MB  20 kB/s
     data_sent......................: 156 kB  2.6 kB/s
     http_req_duration..............: avg=234ms p(95)=450ms
     http_req_failed................: 5.00%  ✓ 10       ✗ 190
     http_reqs......................: 200     3.33/s
     iterations.....................: 100     1.67/s
```

### JSON Report

```bash
k6 run test.js --out json=report.json
```

### Custom HTML Report with handleSummary()

#### The handleSummary Function

**`handleSummary(data)`** is a K6 lifecycle function that runs after test completes.

```javascript
import { generateHTMLReport } from '../scripts/html-report-generator.js';

export function handleSummary(data) {
    return {
        './reports/load-test-report.html': generateHTMLReport(data),
        './reports/load-test-report.json': JSON.stringify(data, null, 2),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}
```

#### Report Generation Flow

```
Test Execution
     ↓
Collect Metrics, Checks, Thresholds
     ↓
handleSummary(data) Called
     ↓
generateHTMLReport(data)
     ↓
HTML Report Written to File
```

#### HTML Report Generator

**Location:** `scripts/html-report-generator.js`

```javascript
export function generateHTMLReport(data, reportPath = './report.html') {
    const testRunDate = new Date(data.state.testRunDurationMs).toISOString();
    const metrics = data.metrics;
    const checks = {};
    const thresholds = {};

    // Extract checks
    if (metrics.checks) {
        const checkPasses = metrics.checks.values.passes || 0;
        const checkFails = metrics.checks.values.fails || 0;
        checks.passes = checkPasses;
        checks.fails = checkFails;
        checks.total = checkPasses + checkFails;
        checks.passRate = ((checkPasses / checks.total) * 100).toFixed(2);
    }

    // Extract thresholds
    for (const [metricName, metricData] of Object.entries(metrics)) {
        if (metricData.thresholds) {
            thresholds[metricName] = [];
            for (const [thresholdName, thresholdData] of Object.entries(metricData.thresholds)) {
                thresholds[metricName].push({
                    threshold: thresholdName,
                    passed: thresholdData.ok,
                });
            }
        }
    }

    // Generate HTML string
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>K6 Load Test Report</title>
        <style>
            /* CSS styles */
        </style>
    </head>
    <body>
        <div class="container">
            <h1>K6 Load Test Report</h1>
            
            <!-- Metrics Section -->
            <section class="metrics">
                <h2>Metrics</h2>
                ${generateMetricsTable(metrics)}
            </section>
            
            <!-- Checks Section -->
            <section class="checks">
                <h2>Checks</h2>
                ${generateChecksTable(checks)}
            </section>
            
            <!-- Thresholds Section -->
            <section class="thresholds">
                <h2>Thresholds</h2>
                ${generateThresholdsTable(thresholds)}
            </section>
        </div>
    </body>
    </html>
    `;

    return {
        [reportPath]: html,
    };
}
```

### Report Sections

#### 1. Test Overview
- Test run date/time
- Test duration
- Virtual users count
- Iterations completed

#### 2. Metrics Summary
- HTTP request duration (avg, min, max, p90, p95, p99)
- HTTP request rate
- Data sent/received
- Custom metrics

#### 3. Checks Results
- Total checks
- Passed checks
- Failed checks
- Pass rate percentage

#### 4. Thresholds Status
- Threshold name
- Condition
- Status (PASS/FAIL)

### Example handleSummary Implementation

```javascript
import { generateHTMLReport } from '../scripts/html-report-generator.js';

// Load configuration
const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/average-load.config.json'));
const config = { ...commonConfig, ...testConfig };

export function handleSummary(data) {
    return generateHTMLReport(data, config.reportPath);
}
```

**Note:** The `generateHTMLReport` function in `scripts/html-report-generator.js` returns an object with:
- `stdout`: JSON summary output
- `[reportPath]`: HTML report content

### Running Test with Reports

```bash
# Run test (reports generated automatically via handleSummary)
k6 run k6/load.test.js

# Output:
# ✓ Generating reports...
# ✓ HTML report: ./reports/load/load-test-report.html
# ✓ JSON report: ./reports/load/load-test-report.json
```

### Third-Party Integrations

#### InfluxDB + Grafana

```bash
k6 run --out influxdb=http://localhost:8086/k6 test.js
```

#### K6 Cloud

```bash
k6 login cloud
k6 cloud test.js
```

---

## 13. CI/CD Pipeline Integration

### Overview

Integrating K6 tests into CI/CD pipelines ensures performance testing happens automatically on every code change.

### GitHub Actions Workflow

**File:** `.github/workflows/average-load-test.yml`

```yaml
name: Average Load Test

on:
  push:
    branches:
      - average-load-test
  workflow_dispatch:
  schedule:
    - cron: '15 18 * * 0' # Run weekly on Sunday at 12 AM NPT (GMT+5:45)

jobs:
  average-load-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          node sample-app/server.js &
          sleep 5
          curl http://localhost:3000/api/health

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 average load test
        run: k6 run k6/average-load.test.js
        continue-on-error: true

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: average-load-test-html-report
          path: reports/average-load/average-load-test-report.html

      - name: Generate summary
        if: always()
        run: |
          echo "## 📊 Average Load Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Download the HTML report artifact to view detailed results." >> $GITHUB_STEP_SUMMARY
          echo "This test simulates normal expected traffic patterns." >> $GITHUB_STEP_SUMMARY
```

### Docker-Based Workflow

**File:** `.github/workflows/load-test-docker.yml`

```yaml
name: K6 Load Test (Docker)

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  load-test-docker:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Build and start app
        run: |
          docker-compose -f docker-compose.test.yml up -d app
          sleep 5
      
      - name: Run K6 test in Docker
        run: |
          docker-compose -f docker-compose.test.yml run --rm k6 \
            run /scripts/k6/load.test.js
      
      - name: Stop containers
        if: always()
        run: docker-compose -f docker-compose.test.yml down
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-report-docker
          path: reports/load/
```

### Trigger Mechanisms

#### 1. Push to Branch
```yaml
on:
  push:
    branches: [main, develop]
```

#### 2. Pull Request
```yaml
on:
  pull_request:
    branches: [main]
```

#### 3. Scheduled Runs
```yaml
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
    - cron: '0 0 * * *'   # Daily at midnight
```

#### 4. Manual Trigger
```yaml
on:
  workflow_dispatch:
    inputs:
      test_type:
        description: 'Test type to run'
        required: true
        default: 'load'
        type: choice
        options:
          - smoke
          - load
          - stress
          - spike
```

### Best Practices for CI/CD

✅ **Run smoke tests on every PR**: Quick validation
✅ **Schedule comprehensive tests**: Weekly stress/soak tests
✅ **Store artifacts**: Always upload HTML reports
✅ **Fail pipeline on threshold violations**: Enforce SLAs
✅ **Use Docker for consistency**: Isolated environments
✅ **Comment results on PRs**: Immediate feedback
✅ **Monitor trends**: Track performance over time

### Example GitLab CI

```yaml
stages:
  - test
  - report

k6_load_test:
  stage: test
  image: loadimpact/k6:latest
  before_script:
    - apt-get update && apt-get install -y nodejs npm
    - npm install
    - cd sample-app && node server.js &
    - sleep 5
  script:
    - k6 run k6/load.test.js
  artifacts:
    paths:
      - reports/
    expire_in: 1 week
    when: always
  only:
    - merge_requests
    - main
```

### Example Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('Start App') {
            steps {
                sh 'cd sample-app && node server.js &'
                sh 'sleep 5'
            }
        }
        
        stage('Run K6 Test') {
            steps {
                sh 'k6 run k6/load.test.js'
            }
        }
        
        stage('Publish Reports') {
            steps {
                publishHTML([
                    reportDir: 'reports/load',
                    reportFiles: 'load-test-report.html',
                    reportName: 'K6 Load Test Report'
                ])
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        }
    }
}
```

---

## 14. Best Practices

### Test Design

✅ **Start small**: Begin with smoke tests, gradually increase load
✅ **Use realistic data**: Match production traffic patterns
✅ **Add think time**: Use `sleep()` to simulate user behavior
✅ **Group related requests**: Organize tests with `group()`
✅ **Tag requests**: Add metadata for filtering metrics
✅ **Parameterize tests**: Use configuration files
✅ **Handle errors gracefully**: Check responses before parsing

### Performance

✅ **Reuse connections**: HTTP keep-alive is enabled by default
✅ **Limit browser VUs**: Browser tests are resource-intensive (5-20 VUs)
✅ **Use API tests for high load**: 1000+ VUs require API-based tests
✅ **Minimize data parsing**: Avoid unnecessary JSON parsing in hot paths
✅ **Use custom metrics wisely**: Too many metrics impact performance

### Metrics & Thresholds

✅ **Define clear SLAs**: Set realistic thresholds based on requirements
✅ **Use percentiles**: p(95), p(99) are more meaningful than averages
✅ **Monitor error rates**: Always include `http_req_failed` threshold
✅ **Track custom business metrics**: Conversions, signups, etc.
✅ **Use group thresholds**: Different SLAs for different workflows

### CI/CD Integration

✅ **Run tests on every PR**: Catch regressions early
✅ **Schedule comprehensive tests**: Weekly stress/soak tests
✅ **Fail builds on threshold violations**: Enforce performance standards
✅ **Archive reports**: Keep historical data for trend analysis
✅ **Use Docker for consistency**: Isolated test environments
✅ **Notify on failures**: Slack/email notifications

### Reporting

✅ **Generate HTML reports**: Easy to share and visualize
✅ **Store JSON data**: For programmatic analysis
✅ **Track trends over time**: Compare results across runs
✅ **Share results with stakeholders**: Clear, actionable insights

### Debugging

✅ **Start with low VUs**: Debug with 1-2 VUs first
✅ **Enable verbose logging**: `k6 run --http-debug test.js`
✅ **Add console.log**: Debug data extraction and logic
✅ **Take screenshots**: Browser tests - capture failures
✅ **Check response bodies**: Validate API responses thoroughly

---

## Summary

### K6 at a Glance

| Aspect | Description |
|--------|-------------|
| **Language** | JavaScript (ES6) |
| **Test Types** | Smoke, Load, Stress, Spike, Soak, Breakpoint |
| **Protocols** | HTTP, WebSockets, gRPC, Browser |
| **Metrics** | Built-in + Custom metrics |
| **Thresholds** | Pass/fail criteria for SLAs |
| **Reporting** | Console, JSON, HTML, Cloud |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins |

### Quick Start Checklist

- [ ] Install K6
- [ ] Write first smoke test (1 VU, 1 minute)
- [ ] Add checks for validation
- [ ] Define thresholds for SLAs
- [ ] Generate HTML reports
- [ ] Integrate with CI/CD
- [ ] Scale to production-like load

### Resources

- **Official Documentation**: https://k6.io/docs/
- **K6 GitHub**: https://github.com/grafana/k6
- **Community Forum**: https://community.k6.io/
- **Examples**: https://k6.io/docs/examples/

---

**End of Presentation**
