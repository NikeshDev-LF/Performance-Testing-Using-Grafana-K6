import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('browser_errors');
const pageLoadTime = new Trend('page_load_time');
const successfulNavigations = new Counter('successful_navigations');
const failedNavigations = new Counter('failed_navigations');
const breakpointReached = new Counter('breakpoint_reached');

// Browser breakpoint test configuration - find maximum capacity
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '2m', target: 15 },
        { duration: '2m', target: 20 },
        { duration: '2m', target: 25 },
        { duration: '2m', target: 30 },
        { duration: '2m', target: 35 },
        { duration: '2m', target: 40 }, // Push to 40 browser VUs
      ],
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_errors: ['rate<0.50'], // Very high tolerance to find breaking point
    page_load_time: ['p(95)<30000'], // Very relaxed to see max limits
  },
  tags: {
    test_type: 'browser_breakpoint_test',
    environment: 'local',
  },
};

const BASE_URL = 'http://localhost:3000';

export default async function () {
  const page = browser.newPage();
  const currentLoad = __VU;

  try {
    // Group 1: Visit product page
    group('visit product page', () => {
      const startTime = Date.now();
      
      try {
        const response = await page.goto(BASE_URL, { 
          waitUntil: 'networkidle',
          timeout: 20000 
        });
        
        const loadTime = Date.now() - startTime;
        pageLoadTime.add(loadTime);
        
        const success = check(response, {
          'page loaded': (r) => r && r.status() === 200,
        });

        if (success) {
          successfulNavigations.add(1);
          
          // Log performance degradation
          if (loadTime > 15000 && currentLoad > 20) {
            console.log(`⚠️  VU ${__VU} - Severe degradation at ${currentLoad} VUs: ${loadTime}ms`);
          } else if (loadTime > 10000 && currentLoad > 15) {
            console.log(`⚡ VU ${__VU} - Degradation at ${currentLoad} VUs: ${loadTime}ms`);
          }
        } else {
          failedNavigations.add(1);
          errorRate.add(1);
          console.log(`❌ VU ${__VU} - FAILURE at ${currentLoad} VUs: Page load failed`);
          
          if (currentLoad > 25) {
            breakpointReached.add(1);
          }
        }
        
        sleep(1);
      } catch (error) {
        console.log(`❌ VU ${__VU} - CRITICAL at ${currentLoad} VUs: ${error.message}`);
        errorRate.add(1);
        failedNavigations.add(1);
        
        if (currentLoad > 20) {
          breakpointReached.add(1);
        }
      }
    });

    // Group 2: Add to cart (simplified for breakpoint)
    group('add to cart', () => {
      try {
        await page.waitForSelector('.product-item', { timeout: 10000 });
        
        const addButtons = page.locator('button:has-text("Add to Cart")');
        const buttonCount = await addButtons.count();
        
        if (buttonCount > 0) {
          await addButtons.first().click();
          await page.waitForSelector('.cart-count', { timeout: 5000 });
          
          check(page, {
            'cart updated': (p) => p.locator('.cart-count').isVisible(),
          });
        }
      } catch (error) {
        console.log(`VU ${__VU} - Cart error at ${currentLoad} VUs: ${error.message}`);
        errorRate.add(1);
        
        if (currentLoad > 25) {
          breakpointReached.add(1);
        }
      }
      
      sleep(1);
    });

    // Group 3: View cart (final verification)
    group('view cart', () => {
      try {
        await page.locator('a:has-text("Cart")').click();
        await page.waitForSelector('.cart-items', { timeout: 8000 });
        
        check(page, {
          'cart page accessible': (p) => p.locator('.cart-items').isVisible(),
        });
      } catch (error) {
        console.log(`VU ${__VU} - Cart view error at ${currentLoad} VUs: ${error.message}`);
        errorRate.add(1);
      }
      
      sleep(1);
    });

  } catch (error) {
    console.error(`VU ${__VU} - System failure at ${currentLoad} VUs:`, error.message);
    errorRate.add(1);
    failedNavigations.add(1);
    
    if (currentLoad > 20) {
      breakpointReached.add(1);
    }
  } finally {
    page.close();
  }

  sleep(2);
}

