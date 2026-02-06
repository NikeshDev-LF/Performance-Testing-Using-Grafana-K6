# K6 Browser Testing Guide

This folder contains browser-based performance tests using k6's browser module, which automates Chromium for frontend performance testing.

## 📖 What is Browser Testing?

Browser testing with k6 simulates real user interactions in an actual browser (Chromium). Unlike API tests that directly hit HTTP endpoints, browser tests:

- Load and render HTML, CSS, and JavaScript
- Execute client-side JavaScript
- Interact with DOM elements (clicks, form fills, navigation)
- Measure actual user experience metrics
- Capture screenshots
- Measure page load times from a user's perspective

## 📊 Test Types

This folder contains all 7 test types, mirroring the API tests in the `k6/` folder:

| Test Type | File | VUs | Duration | Purpose |
|-----------|------|-----|----------|---------|
| **Smoke** | `smoke.browser.test.js` | 1 | 1 min | Verify browser scripts work |
| **Load** | `load.browser.test.js` | 5-10 | 3.5 min | Baseline browser performance |
| **Average Load** | `average-load.browser.test.js` | 10-20 | 16 min | Sustained normal traffic |
| **Stress** | `stress.browser.test.js` | 10-40 | 10 min | Beyond capacity testing |
| **Spike** | `spike.browser.test.js` | 5-30 | 6 min | Sudden traffic surge |
| **Soak** | `soak.browser.test.js` | 10 | 30 min | Long-term stability |
| **Breakpoint** | `breakpoint.browser.test.js` | 0-40 | 16 min | Find maximum capacity |

## 🔄 API Tests vs Browser Tests

| Aspect | API Tests (`k6/` folder) | Browser Tests (`k6-browser/` folder) |
|--------|--------------------------|-------------------------------------|
| **What they test** | Backend APIs, endpoints | Frontend UI, user experience |
| **How they work** | Direct HTTP requests | Full browser automation |
| **Resources** | Lightweight (5MB per 100 VUs) | Heavy (2GB for 10 browser VUs) |
| **Speed** | Very fast | Slower (rendering overhead) |
| **VU limits** | Can scale to 100s-1000s | Typically 10-50 max |
| **Metrics** | Response times, throughput | Page load, rendering, interactions |
| **Use for** | Backend performance, scalability | Frontend performance, UX validation |

## 🎯 When to Use Each

### Use API Tests When:
- Testing backend/API performance
- Need high VU counts (100+)
- Testing server-side logic
- CI/CD with limited resources
- Load/stress testing at scale

### Use Browser Tests When:
- Testing frontend performance
- Measuring real user experience
- Validating UI interactions
- Testing client-side rendering
- Checking JavaScript execution time
- Need visual validation (screenshots)

## 🚀 Running Browser Tests

### Prerequisites

```bash
# Ensure k6 version 0.43.0 or higher
k6 version

# Start the sample application
npm run start:app
```

### Run Individual Tests (Headless)

```bash
# Smoke test (1 browser VU)
npm run test:browser:smoke

# Load test (5-10 browser VUs)
npm run test:browser:load

# Average load test (10-20 browser VUs)
npm run test:browser:average

# Stress test (10-40 browser VUs)
npm run test:browser:stress

# Spike test (5-30 browser VUs)
npm run test:browser:spike

# Soak test (10 browser VUs, 30 min)
npm run test:browser:soak

# Breakpoint test (0-40 browser VUs)
npm run test:browser:breakpoint
```

### Run Tests in Headful Mode (Visible Browser)

Useful for debugging and seeing what the browser is doing:

```bash
# Watch smoke test in visible browser
npm run test:browser:headful:smoke

# Watch load test
npm run test:browser:headful:load

# Watch average load test
npm run test:browser:headful:average

# Watch stress test
npm run test:browser:headful:stress

# Watch spike test
npm run test:browser:headful:spike

# Watch soak test
npm run test:browser:headful:soak

# Watch breakpoint test
npm run test:browser:headful:breakpoint
```

## 📊 Metrics Explained

Browser tests include custom metrics:

- **browser_errors**: Rate of errors during browser operations
- **page_load_time**: Time to load and render pages
- **successful_navigations**: Count of successful page loads
- **failed_navigations**: Count of failed page loads
- **spike_phase_errors** (spike test): Errors during traffic spike
- **memory_issues** (soak test): Detected memory leaks
- **breakpoint_reached** (breakpoint test): System capacity indicators

## 🖼️ Screenshots

Browser tests automatically capture screenshots at key points and save them to the `screenshots/` folder for visual validation and debugging.

## ⚠️ Resource Considerations

Browser tests are resource-intensive:

- **CPU**: Each browser VU needs significant CPU for rendering
- **Memory**: ~200MB per browser VU
- **Execution Time**: 3-5x slower than equivalent API tests

**Recommended VU Limits:**
- Local development: Max 10-20 browser VUs
- CI/CD environments: Max 5-10 browser VUs
- Production testing: Use dedicated performance testing infrastructure

## 🔧 Troubleshooting

### Test Fails with "Browser not found"
```bash
# Ensure k6 version supports browser module
k6 version  # Should be 0.43.0+
```

### Out of Memory Errors
- Reduce VU count in test configuration
- Ensure `page.close()` is in finally block
- Monitor system resources during test

### Slow Test Execution
- Browser tests are inherently slower than API tests
- Reduce think times for faster execution
- Use headless mode (default) for better performance

### Screenshots Not Captured
- Check `screenshots/` folder exists
- Verify write permissions
- Screenshot capture requires successful page load

## 📈 Performance Comparison

**Example: Load Test Comparison**

| Metric | API Test | Browser Test |
|--------|----------|--------------|
| VUs | 100 | 10 |
| Duration | 5 min | 5 min |
| Requests | ~30,000 | ~300 |
| Memory | ~50MB | ~2GB |
| CPU | ~10% | ~60% |
| Test Speed | 100 req/sec | 1 req/sec |

## 💡 Best Practices

1. **Start Small**: Begin with smoke test (1 VU) before scaling
2. **Monitor Resources**: Watch CPU/Memory during browser tests
3. **Use Headful for Debug**: Run in headful mode when troubleshooting
4. **Combine Both**: Use API tests for scale, browser tests for UX validation
5. **Clean Up Pages**: Always close pages in finally blocks
6. **Realistic Timings**: Include proper sleep/think times
7. **Screenshot Wisely**: Capture screenshots only at critical points

## 📚 Additional Resources

- [k6 Browser Documentation](https://grafana.com/docs/k6/latest/using-k6-browser/)
- [Browser API Reference](https://grafana.com/docs/k6/latest/javascript-api/k6-browser/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)

---

**Note**: All browser tests in this folder follow the same user journey patterns as API tests but add browser rendering, JavaScript execution, and DOM interaction layers for comprehensive frontend performance testing.
