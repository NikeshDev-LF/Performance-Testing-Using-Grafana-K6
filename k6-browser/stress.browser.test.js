import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');

// Browser stress test configuration - push beyond normal capacity
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 20 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 40 },
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
    browser_errors: ['rate<0.15'],
    page_load_time: ['p(95)<15000'],
    'group_duration{group:::visit product page}': ['p(95)<15000'],
  },
  tags: {
    test_type: 'browser_stress_test',
    environment: 'local',
  },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
  const page = browser.newPage();

  try {
    // Group 1: Visit product page
    group('visit product page', () => {
      const startTime = Date.now();
      
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      pageLoadTime.add(loadTime);
      
      if (loadTime > 10000) {
        console.log(`⚠️  VU ${__VU}: Slow page load (${loadTime}ms)`);
      }
      
      check(response, {
        'page loaded': (r) => r.status() === 200,
      }) ? successfulNavigations.add(1) : (failedNavigations.add(1), errorRate.add(1));
      
      sleep(1);
    });

    // Group 2: Add to cart under stress
    group('add to cart', () => {
      try {
        await page.waitForSelector('.product-item', { timeout: 10000 });
        
        const addButton = page.locator('button:has-text("Add to Cart")').first();
        await addButton.click({ timeout: 5000 });
        
        await page.waitForSelector('.cart-count', { timeout: 5000 });
        
        check(true, {
          'add to cart successful': () => true,
        });
      } catch (error) {
        console.log(`❌ VU ${__VU}: Add to cart failed under stress`);
        errorRate.add(1);
      }
      
      sleep(1);
    });

    // Group 3: View cart
    group('view cart', () => {
      try {
        await page.locator('a:has-text("Cart")').click({ timeout: 5000 });
        await page.waitForSelector('.cart-items', { timeout: 10000 });
        
        check(true, {
          'cart view successful': () => true,
        });
      } catch (error) {
        console.log(`❌ VU ${__VU}: Cart view failed under stress`);
        errorRate.add(1);
      }
      
      sleep(1);
    });

    // Group 4: Checkout under stress
    group('checkout', () => {
      try {
        await page.locator('button:has-text("Checkout")').click({ timeout: 5000 });
        await page.waitForSelector('#checkout-form', { timeout: 10000 });
        
        await page.fill('#name', `StressUser${__VU}`);
        await page.fill('#email', `stress${__VU}@test.com`);
        
        check(true, {
          'checkout form loaded': () => true,
        });
      } catch (error) {
        console.log(`❌ VU ${__VU}: Checkout failed under stress`);
        errorRate.add(1);
      }
      
      sleep(0.5);
    });

  } catch (error) {
    console.error(`VU ${__VU} Critical error:`, error.message);
    errorRate.add(1);
    failedNavigations.add(1);
  } finally {
    page.close();
  }

  sleep(1);
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('💪 K6 BROWSER STRESS TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;

  console.log('\n🎯 Stress Test Results:');
  console.log(`   Successful Navigations: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed Navigations: ${metrics.failed_navigations?.values.count || 0}`);
  console.log(`   Failure Rate: ${((metrics.failed_navigations?.values.count || 0) / ((metrics.successful_navigations?.values.count || 1) + (metrics.failed_navigations?.values.count || 0)) * 100).toFixed(2)}%`);

  console.log('\n⚡ Performance Under Stress:');
  console.log(`   Avg Page Load: ${metrics.page_load_time?.values.avg?.toFixed(2) || 0}ms`);
  console.log(`   Max Page Load: ${metrics.page_load_time?.values.max?.toFixed(2) || 0}ms`);
  console.log(`   p(95): ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);

  console.log('\n⚠️  System Stability:');
  console.log(`   Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);

  console.log('\n💡 Stress Test Verdict:');
  if ((metrics.browser_errors?.values.rate || 0) < 0.15) {
    console.log('   ✅ PASSED - System handled stress well');
  } else {
    console.log('   ⚠️  WARNING - High error rate under stress');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