export function handleSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 K6 BROWSER BREAKPOINT TEST SUMMARY');
  console.log('='.repeat(60));

  const metrics = data.metrics;
  
  console.log('\n🎯 Navigation Stats:');
  console.log(`   Successful: ${metrics.successful_navigations?.values.count || 0}`);
  console.log(`   Failed: ${metrics.failed_navigations?.values.count || 0}`);
  console.log(`   Breakpoint Indicators: ${metrics.breakpoint_reached?.values.count || 0}`);
  console.log(`   Success Rate: ${(((metrics.successful_navigations?.values.count || 0) / ((metrics.successful_navigations?.values.count || 0) + (metrics.failed_navigations?.values.count || 1))) * 100).toFixed(2)}%`);

  console.log('\n⚡ Performance Under Load:');
  console.log(`   Avg Page Load: ${metrics.page_load_time?.values.avg?.toFixed(2) || 0}ms`);
  console.log(`   Min: ${metrics.page_load_time?.values.min?.toFixed(2) || 0}ms`);
  console.log(`   Max: ${metrics.page_load_time?.values.max?.toFixed(2) || 0}ms`);
  console.log(`   p(90): ${metrics.page_load_time?.values['p(90)']?.toFixed(2) || 0}ms`);
  console.log(`   p(95): ${metrics.page_load_time?.values['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`   p(99): ${metrics.page_load_time?.values['p(99)']?.toFixed(2) || 0}ms`);

  console.log('\n🔥 System Capacity:');
  console.log(`   Error Rate: ${((metrics.browser_errors?.values.rate || 0) * 100).toFixed(2)}%`);
  console.log(`   Peak VUs Reached: ~40`);

  // Analyze breakpoint
  const errorRateValue = metrics.browser_errors?.values.rate || 0;
  const breakpointIndicators = metrics.breakpoint_reached?.values.count || 0;
  const avgLoadTime = metrics.page_load_time?.values.avg || 0;

  console.log('\n💡 Breakpoint Analysis:');
  
  let estimatedCapacity = 'Unknown';
  let recommendation = '';

  if (errorRateValue < 0.05) {
    estimatedCapacity = '40+ browser VUs';
    recommendation = 'System can handle current load levels. Consider testing higher.';
  } else if (errorRateValue < 0.15) {
    estimatedCapacity = '30-35 browser VUs';
    recommendation = 'System starts degrading around 30-35 VUs.';
  } else if (errorRateValue < 0.30) {
    estimatedCapacity = '20-25 browser VUs';
    recommendation = 'System shows significant issues above 25 VUs.';
  } else {
    estimatedCapacity = '<20 browser VUs';
    recommendation = 'System struggles with browser load. Optimization needed.';
  }

  console.log(`   Estimated Capacity: ${estimatedCapacity}`);
  console.log(`   Breakpoint Reached: ${breakpointIndicators > 5 ? 'YES' : 'NO'}`);

  if (avgLoadTime > 10000) {
    console.log('   Performance: Severe degradation detected');
  } else if (avgLoadTime > 6000) {
    console.log('   Performance: Moderate degradation');
  } else {
    console.log('   Performance: Acceptable');
  }

  console.log('\n📌 Recommendations:');
  console.log(`   ${recommendation}`);
  
  if (breakpointIndicators > 10) {
    console.log('   • Implement auto-scaling for browser workloads');
    console.log('   • Consider optimizing frontend assets');
    console.log('   • Review server resource allocation');
  }
  
  if (errorRateValue > 0.20) {
    console.log('   • System capacity significantly exceeded');
    console.log('   • Reduce concurrent browser users or scale horizontally');
  }

  console.log('\n🎯 Production Recommendation:');
  const safeCapacity = Math.floor(parseInt(estimatedCapacity) * 0.7);
  console.log(`   Safe Operating Capacity: ${safeCapacity > 0 ? safeCapacity : 15} concurrent browser users`);
  console.log('   (70% of maximum to maintain headroom)');

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
