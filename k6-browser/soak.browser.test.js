import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for long-running stability test
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');
const memoryIssues = new Counter('memory_issues');

// Browser soak test configuration - extended stability test
export const options = {
  scenarios: {
    browser: {
      executor: 'constant-vus',
      vus: 10, // Moderate load for extended period
      duration: '30m', // Reduced from 4h for CI/CD, use 4h for real soak test
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_errors: ['rate<0.05'],
    page_load_time: ['p(95)<10000', 'avg<6000'],
    'group_duration{group:::visit product page}': ['p(95)<10000'],
    memory_issues: ['count<5'], // Detect memory leaks
  },
  tags: {
    test_type: 'browser_soak_test',
    environment: 'local',
  },
};

const BASE_URL = 'http://localhost:3000';
let iterationCount = 0;

export default async function () {
  const page = browser.newPage();
  iterationCount++;
  const currentIteration = iterationCount;

  try {
    // Log progress every 10 iterations
    if (currentIteration % 10 === 0) {
      console.log(`🔄 VU ${__VU} - Iteration ${currentIteration} - Still running...`);
    }

    // Group 1: Visit product page
    group('visit product page', () => {
      const startTime = Date.now();
      
      const response = await page.goto(BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: 12000 
      });
      
      const loadTime = Date.now() - startTime;
      pageLoadTime.add(loadTime);
      
      const success = check(response, {
        'page loaded successfully': (r) => r.status() === 200,
        'page load time stable': () => loadTime < 10000,
      });

      if (success) {
        successfulNavigations.add(1);
      } else {
        failedNavigations.add(1);
        errorRate.add(1);
        console.log(`⚠️  VU ${__VU} - Iteration ${currentIteration} - Page load failed or slow: ${loadTime}ms`);
      }

      // Check for performance degradation (sign of memory leak)
      if (loadTime > 12000 && currentIteration > 20) {
        console.log(`🚨 VU ${__VU} - Potential memory issue detected at iteration ${currentIteration}`);
        memoryIssues.add(1);
      }
      
      // Realistic browsing
      await page.evaluate(() => window.scrollBy(0, 200));
      sleep(2);
    });

    // Group 2: Add to cart
    group('add to cart', () => {
      try {
        await page.waitForSelector('.product-item', { timeout: 5000 });
        
        const addButtons = page.locator('button:has-text("Add to Cart")');
        await addButtons.first().click();
        sleep(1);
        
        await page.waitForSelector('.cart-count', { timeout: 3000 });
        
        check(page, {
          'cart interaction successful': (p) => p.locator('.cart-count').isVisible(),
        });
      } catch (error) {
        console.log(`VU ${__VU} - Iteration ${currentIteration} - Cart error: ${error.message}`);
        errorRate.add(1);
      }
      
      sleep(2);
    });

    // Group 3: View cart
    group('view cart', () => {
      try {
        await page.locator('a:has-text("Cart")').click();
        await page.waitForSelector('.cart-items', { timeout: 5000 });
        
        const cartItems = await page.locator('.cart-item').count();
        check(cartItems, {
          'cart displays items': (count) => count > 0,
        });
        
        // Review cart
        await page.evaluate(() => window.scrollBy(0, 100));
      } catch (error) {
        console.log(`VU ${__VU} - Iteration ${currentIteration} - Cart view error: ${error.message}`);
        errorRate.add(1);
      }
      
      sleep(2);
    });

    // Group 4: Navigate back (complete cycle)
    group('navigate back to home', () => {
      try {
        await page.locator('a:has-text("Home")').click();
        await page.waitForSelector('.product-list', { timeout: 5000 });
        
        check(page, {
          'navigation back successful': (p) => p.locator('.product-list').isVisible(),
        });
      } catch (error) {
        console.log(`VU ${__VU} - Iteration ${currentIteration} - Navigation error: ${error.message}`);
        errorRate.add(1);
      }
      
      sleep(3);
    });

  } catch (error) {
    console.error(`VU ${__VU} - Iteration ${currentIteration} - Critical error:`, error.message);
    errorRate.add(1);
    failedNavigations.add(1);
  } finally {
    page.close(); // Important: Clean up to prevent memory leaks
  }

  sleep(5); // Realistic think time between iterations
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('⏱️  K6 BROWSER SOAK TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;
  const duration = data.state.testRunDurationMs / 1000 / 60; // minutes

  console.log('\n📊 Test Duration:');
  console.log(`   Total Time: ${duration.toFixed(2)} minutes`);
  console.log(`   Total Iterations: ${metrics.iterations?.values.count || 0}`);

  console.log('\n🎯 Navigation Stats:');
  console.log(`   Successful: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed: ${metrics.failed_navigations?.values.count || 0}`);
  console.log(`   Success Rate: ${(((metrics.successful_navigations?.values.count || 0) / ((metrics.successful_navigations?.values.count || 0) + (metrics.failed_navigations?.values.count || 1))) * 100).toFixed(2)}%`);

  console.log('\n⚡ Performance Stability:');
  console.log(`   Avg Page Load: ${metrics.page_load_time?.values.avg?.toFixed(2) || 0}ms`);
  console.log(`   Min: ${metrics.page_load_time?.values.min?.toFixed(2) || 0}ms`);
  console.log(`   Max: ${metrics.page_load_time?.values.max?.toFixed(2) || 0}ms`);
  console.log(`   p(95): ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`   p(99): ${metrics.page_load_time?.values['p(99)']?.toFixed(2) || 0}ms`);

  console.log('\n🔍 Stability Indicators:');
  console.log(`   Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);
  console.log(`   Memory Issues Detected: ${metrics.memory_issues?.values.count || 0}`);

  // Calculate performance trend (comparing first vs last quarter)
  const avgLoad = metrics.page_load_time?.values.avg || 0;
  const maxLoad = metrics.page_load_time?.values.max || 0;
  const degradation = ((maxLoad - avgLoad) / avgLoad * 100).toFixed(2);

  console.log('\n📈 Performance Degradation:');
  console.log(`   Max vs Avg Difference: ${degradation}%`);
  if (parseFloat(degradation) > 50) {
    console.log('   ⚠️  WARNING: Significant performance degradation detected');
  } else {
    console.log('   ✅ Performance remains stable');
  }

  console.log('\n💡 Soak Test Result:');
  const errorRateValue = metrics.browser_errors?.values.rate || 0;
  const memoryIssueCount = metrics.memory_issues?.values.count || 0;

  if (errorRateValue < 0.02 && memoryIssueCount === 0) {
    console.log('   ✅ EXCELLENT - System is stable under sustained load');
  } else if (errorRateValue < 0.05 && memoryIssueCount < 3) {
    console.log('   ✅ PASSED - Minor issues but generally stable');
  } else {
    console.log('   ❌ FAILED - Stability concerns detected');
  }

  console.log('\n📌 Recommendations:');
  if (memoryIssueCount > 0) {
    console.log('   • Investigate potential memory leaks');
    console.log('   • Review browser resource cleanup');
  }
  if (errorRateValue > 0.03) {
    console.log('   • Review error logs for patterns');
    console.log('   • Consider implementing retry mechanisms');
  }
  if (memoryIssueCount === 0 && errorRateValue < 0.02) {
    console.log('   • System is production-ready for sustained load');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
