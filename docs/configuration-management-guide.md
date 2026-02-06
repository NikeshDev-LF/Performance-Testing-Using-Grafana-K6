# K6 Configuration Management - Complete Guide

## Table of Contents
- [Overview](#overview)
- [Configuration Architecture](#configuration-architecture)
- [Fixture Folder Structure](#fixture-folder-structure)
- [Common Configuration](#common-configuration)
- [Test-Specific Configurations](#test-specific-configurations)
- [Loading Configurations in Test Files](#loading-configurations-in-test-files)
- [Configuration Merging Process](#configuration-merging-process)
- [Configuration Options Explained](#configuration-options-explained)
- [Using Configuration Values](#using-configuration-values)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The K6 test suite uses a **centralized JSON configuration approach** to manage test parameters. This allows you to:

- ✅ Separate configuration from test logic
- 🔄 Reuse common settings across multiple tests
- 📝 Easily modify test parameters without touching code
- 🎯 Maintain different configurations for different test types
- 🌍 Support multiple environments (local, staging, production)

---

## Configuration Architecture

### Design Pattern

```
┌─────────────────────────────────────────────────┐
│  Common Config (common.config.json)             │
│  - Shared across all tests                      │
│  - Environment settings                          │
│  - Base URL                                      │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Test-Specific Configs                           │
│  - smoke.config.json                             │
│  - load.config.json                              │
│  - average-load.config.json                      │
│  - stress.config.json                            │
│  - spike.config.json                             │
│  - soak.config.json                              │
│  - breakpoint.config.json                        │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Merge Process                                   │
│  config = { ...common, ...testSpecific }         │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Test File (e.g., average-load.test.js)         │
│  - Uses merged config                            │
│  - Applies to K6 options                         │
│  - References throughout test logic              │
└─────────────────────────────────────────────────┘
```

---

## Fixture Folder Structure

```
fixture/
├── common.config.json          # Shared across all tests
├── smoke.config.json           # Smoke test (basic functionality)
├── load.config.json            # Load test (expected traffic)
├── average-load.config.json    # Average load test
├── stress.config.json          # Stress test (beyond capacity)
├── spike.config.json           # Spike test (sudden traffic surge)
├── soak.config.json            # Soak test (sustained load)
└── breakpoint.config.json      # Breakpoint test (find limits)
```

### Purpose of Each Configuration

| Config File | Test Type | Purpose | Duration | Load Pattern |
|-------------|-----------|---------|----------|--------------|
| `smoke.config.json` | Smoke Test | Verify basic functionality | 1 minute | 1 VU (minimal) |
| `load.config.json` | Load Test | Test expected traffic | 2.5 minutes | 5-10 VUs (gradual) |
| `average-load.config.json` | Average Load | Sustained average traffic | 16 minutes | 20-40 VUs (stepped) |
| `stress.config.json` | Stress Test | Push beyond capacity | 10 minutes | 20-200 VUs (progressive) |
| `spike.config.json` | Spike Test | Sudden traffic surge | 3 minutes | 10-200 VUs (rapid spike) |
| `soak.config.json` | Soak Test | Long-term stability | 4+ hours | 30 VUs (constant) |
| `breakpoint.config.json` | Breakpoint | Find system limits | 27 minutes | 20-300 VUs (incremental) |

---

## Common Configuration

### File: `fixture/common.config.json`

```json
{
  "environment": "local",
  "baseUrl": "http://localhost:3000"
}
```

### Properties Explained

| Property | Type | Purpose | Example Values |
|----------|------|---------|----------------|
| `environment` | String | Identifies target environment | `"local"`, `"staging"`, `"production"` |
| `baseUrl` | String | API base URL for all requests | `"http://localhost:3000"`, `"https://api.example.com"` |

### Why Common Config?

**Without common config:**
```javascript
// ❌ Duplicated in every test file
const BASE_URL = "http://localhost:3000";
```

**With common config:**
```javascript
// ✅ Single source of truth
const config = { ...commonConfig, ...testConfig };
const BASE_URL = config.baseUrl;
```

**Benefits:**
- Change URL once, affects all tests
- Easy environment switching
- No code duplication

---

## Test-Specific Configurations

### 1. Smoke Test Configuration

**File:** `fixture/smoke.config.json`

```json
{
  "testName": "Smoke Test",
  "testType": "smoke_test",
  "vus": 1,
  "duration": "1m",
  "thresholds": {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.01"],
    "errors": ["rate<0.01"],
    "group_duration{group:::visit product listing page}": ["p(95)<500"],
    "group_duration{group:::add products to cart}": ["p(95)<400"],
    "group_duration{group:::view cart}": ["p(95)<300"],
    "group_duration{group:::checkout process}": ["p(95)<1000"]
  },
  "thresholdLimits": {
    "productsResponseTime": 500,
    "addToCartResponseTime": 400,
    "checkoutResponseTime": 1000
  },
  "sleepTimes": {
    "afterAddToCart": 1,
    "afterViewCart": 1,
    "afterIteration": 1
  },
  "reportPath": "reports/smoke/smoke-test-report.html",
  "jsonReportPath": "reports/smoke/smoke-test-report.json"
}
```

**Use Case:** Quick sanity check before running heavier tests

---

### 2. Load Test Configuration

**File:** `fixture/load.config.json`

```json
{
  "testName": "Load Test",
  "testType": "load_test",
  "stages": [
    { "duration": "30s", "target": 5 },
    { "duration": "30s", "target": 5 },
    { "duration": "30s", "target": 10 },
    { "duration": "30s", "target": 10 },
    { "duration": "30s", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<500", "p(99)<1000"],
    "http_req_failed": ["rate<0.1"],
    "errors": ["rate<0.1"],
    "api_response_time": ["p(95)<400"]
  },
  "thresholdLimits": {
    "productsResponseTime": 500,
    "addToCartResponseTime": 400,
    "checkoutResponseTime": 1000
  },
  "sleepTimes": {
    "afterAddToCart": 1,
    "afterViewCart": 2,
    "afterIteration": 1
  },
  "reportPath": "reports/load/load-test-report.html",
  "jsonReportPath": "reports/load/load-test-report.json"
}
```

**Load Pattern:**
```
VUs
 10 │    ████████
    │████        
  5 │            ████████
    │                    ████
  0 └────────────────────────────► Time
     30s  30s  30s  30s  30s
```

**Use Case:** Validate performance under expected production load

---

### 3. Average Load Test Configuration

**File:** `fixture/average-load.config.json`

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

**Load Pattern:**
```
VUs
 40 │          ██████████████
    │      ████              ████
 20 │  ████                      
    │                            ████
  0 └────────────────────────────────► Time
     2m   5m   2m   5m   2m
```

**Use Case:** Test sustained average production traffic

---

### 4. Stress Test Configuration

**File:** `fixture/stress.config.json`

```json
{
  "testName": "Stress Test",
  "testType": "stress_test",
  "stages": [
    { "duration": "1m", "target": 20 },
    { "duration": "2m", "target": 50 },
    { "duration": "2m", "target": 100 },
    { "duration": "2m", "target": 150 },
    { "duration": "2m", "target": 200 },
    { "duration": "1m", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<1000", "p(99)<2000"],
    "http_req_failed": ["rate<0.2"],
    "errors": ["rate<0.2"]
  },
  "thresholdLimits": {
    "productsResponseTime": 2000,
    "checkoutResponseTime": 2000
  },
  "sleepTimes": {
    "afterIteration": 0.5
  },
  "reportPath": "reports/stress/stress-test-report.html",
  "jsonReportPath": "reports/stress/stress-test-report.json"
}
```

**Load Pattern:**
```
VUs
200 │                    ████
150 │                ████    
100 │            ████        
 50 │        ████            
 20 │    ████                
  0 └────────────────────────► Time
     1m  2m  2m  2m  2m  1m
```

**Use Case:** Push system beyond normal capacity to find breaking point

---

### 5. Spike Test Configuration

**File:** `fixture/spike.config.json`

```json
{
  "testName": "Spike Test",
  "testType": "spike_test",
  "stages": [
    { "duration": "30s", "target": 10 },
    { "duration": "10s", "target": 200 },
    { "duration": "1m", "target": 200 },
    { "duration": "10s", "target": 10 },
    { "duration": "1m", "target": 10 },
    { "duration": "10s", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<2000"],
    "http_req_failed": ["rate<0.3"],
    "errors": ["rate<0.3"]
  },
  "thresholdLimits": {
    "productsResponseTime": 2000,
    "checkoutResponseTime": 3000
  },
  "sleepTimes": {
    "afterIteration": 0.5
  },
  "reportPath": "reports/spike/spike-test-report.html",
  "jsonReportPath": "reports/spike/spike-test-report.json"
}
```

**Load Pattern:**
```
VUs
200 │     ██████████
    │    █          █
    │   █            █
 10 │███              ███████
  0 └──────────────────────────► Time
     30s 10s 1m 10s 1m 10s
```

**Use Case:** Test system behavior during sudden traffic spikes (e.g., flash sales)

---

### 6. Soak Test Configuration

**File:** `fixture/soak.config.json`

```json
{
  "testName": "Soak Test",
  "testType": "soak_test",
  "stages": [
    { "duration": "5m", "target": 30 },
    { "duration": "4h", "target": 30 },
    { "duration": "5m", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<600", "p(99)<1200"],
    "http_req_failed": ["rate<0.05"],
    "errors": ["rate<0.05"],
    "api_response_time": ["p(95)<500"]
  },
  "thresholdLimits": {
    "productsResponseTime": 600,
    "addToCartResponseTime": 500,
    "viewCartResponseTime": 400,
    "checkoutResponseTime": 1200
  },
  "sleepTimes": {
    "afterAddToCart": "random",
    "afterIteration": "random"
  },
  "reportPath": "reports/soak/soak-test-report.html",
  "jsonReportPath": "reports/soak/soak-test-report.json"
}
```

**Load Pattern:**
```
VUs
 30 │  ████████████████████████████
    │██                            ██
  0 └──────────────────────────────► Time
     5m        4 hours          5m
```

**Use Case:** Detect memory leaks, degradation over time, resource exhaustion

---

### 7. Breakpoint Test Configuration

**File:** `fixture/breakpoint.config.json`

```json
{
  "testName": "Breakpoint Test",
  "testType": "breakpoint_test",
  "stages": [
    { "duration": "2m", "target": 20 },
    { "duration": "2m", "target": 40 },
    { "duration": "2m", "target": 60 },
    { "duration": "2m", "target": 80 },
    { "duration": "2m", "target": 100 },
    { "duration": "2m", "target": 120 },
    { "duration": "2m", "target": 140 },
    { "duration": "2m", "target": 160 },
    { "duration": "2m", "target": 180 },
    { "duration": "2m", "target": 200 },
    { "duration": "2m", "target": 250 },
    { "duration": "2m", "target": 300 },
    { "duration": "1m", "target": 0 }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<5000"],
    "http_req_failed": ["rate<0.5"]
  },
  "thresholdLimits": {
    "productsResponseTime": 5000
  },
  "sleepTimes": {
    "afterIteration": 0.5
  },
  "reportPath": "reports/breakpoint/breakpoint-test-report.html",
  "jsonReportPath": "reports/breakpoint/breakpoint-test-report.json"
}
```

**Load Pattern:**
```
VUs
300 │                      ████
250 │                  ████    
200 │              ████        
150 │          ████            
100 │      ████                
 50 │  ████                    
  0 └──────────────────────────► Time
     2m 2m 2m 2m 2m 2m ... 1m
```

**Use Case:** Find exact point where system starts failing

---

## Loading Configurations in Test Files

### Step-by-Step Process

**1. Import `open` function** (built-in K6 function)

```javascript
// Already available in K6 - no import needed
// open() reads files at initialization time
```

**2. Load and Parse JSON Files**

```javascript
// Location: k6/average-load.test.js

const commonConfig = JSON.parse(open('../fixture/common.config.json'));
const testConfig = JSON.parse(open('../fixture/average-load.config.json'));
```

**`open()` function:**
- Reads file content as string
- Executes at **init stage** (before test runs)
- Relative paths from test file location
- Returns file content as string

**`JSON.parse()`:**
- Converts JSON string to JavaScript object
- Must be valid JSON or will throw error

**3. Merge Configurations**

```javascript
const config = { ...commonConfig, ...testConfig };
```

**Spread operator (`...`) behavior:**
```javascript
// If both have same property, testConfig wins
const commonConfig = { baseUrl: "http://localhost:3000", timeout: 30 };
const testConfig = { testName: "Load Test", timeout: 60 };

const config = { ...commonConfig, ...testConfig };
// Result: { baseUrl: "http://localhost:3000", timeout: 60, testName: "Load Test" }
//         testConfig.timeout (60) overwrites commonConfig.timeout (30)
```

---

## Configuration Merging Process

### Merge Strategy

```javascript
const config = { ...commonConfig, ...testConfig };
```

### Visualization

```
┌─────────────────────────┐
│  Common Config          │
├─────────────────────────┤
│  environment: "local"   │
│  baseUrl: "http://..."  │
└───────────┬─────────────┘
            │
            ▼  Spread (...)
┌─────────────────────────┐
│  Merged Config          │
├─────────────────────────┤
│  environment: "local"   │  ← From common
│  baseUrl: "http://..."  │  ← From common
└───────────┬─────────────┘
            │
            ▼  Spread (...)
┌─────────────────────────┐
│  Test Config            │
├─────────────────────────┤
│  testName: "Load Test"  │
│  stages: [...]          │
│  thresholds: {...}      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Final Merged Config    │
├─────────────────────────┤
│  environment: "local"   │  ← From common
│  baseUrl: "http://..."  │  ← From common
│  testName: "Load Test"  │  ← From test
│  stages: [...]          │  ← From test
│  thresholds: {...}      │  ← From test
└─────────────────────────┘
```

### Merge Rules

1. **Properties in both configs:** Test-specific config **overwrites** common config
2. **Properties only in common:** Preserved in merged config
3. **Properties only in test:** Added to merged config

### Example with Conflict

```javascript
// common.config.json
{
  "environment": "local",
  "timeout": 30
}

// load.config.json
{
  "testName": "Load Test",
  "timeout": 60
}

// Merged result
const config = { ...common, ...test };
// {
//   "environment": "local",    ← from common
//   "timeout": 60,             ← from test (overwrites common)
//   "testName": "Load Test"    ← from test
// }
```

---

## Configuration Options Explained

### Test Metadata

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `testName` | String | Descriptive test name | `"Average Load Test"` |
| `testType` | String | Test type identifier | `"average_load_test"` |

**Usage:**
```javascript
export const options = {
    tags: {
        test_type: config.testType,  // Used in K6 options
    },
};
```

---

### Load Configuration

#### Simple (Smoke Test)

```json
{
  "vus": 1,
  "duration": "1m"
}
```

**Properties:**
- `vus`: Number of virtual users
- `duration`: How long to run

**Applied to K6:**
```javascript
export const options = {
    vus: config.vus,
    duration: config.duration,
};
```

#### Stages (Load/Stress/Spike Tests)

```json
{
  "stages": [
    { "duration": "2m", "target": 20 },
    { "duration": "5m", "target": 20 },
    { "duration": "2m", "target": 40 }
  ]
}
```

**Stage Object:**
- `duration`: Duration of this stage
- `target`: Target number of VUs at end of stage

**Applied to K6:**
```javascript
export const options = {
    stages: config.stages,  // Array of stage objects
};
```

**Behavior:**
K6 gradually ramps VUs from current level to target over duration.

---

### Thresholds

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<500", "p(99)<1000"],
    "http_req_failed": ["rate<0.05"],
    "errors": ["rate<0.05"],
    "api_response_time": ["p(95)<400"],
    "group_duration{group:::view cart}": ["p(95)<300"]
  }
}
```

**Threshold Format:**
```
"metric_name": ["condition1", "condition2"]
```

**Common Patterns:**

| Pattern | Meaning | Example |
|---------|---------|---------|
| `p(95)<500` | 95th percentile under 500ms | `"http_req_duration": ["p(95)<500"]` |
| `rate<0.05` | Error rate under 5% | `"http_req_failed": ["rate<0.05"]` |
| `avg<300` | Average under 300ms | `"http_req_duration": ["avg<300"]` |
| `count>1000` | More than 1000 requests | `"http_reqs": ["count>1000"]` |

**Applied to K6:**
```javascript
export const options = {
    thresholds: config.thresholds,
};
```

---

### Threshold Limits (Custom Validation)

```json
{
  "thresholdLimits": {
    "productsResponseTime": 500,
    "addToCartResponseTime": 400,
    "viewCartResponseTime": 300,
    "checkoutResponseTime": 1000
  }
}
```

**Purpose:** Used in checks for per-request validation

**Usage in Test:**
```javascript
check(response, {
    'products response time OK': (r) => {
        return r.timings.duration < config.thresholdLimits.productsResponseTime;
    },
});
```

**Difference from `thresholds`:**
- `thresholds`: K6 aggregate metrics (test pass/fail)
- `thresholdLimits`: Individual request validation (checks)

---

### Sleep Times

```json
{
  "sleepTimes": {
    "afterAddToCart": 1,
    "afterViewCart": 2,
    "afterIteration": "random"
  }
}
```

**Purpose:** Simulate realistic user think time

**Values:**
- **Number**: Fixed seconds (e.g., `1` = 1 second)
- **"random"**: Random duration (handled in test code)

**Usage in Test:**
```javascript
// Fixed sleep
if (typeof config.sleepTimes.afterAddToCart === 'number') {
    sleep(config.sleepTimes.afterAddToCart);
}

// Random sleep
if (config.sleepTimes.afterAddToCart === 'random') {
    sleep(Math.random() * 2 + 1);  // 1-3 seconds
}
```

---

### Report Paths

```json
{
  "reportPath": "reports/average-load/average-load-test-report.html",
  "jsonReportPath": "reports/average-load/average-load-test-report.json"
}
```

**Purpose:** Define output file locations

**Usage in Test:**
```javascript
export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
```

---

## Using Configuration Values

### 1. In K6 Options

```javascript
export const options = {
    stages: config.stages,        // Load pattern
    thresholds: config.thresholds, // Pass/fail criteria
    tags: {
        test_type: config.testType,      // Metadata
        environment: config.environment,
    },
};
```

### 2. In Test Logic

```javascript
// Base URL
const BASE_URL = config.baseUrl;
http.get(`${BASE_URL}/api/products`);

// Threshold limits in checks
check(response, {
    'response time OK': (r) => {
        return r.timings.duration < config.thresholdLimits.productsResponseTime;
    },
});

// Sleep times
sleep(config.sleepTimes.afterAddToCart);
```

### 3. In Report Generation

```javascript
export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
```

---

## Best Practices

### 1. Keep Common Values in `common.config.json`

```json
// ✅ GOOD: Shared values in common config
{
  "environment": "local",
  "baseUrl": "http://localhost:3000",
  "defaultTimeout": 30000
}
```

```json
// ❌ BAD: Repeating in every test config
{
  "baseUrl": "http://localhost:3000",  // Duplicated
  "testName": "Load Test"
}
```

---

### 2. Use Meaningful Test Names

```json
// ✅ GOOD
{
  "testName": "Average Load Test - E-commerce Checkout",
  "testType": "average_load_test"
}

// ❌ BAD
{
  "testName": "Test1",
  "testType": "test"
}
```

---

### 3. Align Thresholds with Test Type

```json
// ✅ GOOD: Stricter thresholds for smoke test
{
  "testType": "smoke_test",
  "thresholds": {
    "http_req_failed": ["rate<0.01"]  // 1% error rate
  }
}

// ✅ GOOD: Relaxed thresholds for stress test
{
  "testType": "stress_test",
  "thresholds": {
    "http_req_failed": ["rate<0.2"]  // 20% error rate acceptable
  }
}
```

---

### 4. Document Configuration Changes

```bash
# Track config changes in git
git add fixture/average-load.config.json
git commit -m "Increase average load test duration to 20 minutes"
```

---

### 5. Validate JSON Syntax

```bash
# Use a JSON validator
cat fixture/load.config.json | jq .

# Or use VS Code JSON schema validation
```

---

### 6. Environment-Specific Common Configs

```
fixture/
├── common.config.json              # Default (local)
├── common.staging.config.json      # Staging environment
├── common.production.config.json   # Production environment
└── load.config.json
```

**Load based on environment variable:**
```javascript
const environment = __ENV.TEST_ENV || 'local';
const commonConfigFile = environment === 'production' 
    ? '../fixture/common.production.config.json'
    : '../fixture/common.config.json';

const commonConfig = JSON.parse(open(commonConfigFile));
```

**Run:**
```bash
k6 run -e TEST_ENV=production k6/load.test.js
```

---

### 7. Version Control Sensitive Data

```json
// common.config.json (committed to git)
{
  "environment": "local",
  "baseUrl": "${API_BASE_URL}"
}
```

```javascript
// In test file
let baseUrl = config.baseUrl;
if (baseUrl.includes('${')) {
    baseUrl = __ENV.API_BASE_URL || 'http://localhost:3000';
}
```

```bash
# Run with environment variable
k6 run -e API_BASE_URL=https://api.production.com k6/load.test.js
```

---

## Troubleshooting

### Problem: "Cannot read file"

**Error:**
```
ERRO[0000] Cannot read file: open ../fixture/load.config.json: no such file or directory
```

**Solution:**
```javascript
// Check relative path is correct
// If test is in: k6/load.test.js
// Config is in: fixture/load.config.json
// Path should be: ../fixture/load.config.json

const testConfig = JSON.parse(open('../fixture/load.config.json')); // ✅
```

---

### Problem: "Invalid JSON"

**Error:**
```
ERRO[0000] SyntaxError: JSON.parse: unexpected character at line 5
```

**Solution:**
```json
// ❌ BAD: Trailing comma
{
  "testName": "Load Test",
  "stages": [],
}

// ✅ GOOD: No trailing comma
{
  "testName": "Load Test",
  "stages": []
}
```

**Validate JSON:**
```bash
jq . fixture/load.config.json
# If valid, outputs formatted JSON
# If invalid, shows error
```

---

### Problem: Config values not applying

**Issue:** Thresholds defined but not enforced

**Solution:**
```javascript
// ❌ BAD: Not using config
export const options = {
    stages: [{ duration: "1m", target: 10 }],  // Hardcoded
};

// ✅ GOOD: Using config
export const options = {
    stages: config.stages,  // From configuration
};
```

---

### Problem: Config overwriting not working

**Issue:** Common config value not being overwritten

```javascript
// Incorrect order
const config = { ...testConfig, ...commonConfig };  // ❌ Common overwrites test

// Correct order
const config = { ...commonConfig, ...testConfig };  // ✅ Test overwrites common
```

**Rule:** Last object in spread wins

---

### Problem: Cannot access nested properties

**Error:**
```javascript
// config.thresholdLimits is undefined
const limit = config.thresholdLimits.productsResponseTime;
```

**Solution:**
```javascript
// Use optional chaining
const limit = config.thresholdLimits?.productsResponseTime || 500;

// Or check existence
if (config.thresholdLimits && config.thresholdLimits.productsResponseTime) {
    // Safe to use
}
```

---

## Summary

### Configuration Flow

```
1. Create JSON configs in fixture/
   ↓
2. Load configs in test file using open()
   ↓
3. Parse JSON strings using JSON.parse()
   ↓
4. Merge common and test-specific configs
   ↓
5. Use merged config throughout test
   ↓
6. Apply to K6 options, checks, reports
```

### Key Takeaways

1. ✅ **Separation of Concerns**: Config separate from test logic
2. ✅ **DRY Principle**: Common values in `common.config.json`
3. ✅ **Merge Strategy**: Test-specific overwrites common
4. ✅ **Type Safety**: Always validate JSON syntax
5. ✅ **Flexibility**: Easy to switch between test types
6. ✅ **Maintainability**: Single source of truth for configuration

---

## Configuration Comparison Table

| Test Type | Duration | Max VUs | Error Threshold | Use Case |
|-----------|----------|---------|-----------------|----------|
| **Smoke** | 1 min | 1 | <1% | Basic functionality check |
| **Load** | 2.5 min | 10 | <10% | Expected traffic simulation |
| **Average Load** | 16 min | 40 | <5% | Sustained average traffic |
| **Stress** | 10 min | 200 | <20% | Beyond capacity testing |
| **Spike** | 3 min | 200 | <30% | Sudden traffic surge |
| **Soak** | 4+ hours | 30 | <5% | Long-term stability |
| **Breakpoint** | 27 min | 300 | <50% | Find system limits |

---

## Next Steps

1. Review all configuration files in `fixture/`
2. Understand merge process in your test files
3. Customize configurations for your use case
4. Add environment-specific configurations
5. Implement configuration validation
6. Document your configuration strategy

**Related Files:**
- [fixture/common.config.json](../fixture/common.config.json)
- [fixture/average-load.config.json](../fixture/average-load.config.json)
- [k6/average-load.test.js](../k6/average-load.test.js)
