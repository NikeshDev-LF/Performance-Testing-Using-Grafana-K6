import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');

// Browser average load test configuration - sustained normal traffic
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 10 },
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
    browser_errors: ['rate<0.05'],
    page_load_time: ['p(95)<8000', 'p(99)<12000'],
    'group_duration{group:::visit product page}': ['p(95)<8000'],
    'group_duration{group:::add to cart}': ['p(95)<5000'],
    'group_duration{group:::view cart}': ['p(95)<4000'],
    'group_duration{group:::checkout}': ['p(95)<8000'],
  },
  tags: {
    test_type: 'browser_average_load_test',
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
      
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      pageLoadTime.add(loadTime);
      
      check(response, {
        'page loaded successfully': (r) => r.status() === 200,
        'page load time acceptable': () => loadTime < 8000,
      }) ? successfulNavigations.add(1) : (failedNavigations.add(1), errorRate.add(1));
      
      // Realistic user behavior - scroll and view
      await page.evaluate(() => window.scrollBy(0, 300));
      sleep(1);
      await page.evaluate(() => window.scrollBy(0, 300));
      
      sleep(2);
    });

    // Group 2: Add to cart
    group('add to cart', () => {
      await page.waitForSelector('.product-item', { timeout: 5000 });
      
      // Randomly add 1-3 products
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
      });
      
      sleep(2);
    });

    // Group 3: View cart
    group('view cart', () => {
      await page.locator('a:has-text("Cart")').click();
      
      await page.waitForSelector('.cart-items', { timeout: 3000 });
      
      const cartItems = await page.locator('.cart-item').count();
      check(cartItems, {
        'cart displays items': (count) => count > 0,
      });
      
      // Review cart items
      await page.evaluate(() => window.scrollBy(0, 200));
      
      sleep(3);
    });

    // Group 4: Checkout
    group('checkout', () => {
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
      });
      
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

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 K6 BROWSER AVERAGE LOAD TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;

  console.log('\n🎯 Navigation Stats:');
  console.log(`   Successful: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed: ${metrics.failed_navigations?.values.count || 0}`);
  console.log(`   Success Rate: ${(((metrics.successful_navigations?.values.count || 0) / ((metrics.successful_navigations?.values.count || 0) + (metrics.failed_navigations?.values.count || 1))) * 100).toFixed(2)}%`);

  console.log('\n⚡ Performance:');
  console.log(`   Avg Page Load: ${metrics.page_load_time?.values.avg?.toFixed(2) || 0}ms`);
  console.log(`   p(95): ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`   p(99): ${metrics.page_load_time?.values['p(99)']?.toFixed(2) || 0}ms`);

  console.log('\n✅ Quality:');
  console.log(`   Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);

  console.log('\n💡 Average Load Test Result:');
  if ((metrics.browser_errors?.values.rate || 0) < 0.05) {
    console.log('   ✅ PASSED - System handles average load well');
  } else {
    console.log('   ⚠️  WARNING - Consider optimization');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
