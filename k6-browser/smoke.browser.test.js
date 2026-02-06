import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');

// Browser smoke test configuration - minimal load to verify browser scripts work
export const options = {
  scenarios: {
    browser: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_errors: ['rate<0.01'],
    page_load_time: ['p(95)<5000'],
    'group_duration{group:::visit product page}': ['p(95)<5000'],
    'group_duration{group:::add to cart}': ['p(95)<3000'],
    'group_duration{group:::view cart}': ['p(95)<2000'],
    'group_duration{group:::checkout}': ['p(95)<5000'],
  },
  tags: {
    test_type: 'browser_smoke_test',
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
        'page load time acceptable': () => loadTime < 5000,
      }) ? successfulNavigations.add(1) : (failedNavigations.add(1), errorRate.add(1));
      
      // Verify page content
      const pageTitle = await page.title();
      check(pageTitle, {
        'page has title': (t) => t.length > 0,
      });
      
      await page.screenshot({ path: 'screenshots/smoke-homepage.png' });
      
      sleep(1);
    });

    // Group 2: Add to cart
    group('add to cart', () => {
      // Wait for products to load
      await page.waitForSelector('.product-item', { timeout: 5000 });
      
      // Click first "Add to Cart" button
      const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
      
      check(addToCartButton, {
        'add to cart button exists': (btn) => btn !== null,
      });
      
      await addToCartButton.click();
      
      // Wait for cart to update
      await page.waitForSelector('.cart-count', { timeout: 3000 });
      
      const cartCount = await page.locator('.cart-count').textContent();
      check(cartCount, {
        'cart updated': (count) => parseInt(count) > 0,
      });
      
      sleep(1);
    });

    // Group 3: View cart
    group('view cart', () => {
      await page.locator('a:has-text("Cart")').click();
      
      await page.waitForSelector('.cart-items', { timeout: 3000 });
      
      const cartItems = await page.locator('.cart-item').count();
      check(cartItems, {
        'cart has items': (count) => count > 0,
      });
      
      await page.screenshot({ path: 'screenshots/smoke-cart.png' });
      
      sleep(1);
    });

    // Group 4: Checkout
    group('checkout', () => {
      const checkoutButton = page.locator('button:has-text("Checkout")');
      
      await checkoutButton.click();
      
      // Wait for checkout form
      await page.waitForSelector('#checkout-form', { timeout: 5000 });
      
      // Fill form
      await page.fill('#name', 'Test User');
      await page.fill('#email', 'test@example.com');
      await page.fill('#address', '123 Test St');
      
      const formFilled = await page.locator('#name').inputValue();
      check(formFilled, {
        'form filled successfully': (val) => val === 'Test User',
      });
      
      await page.screenshot({ path: 'screenshots/smoke-checkout.png' });
      
      sleep(1);
    });

  } catch (error) {
    console.error('Browser test error:', error);
    errorRate.add(1);
    failedNavigations.add(1);
  } finally {
    page.close();
  }
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('💨 K6 BROWSER SMOKE TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;

  console.log('\n🎯 Test Validation:');
  console.log(`   Successful Navigations: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed Navigations: ${metrics.failed_navigations?.values.count || 0}`);

  console.log('\n⚡ Performance:');
  console.log(`   Average Page Load: ${metrics.page_load_time?.values.avg.toFixed(2) || 0}ms`);
  console.log(`   p(95) Page Load: ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);

  console.log('\n✅ Quality Check:');
  console.log(`   Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);

  console.log('\n💡 Result:');
  if ((metrics.browser_errors?.values.rate || 0) === 0) {
    console.log('   ✅ PASSED - Browser script is working correctly!');
  } else {
    console.log('   ❌ FAILED - Browser script has issues that need fixing!');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
