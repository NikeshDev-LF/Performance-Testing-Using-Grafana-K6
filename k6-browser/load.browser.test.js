import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');

// Browser load test configuration - baseline performance under normal load
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '1m', target: 8 },
        { duration: '1m', target: 8 },
        { duration: '30s', target: 0 },
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
    test_type: 'browser_load_test',
    environment: 'local',
  },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
  const page = await browser.newPage();

  try {
    // Visit product page
    const startTime = Date.now();
    
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    pageLoadTime.add(loadTime);
    
    check(response, {
      'page loaded successfully': (r) => r.status() === 200,
      'page load time acceptable': () => loadTime < 8000,
    }) ? successfulNavigations.add(1) : (failedNavigations.add(1), errorRate.add(1));
    
    // Scroll to view products
    await page.evaluate(() => window.scrollBy(0, 500));
    
    sleep(2);

    // Add to cart
    await page.waitForSelector('.product-card', { timeout: 5000 });
    
    // Add 2 products to cart
    const addButtons = page.locator('[data-testid^="add-to-cart-"]');
    const buttonCount = await addButtons.count();
    
    const itemsToAdd = Math.min(2, buttonCount);
    for (let i = 0; i < itemsToAdd; i++) {
      await addButtons.nth(i).click();
      sleep(0.5);
    }
    
    // Verify cart updated
    await page.waitForSelector('.cart-count', { timeout: 3000 });
    const cartCount = await page.locator('.cart-count').textContent();
    
    check(cartCount, {
      'cart has multiple items': (count) => parseInt(count) >= itemsToAdd,
    });
    
    sleep(1);

    // View cart
    await page.locator('#cartIcon').click();
    
    await page.waitForSelector('.cart-items', { timeout: 3000 });
    
    const cartItems = await page.locator('.cart-item').count();
    check(cartItems, {
      'cart displays items': (count) => count > 0,
    });
    
    // Check total price visible
    const totalVisible = await page.locator('.cart-total').isVisible();
    check(totalVisible, {
      'cart total visible': (visible) => visible === true,
    });
    
    sleep(2);

    // Checkout
    await page.locator('#checkoutBtn').click();
    
    await page.waitForSelector('#checkoutForm', { timeout: 5000 });
    
    // Fill form with realistic think time
    await page.fill('#customerName', `User${__VU}`);
    sleep(0.5);
    
    await page.fill('#customerEmail', `user${__VU}@test.com`);
    sleep(0.5);
    
    await page.fill('#customerAddress', `${__VU} Test Street`);
    sleep(0.5);
    
    // Verify form completion
    const nameValue = await page.locator('#customerName').inputValue();
    check(nameValue, {
      'checkout form completed': (val) => val.length > 0,
    });
    
    sleep(1);

  } catch (error) {
    console.error(`VU ${__VU} Browser error:`, error);
    errorRate.add(1);
    failedNavigations.add(1);
  } finally {
    await page.close();
    sleep(2); // Allow browser process to fully terminate
  }

  sleep(4);
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 K6 BROWSER LOAD TEST SUMMARY');
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

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
