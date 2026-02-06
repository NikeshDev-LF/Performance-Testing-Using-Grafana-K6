import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');
const spikePhaseErrors = new Counter('spike_phase_errors');

// Browser spike test configuration - sudden traffic surge
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },   // Normal load
        { duration: '10s', target: 30 }, // Sudden spike!
        { duration: '3m', target: 30 },  // Sustained spike
        { duration: '1m', target: 5 },   // Recovery
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
    browser_errors: ['rate<0.15'], // Higher tolerance during spike
    page_load_time: ['p(95)<15000'], // Relaxed during spike
    'group_duration{group:::visit product page}': ['p(95)<15000'],
  },
  tags: {
    test_type: 'browser_spike_test',
    environment: 'local',
  },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
  const page = browser.newPage();
  const isSpike = __VU > 5; // Identify spike phase

  try {
    // Group 1: Visit product page
    group('visit product page', () => {
      const startTime = Date.now();
      
      const response = await page.goto(BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: isSpike ? 15000 : 10000 
      });
      
      const loadTime = Date.now() - startTime;
      pageLoadTime.add(loadTime);
      
      const success = check(response, {
        'page loaded successfully': (r) => r.status() === 200,
        'page load time acceptable': () => loadTime < (isSpike ? 15000 : 8000),
      });

      if (success) {
        successfulNavigations.add(1);
      } else {
        failedNavigations.add(1);
        errorRate.add(1);
        if (isSpike) {
          spikePhaseErrors.add(1);
        }
      }

      if (loadTime > 10000) {
        console.log(`⚠️  VU ${__VU} - Slow page load during spike: ${loadTime}ms`);
      }
      
      sleep(1);
    });

    // Group 2: Add to cart (quick interaction during spike)
    group('add to cart', () => {
      try {
        await page.waitForSelector('.product-item', { timeout: isSpike ? 8000 : 5000 });
        
        const addButtons = page.locator('button:has-text("Add to Cart")');
        const buttonCount = await addButtons.count();
        
        if (buttonCount > 0) {
          await addButtons.first().click();
          sleep(0.5);
          
          await page.waitForSelector('.cart-count', { timeout: 3000 });
        }
      } catch (error) {
        console.log(`VU ${__VU} - Cart interaction error during spike: ${error.message}`);
        errorRate.add(1);
        if (isSpike) {
          spikePhaseErrors.add(1);
        }
      }
      
      sleep(1);
    });

    // Group 3: View cart (verification)
    group('view cart', () => {
      try {
        await page.locator('a:has-text("Cart")').click();
        await page.waitForSelector('.cart-items', { timeout: isSpike ? 8000 : 3000 });
        
        check(page, {
          'cart page loaded': (p) => p.locator('.cart-items').isVisible(),
        });
      } catch (error) {
        console.log(`VU ${__VU} - Cart view error during spike: ${error.message}`);
        errorRate.add(1);
        if (isSpike) {
          spikePhaseErrors.add(1);
        }
      }
      
      sleep(1);
    });

  } catch (error) {
    console.error(`VU ${__VU} Browser critical error:`, error.message);
    errorRate.add(1);
    if (isSpike) {
      spikePhaseErrors.add(1);
    }
    failedNavigations.add(1);
  } finally {
    page.close();
  }

  sleep(isSpike ? 1 : 2); // Faster during spike
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('⚡ K6 BROWSER SPIKE TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;

  console.log('\n🎯 Navigation Stats:');
  console.log(`   Successful: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed: ${metrics.failed_navigations?.values.count || 0}`);
  console.log(`   Spike Phase Errors: ${metrics.spike_phase_errors?.values.count || 0}`);
  console.log(`   Success Rate: ${(((metrics.successful_navigations?.values.count || 0) / ((metrics.successful_navigations?.values.count || 0) + (metrics.failed_navigations?.values.count || 1))) * 100).toFixed(2)}%`);

  console.log('\n⚡ Performance During Spike:');
  console.log(`   Avg Page Load: ${metrics.page_load_time?.values.avg?.toFixed(2) || 0}ms`);
  console.log(`   p(95): ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`   p(99): ${metrics.page_load_time?.values['p(99)']?.toFixed(2) || 0}ms`);
  console.log(`   Max: ${metrics.page_load_time?.values.max?.toFixed(2) || 0}ms`);

  console.log('\n✅ Quality:');
  console.log(`   Overall Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);
  console.log(`   Spike Phase Errors: ${metrics.spike_phase_errors?.values.count || 0}`);

  console.log('\n💡 Spike Test Result:');
  if ((metrics.browser_errors?.values.rate || 0) < 0.10) {
    console.log('   ✅ EXCELLENT - System handles spike well');
  } else if ((metrics.browser_errors?.values.rate || 0) < 0.15) {
    console.log('   ⚠️  ACCEPTABLE - Some degradation during spike');
  } else {
    console.log('   ❌ FAILED - Significant issues during spike');
  }

  console.log('\n📌 Recommendation:');
  if ((metrics.spike_phase_errors?.values.count || 0) > 10) {
    console.log('   Consider implementing rate limiting or auto-scaling');
  } else {
    console.log('   System recovery looks good');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
