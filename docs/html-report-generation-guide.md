# K6 HTML Report Generation - Complete Guide

## Table of Contents
- [Overview](#overview)
- [The handleSummary Function](#the-handlesummary-function)
- [Report Generation Flow](#report-generation-flow)
- [Data Structure Explained](#data-structure-explained)
- [HTML Report Generator Script](#html-report-generator-script)
- [Report Sections Breakdown](#report-sections-breakdown)
- [Customizing Reports](#customizing-reports)
- [Troubleshooting](#troubleshooting)

---

## Overview

K6's report generation system allows you to transform raw test data into beautiful, readable HTML reports. This guide explains how the `handleSummary()` function and the HTML report generator work together to create comprehensive performance test reports.

### Key Components

1. **`handleSummary(data)`** - K6 lifecycle function that receives test results
2. **`html-report-generator.js`** - Custom script that transforms data into HTML
3. **K6 Summary Data** - Raw test metrics, checks, and thresholds

---

## The handleSummary Function

### What is `handleSummary()`?

`handleSummary()` is a **special K6 lifecycle function** that runs automatically after your test completes. K6 passes all collected metrics, checks, and threshold results to this function.

### Location in Test File

```javascript
// Location: k6/average-load.test.js (or any test file)

export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
```

### Function Signature

```javascript
export function handleSummary(data: Object): Object
```

**Parameters:**
- `data` - Complete test summary data from K6

**Returns:**
- Object mapping file paths to report content

---

## Report Generation Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────┐
│  1. Test Execution                                   │
│     - Run virtual users                              │
│     - Make HTTP requests                             │
│     - Collect metrics, checks, thresholds            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  2. handleSummary(data) Called                       │
│     - K6 automatically invokes after test            │
│     - Passes complete summary data                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  3. generateHTMLReport(data, reportPath)             │
│     - Custom function in html-report-generator.js    │
│     - Parses data structure                          │
│     - Extracts metrics, checks, thresholds           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  4. Generate HTML String                             │
│     - Build HTML with embedded CSS                   │
│     - Populate tables, charts, status badges         │
│     - Format metrics and percentiles                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  5. Write Report Files                               │
│     - HTML report → reports/average-load-report.html │
│     - JSON report → reports/average-load-report.json │
│     - stdout → Console output                        │
└─────────────────────────────────────────────────────┘
```

---

## Data Structure Explained

### The `data` Parameter

When K6 calls `handleSummary(data)`, the data object contains:

```javascript
{
  root_group: {
    name: "",
    path: "",
    checks: [...],      // All check results
    groups: [...]       // Nested groups
  },
  metrics: {
    // Built-in K6 metrics
    http_reqs: { ... },
    http_req_duration: { ... },
    http_req_failed: { ... },
    
    // Custom metrics
    errors: { ... },
    api_response_time: { ... },
    successful_requests: { ... },
    
    // Tagged metrics (per endpoint)
    "http_req_duration{name:GetProducts}": { ... },
    "http_reqs{name:AddToCart}": { ... },
    
    // Group metrics
    "group_duration{group:::visit product listing page}": { ... }
  },
  state: {
    isStdOutTTY: true,
    isStdErrTTY: true,
    testRunDurationMs: 965220.5
  }
}
```

### Metric Structure

Each metric in `data.metrics` follows this structure:

```javascript
"http_req_duration": {
  type: "trend",
  contains: "time",
  values: {
    avg: 182.76,
    min: 10.23,
    med: 175.45,
    max: 987.32,
    "p(90)": 350.12,
    "p(95)": 419.57,
    "p(99)": 756.89,
    count: 18768
  },
  thresholds: {
    "p(95)<500": {
      ok: true
    },
    "p(99)<1000": {
      ok: true
    }
  }
}
```

### Check Structure

Checks are nested in groups:

```javascript
root_group: {
  checks: [
    {
      name: "products loaded",
      passes: 3128,
      fails: 0
    },
    {
      name: "cart item has id",
      passes: 709,
      fails: 2419
    }
  ],
  groups: [
    {
      name: "visit product listing page",
      checks: [...],
      groups: [...]
    }
  ]
}
```

---

## HTML Report Generator Script

### File Location

```
scripts/html-report-generator.js
```

### Main Export Function

```javascript
export function generateHTMLReport(data, reportPath) {
    return {
        'stdout': JSON.stringify(data, null, 2),
        [reportPath]: generateCustomHTMLReport(data),
    };
}
```

**Parameters:**
- `data` - K6 summary data object
- `reportPath` - File path for HTML output (from config)

**Returns:**
```javascript
{
  'stdout': '{ ... }',                              // Console output
  'reports/average-load/report.html': '<html>...'   // HTML file
}
```

K6 interprets this return object:
- Keys = file paths or 'stdout'/'stderr'
- Values = content to write

---

### Core Processing Function

```javascript
function generateCustomHTMLReport(data) {
    const metrics = data.metrics;
    const testDuration = (data.state.testRunDurationMs / 1000).toFixed(2);
    
    // 1. Calculate overall status
    let overallStatus = 'PASSED';
    const failedThresholds = [];
    
    // 2. Extract checks
    const allChecks = collectChecks(data.root_group);
    
    // 3. Parse endpoint metrics
    const endpointMetrics = extractEndpointMetrics(metrics);
    
    // 4. Generate HTML
    return `<!DOCTYPE html>...`;
}
```

---

### Status Calculation

```javascript
// Determine if test passed or failed
Object.entries(metrics).forEach(([name, metric]) => {
    if (metric.thresholds) {
        Object.entries(metric.thresholds).forEach(([threshold, result]) => {
            if (!result.ok) {
                overallStatus = 'FAILED';
                failedThresholds.push({ 
                    metric: name, 
                    threshold, 
                    result 
                });
            }
        });
    }
});
```

**Logic:**
- Loop through all metrics
- Check if they have thresholds defined
- If any threshold fails (`result.ok === false`), mark test as FAILED
- Collect all failed thresholds for display

---

### Collecting Checks Recursively

```javascript
function collectChecks(group) {
    let allChecks = [];
    
    // Add checks from current group
    if (group.checks && group.checks.length > 0) {
        allChecks = allChecks.concat(group.checks);
    }
    
    // Recursively collect from child groups
    if (group.groups && group.groups.length > 0) {
        group.groups.forEach(childGroup => {
            allChecks = allChecks.concat(collectChecks(childGroup));
        });
    }
    
    return allChecks;
}
```

**Why Recursive?**
K6 organizes checks in nested groups:
```
root_group
├── checks (root level)
├── groups
│   ├── "visit product listing page"
│   │   └── checks
│   ├── "add products to cart"
│   │   └── checks
│   └── "view cart"
│       └── checks
```

We need to traverse the entire tree to collect all checks.

---

### Extracting Endpoint Metrics

```javascript
const endpointMetrics = [];
const endpointMap = new Map();

Object.entries(metrics).forEach(([metricName, metric]) => {
    // Match: http_req_duration{name:GetProducts,method:GET}
    const durationMatch = metricName.match(/http_req_duration(?:\{([^}]+)\})?/);
    
    if (durationMatch && metricName.includes('name:')) {
        const tags = metricName.match(/\{([^}]+)\}/);
        
        if (tags) {
            const tagPairs = tags[1].split(',');
            let endpoint = 'Unknown';
            let method = 'GET';
            
            // Parse tags: name:GetProducts,method:GET
            tagPairs.forEach(pair => {
                const [key, value] = pair.split(':');
                if (key === 'name') endpoint = value;
                if (key === 'method') method = value;
            });
            
            // Store metrics by endpoint
            endpointMap.set(endpoint, {
                endpoint,
                method,
                avg: metric.values?.avg?.toFixed(2),
                p95: metric.values?.['p(95)']?.toFixed(2),
                // ... other metrics
            });
        }
    }
});
```

**Tag Parsing:**
K6 creates separate metrics for each tagged request:
- `http_req_duration{name:GetProducts}` - Duration for GetProducts
- `http_reqs{name:AddToCart}` - Request count for AddToCart

We parse these tags to group metrics by endpoint.

---

### Counting Requests Per Endpoint

```javascript
// Match: http_reqs{name:AddToCart}
const reqsMatch = metricName.match(/http_reqs(?:\{([^}]+)\})?/);

if (reqsMatch && metricName.includes('name:')) {
    const tags = metricName.match(/\{([^}]+)\}/);
    
    if (tags) {
        // Extract endpoint name
        const endpoint = parseEndpointFromTags(tags[1]);
        
        // Add count to existing endpoint data
        const existing = endpointMap.get(endpoint);
        if (existing) {
            existing.count = metric.values?.count || 0;
        }
    }
}
```

---

## Report Sections Breakdown

### 1. Header Section

```javascript
<div class="header">
    <h1>📊 K6 Performance Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <div class="status-badge status-${overallStatus.toLowerCase()}">
        ${overallStatus === 'PASSED' ? '✅' : '❌'} ${overallStatus}
    </div>
</div>
```

**Displays:**
- Report title
- Generation timestamp
- Overall pass/fail status badge

---

### 2. Failed Thresholds Alert (Conditional)

```javascript
${failedThresholds.length > 0 ? `
<div class="alert">
    <h3>⚠️ Failed Thresholds</h3>
    <ul>
        ${failedThresholds.map(ft => `
            <li>❌ <strong>${ft.metric}</strong>: ${ft.threshold}</li>
        `).join('')}
    </ul>
</div>
` : ''}
```

**Only shows if thresholds failed**

Example output:
```
⚠️ Failed Thresholds
❌ errors: rate<0.05
❌ http_req_failed: rate<0.05
```

---

### 3. Summary Cards

```javascript
<div class="card">
    <h3>Test Duration</h3>
    <div class="value">${testDuration}<span class="unit">seconds</span></div>
</div>
<div class="card">
    <h3>Total Requests</h3>
    <div class="value">${metrics.http_reqs?.values.count || 0}</div>
</div>
```

**6 Key Metrics:**
1. Test Duration (seconds)
2. Total Requests
3. Request Rate (req/s)
4. Average Response Time (ms)
5. Error Rate (%)
6. Successful Requests

**Data Source:**
```javascript
{
  testDuration: data.state.testRunDurationMs / 1000,
  totalRequests: metrics.http_reqs.values.count,
  requestRate: metrics.http_reqs.values.rate,
  avgResponseTime: metrics.http_req_duration.values.avg,
  errorRate: metrics.http_req_failed.values.rate * 100,
  successfulRequests: metrics.successful_requests.values.count
}
```

---

### 4. API Endpoint Performance Table

```javascript
${endpointMetrics.map(ep => `
    <tr>
        <td><span class="endpoint-name">${ep.endpoint}</span></td>
        <td><span class="method-badge method-${ep.method.toLowerCase()}">${ep.method}</span></td>
        <td><strong>${ep.count}</strong></td>
        <td>${ep.avg} ms</td>
        <td>${ep.min} ms</td>
        <td>${ep.p50} ms</td>
        <td>${ep.max} ms</td>
        <td>${ep.p90} ms</td>
        <td>${ep.p95} ms</td>
    </tr>
`).join('')}
```

**Columns:**
- Endpoint name
- HTTP Method (GET/POST/etc.)
- Request count
- Average, Min, Median, Max
- 90th, 95th percentiles

**Dynamic Styling:**
```css
.method-get { background: #10b981; }    /* Green */
.method-post { background: #3b82f6; }   /* Blue */
.method-put { background: #f59e0b; }    /* Orange */
.method-delete { background: #ef4444; } /* Red */
```

---

### 5. Test Groups Performance

```javascript
${Object.entries(metrics)
    .filter(([name]) => name.startsWith('group_duration{'))
    .map(([name, metric]) => {
        const groupMatch = name.match(/group:::(.+)}/);
        const groupName = groupMatch ? groupMatch[1] : name;
        
        const hasThreshold = metric.thresholds && 
                             Object.keys(metric.thresholds).length > 0;
        const thresholdPassed = hasThreshold ? 
                                Object.values(metric.thresholds).every(t => t.ok) : 
                                true;
        
        return `
            <tr>
                <td><strong>${groupName}</strong></td>
                <td>${metric.values.avg?.toFixed(2)} ms</td>
                <td>${metric.values.med?.toFixed(2)} ms</td>
                <td>${metric.values['p(95)']?.toFixed(2)} ms</td>
                <td class="${thresholdPassed ? 'pass' : 'fail'}">
                    ${thresholdPassed ? '✅ PASS' : '❌ FAIL'}
                </td>
            </tr>
        `;
    }).join('')}
```

**Displays:**
- All test group scenarios
- Average, Median, P95 durations
- Pass/fail status based on thresholds

**Group Duration Metrics:**
```javascript
// K6 automatically creates group_duration metrics
"group_duration{group:::visit product listing page}": {
  values: {
    avg: 209.60,
    med: 210.57,
    "p(95)": 299.31
  },
  thresholds: {
    "p(95)<500": { ok: true }
  }
}
```

---

### 6. Performance Goals (Thresholds)

```javascript
${Object.entries(metrics)
    .filter(([_, metric]) => metric.thresholds)
    .map(([name, metric]) => {
        return Object.entries(metric.thresholds).map(([threshold, result]) => {
            // Extract actual value
            let actualValue = 'N/A';
            
            if (threshold.includes('p(95)')) {
                actualValue = metric.values['p(95)'].toFixed(2) + ' ms';
            } else if (threshold.includes('rate')) {
                actualValue = (metric.values.rate * 100).toFixed(2) + '%';
            }
            
            return `
                <tr>
                    <td class="metric-name">${name}</td>
                    <td><code>${threshold}</code></td>
                    <td><strong>${actualValue}</strong></td>
                    <td class="${result.ok ? 'pass' : 'fail'}">
                        ${result.ok ? '✅ PASS' : '❌ FAIL'}
                    </td>
                </tr>
            `;
        }).join('');
    }).join('')}
```

**Shows:**
- Metric name
- Threshold condition (e.g., `p(95)<400`)
- Actual measured value
- Pass/fail status

**Value Extraction Logic:**
```javascript
// Map threshold types to actual values
if (threshold.includes('p(95)')) {
    actualValue = metric.values['p(95)'] + ' ms';
}
else if (threshold.includes('p(99)')) {
    actualValue = metric.values['p(99)'] + ' ms';
}
else if (threshold.includes('rate')) {
    actualValue = (metric.values.rate * 100) + '%';
}
```

---

### 7. Checks Table

```javascript
${allChecks.map(check => {
    const total = check.passes + check.fails;
    const successRate = total > 0 ? (check.passes / total * 100).toFixed(2) : '0.00';
    
    return `
        <tr>
            <td><strong>${check.name}</strong></td>
            <td class="pass">${check.passes}</td>
            <td class="${check.fails > 0 ? 'fail' : ''}">${check.fails}</td>
            <td><strong>${successRate}%</strong></td>
        </tr>
    `;
}).join('')}
```

**Displays:**
- All checks from all groups
- Pass count (green)
- Fail count (red if > 0)
- Success rate percentage

---

### 8. Footer

```javascript
<div class="footer">
    <p>Generated by K6 Load Testing Framework | Test completed in ${testDuration}s</p>
    <p>Report created: ${new Date().toLocaleString()}</p>
</div>
```

---

## Customizing Reports

### Adding Custom Sections

```javascript
function generateCustomHTMLReport(data) {
    const metrics = data.metrics;
    
    // Add custom data extraction
    const customMetrics = extractCustomMetrics(data);
    
    return `
        ...existing sections...
        
        ${customMetrics.length > 0 ? `
        <div class="section">
            <h2>🎯 Custom Metrics</h2>
            <table>
                ${renderCustomMetrics(customMetrics)}
            </table>
        </div>
        ` : ''}
        
        ...rest of report...
    `;
}
```

---

### Customizing Styles

```javascript
// In generateCustomHTMLReport(), modify <style> section
<style>
    /* Change primary color scheme */
    .header {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    /* Custom card colors */
    .card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    /* Add custom classes */
    .critical { 
        background: #fef2f2; 
        border: 2px solid #ef4444; 
    }
</style>
```

---

### Adding Charts (Optional)

```javascript
// Add Chart.js for visualization
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="performanceChart"></canvas>

<script>
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Products', 'Add to Cart', 'View Cart', 'Checkout'],
            datasets: [{
                label: 'P95 Response Time (ms)',
                data: [${p95Values.join(',')}]
            }]
        }
    });
</script>
```

---

### Custom Metric Calculations

```javascript
// Add custom aggregations
const customStats = {
    totalErrors: metrics.errors.values.count,
    errorPercentage: (metrics.errors.values.rate * 100).toFixed(2),
    avgThroughput: (metrics.http_reqs.values.rate * 60).toFixed(0), // req/min
    slowestEndpoint: findSlowestEndpoint(endpointMetrics),
};

// Use in HTML
<div class="card">
    <h3>Slowest Endpoint</h3>
    <div class="value">${customStats.slowestEndpoint.name}</div>
    <div class="unit">${customStats.slowestEndpoint.p95}ms P95</div>
</div>
```

---

## Troubleshooting

### Report Not Generated

**Problem:** No HTML file created

**Solution:**
```javascript
// Check that reportPath is correctly set
const config = {
    reportPath: './reports/average-load/report.html'  // Correct
    // NOT: 'report.html' (relative path may fail)
};

// Ensure handleSummary returns object
export function handleSummary(data) {
    return {
        ...generateHTMLReport(data, config.reportPath),  // Must spread
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
    };
}
```

---

### Missing Metrics

**Problem:** Endpoint metrics not showing

**Solution:**
```javascript
// Ensure requests are tagged
http.get(`${BASE_URL}/api/products`, {
    tags: { name: 'GetProducts', method: 'GET' }  // ✅ Must include tags
});

// NOT:
http.get(`${BASE_URL}/api/products`);  // ❌ No tags = no endpoint breakdown
```

---

### Checks Not Appearing

**Problem:** Checks section is empty

**Solution:**
```javascript
// Ensure checks return boolean
check(response, {
    'status is 200': (r) => r.status === 200  // ✅ Returns boolean
});

// NOT:
check(response, {
    'status is 200': (r) => {
        console.log(r.status);  // ❌ Returns undefined
    }
});
```

---

### Thresholds Not Calculated

**Problem:** All thresholds show "N/A"

**Solution:**
```javascript
// Ensure thresholds are defined in options
export const options = {
    thresholds: {
        'http_req_duration': ['p(95)<400'],  // ✅ Defined
        'errors': ['rate<0.05'],
    },
};

// NOT missing thresholds in options
```

---

### Encoding Issues

**Problem:** Special characters display incorrectly

**Solution:**
```html
<!-- Ensure correct charset in HTML -->
<meta charset="UTF-8">

<!-- Escape user data -->
<td>${escapeHtml(check.name)}</td>
```

```javascript
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
```

---

## Best Practices

### 1. Keep Report Generator Separate

```
✅ GOOD: scripts/html-report-generator.js
❌ BAD: Inline HTML in test file
```

### 2. Version Control Report Templates

```bash
# Track changes to report format
git add scripts/html-report-generator.js
git commit -m "Add endpoint performance table to reports"
```

### 3. Generate Multiple Formats

```javascript
export function handleSummary(data) {
    return {
        // HTML for humans
        [config.reportPath]: generateHTMLReport(data),
        
        // JSON for CI/CD integration
        [config.jsonReportPath]: JSON.stringify(data, null, 2),
        
        // CSV for Excel analysis
        [config.csvReportPath]: generateCSVReport(data),
        
        // JUnit XML for Jenkins
        'junit.xml': generateJUnitXML(data),
    };
}
```

### 4. Add Report Metadata

```javascript
// Include test configuration in report
<div class="metadata">
    <h3>Test Configuration</h3>
    <ul>
        <li>Test Type: ${config.testType}</li>
        <li>Environment: ${config.environment}</li>
        <li>Base URL: ${config.baseUrl}</li>
        <li>Virtual Users: ${config.vus}</li>
        <li>Duration: ${config.duration}</li>
    </ul>
</div>
```

### 5. Handle Large Datasets

```javascript
// Limit checks display for very large reports
const displayChecks = allChecks.length > 100 
    ? allChecks.slice(0, 100) 
    : allChecks;

${displayChecks.length < allChecks.length ? `
    <p>⚠️ Showing first 100 of ${allChecks.length} checks</p>
` : ''}
```

---

## Summary

**Report Generation Pipeline:**

```
Test Execution
    ↓
handleSummary(data) called
    ↓
generateHTMLReport(data, path)
    ↓
Parse metrics, checks, thresholds
    ↓
Generate HTML string
    ↓
Return file mapping
    ↓
K6 writes files
    ↓
Reports ready!
```

**Key Takeaways:**

1. ✅ `handleSummary()` is a K6 lifecycle hook
2. ✅ Return object maps file paths to content
3. ✅ HTML generator parses nested data structure
4. ✅ Checks are collected recursively from groups
5. ✅ Tagged metrics enable endpoint breakdown
6. ✅ Thresholds determine pass/fail status
7. ✅ Fully customizable HTML/CSS

---

## Next Steps

1. Review your test file's `handleSummary()` function
2. Examine `scripts/html-report-generator.js`
3. Customize report styling and sections
4. Add custom metrics or calculations
5. Generate reports in multiple formats
6. Integrate with CI/CD pipelines

**Related Files:**
- [k6/average-load.test.js](../k6/average-load.test.js) - Test with handleSummary
- [scripts/html-report-generator.js](../scripts/html-report-generator.js) - Report generator
- [reports/](../reports/) - Generated output location
