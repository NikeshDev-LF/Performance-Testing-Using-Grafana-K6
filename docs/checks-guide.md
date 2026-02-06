# K6 Checks - Comprehensive Guide

## Table of Contents
- [What Are Checks?](#what-are-checks)
- [How Checks Are Generated](#how-checks-are-generated)
- [Check Syntax and Structure](#check-syntax-and-structure)
- [All Checks Explained](#all-checks-explained)
  - [Products Endpoint Checks](#products-endpoint-checks)
  - [Add to Cart Checks](#add-to-cart-checks)
  - [View Cart Checks](#view-cart-checks)
  - [Checkout Process Checks](#checkout-process-checks)
- [Check vs Threshold](#check-vs-threshold)
- [Best Practices](#best-practices)

---

## What Are Checks?

**Checks** are assertions in K6 that validate whether specific conditions are met during test execution. Unlike thresholds (which determine pass/fail of entire test), checks allow you to:

- Validate response data quality
- Verify API behavior under load
- Track success rates for specific validations
- Identify patterns in failures

**Key Characteristics:**
- ✅ Checks do **NOT** stop test execution on failure
- 📊 Results are aggregated and reported as pass/fail counts
- 🎯 Multiple checks can run on a single HTTP request
- 📈 Success rates are calculated: `(passes / total) * 100`

---

## How Checks Are Generated

### 1. **Basic Syntax**

```javascript
check(response, {
    'check name': (r) => condition_returns_boolean,
    'another check': (r) => another_condition,
});
```

### 2. **Execution Flow**

```
HTTP Request → Response → check() Function → Evaluate Conditions → Record Results
                              ↓
                    Multiple checks evaluated
                              ↓
                    Pass/Fail counted separately
                              ↓
                    Aggregated in final report
```

### 3. **In Your Test File**

Located in: `k6/average-load.test.js`

```javascript
// Example from your code
const response = http.get(`${BASE_URL}/api/products`);

check(response, {
    'products loaded': (r) => r.status === 200,
    'status not 5xx': (r) => r.status < 500,
    'valid JSON response': (r) => {
        try {
            JSON.parse(r.body);
            return true;
        } catch {
            return false;
        }
    },
});
```

### 4. **Result Generation**

Each check generates:
- **Check Name**: The descriptive label
- **Passes**: Count of successful validations
- **Failures**: Count of failed validations
- **Success Rate**: `(passes / (passes + failures)) * 100%`

---

## Check Syntax and Structure

### Return Value Requirements

```javascript
// ✅ CORRECT - Returns boolean
'check name': (r) => r.status === 200

// ✅ CORRECT - Returns boolean after logic
'check name': (r) => {
    const data = JSON.parse(r.body);
    return data.length > 0;
}

// ❌ WRONG - Returns undefined
'check name': (r) => {
    console.log(r.status);
}

// ❌ WRONG - Returns object instead of boolean
'check name': (r) => JSON.parse(r.body)
```

### Conditional Checks

```javascript
// Only validate if response is successful
'order id is valid': (r) => {
    if (r.status === 200) {
        return JSON.parse(r.body).data.id.length > 0;
    }
    return true;  // Skip check if not 200
}
```

---

## All Checks Explained

### Products Endpoint Checks

#### **HTTP Status Validation**

| Check Name | Purpose | Pass Condition | Why It Matters |
|------------|---------|----------------|----------------|
| `products loaded` | Verify successful response | `r.status === 200` | HTTP 200 means request succeeded |
| `products - status not 5xx` | Check no server errors | `r.status < 500` | 5xx indicates server-side failures |
| `no timeout error` | Ensure no timeout | `r.status !== 0` | Status 0 means network timeout/failure |

**Example:**
```javascript
'products loaded': (r) => r.status === 200,
// Returns true when HTTP status is exactly 200 (OK)
// Returns false for 404, 500, etc.
```

---

#### **Response Time Validation**

| Check Name | Purpose | Pass Condition | Target Time |
|------------|---------|----------------|-------------|
| `products response time OK` | Meet config threshold | `r.timings.duration < config.thresholdLimits.productsResponseTime` | Variable (config) |
| `products - response time < 500ms` | Fast response target | `r.timings.duration < 500` | 500ms |
| `products - response time < 1s` | Acceptable response | `r.timings.duration < 1000` | 1000ms (1 second) |

**`r.timings.duration`**: Total time from request start to response complete (in milliseconds)

**Why Multiple Time Checks?**
- **Config threshold**: Business requirement
- **500ms check**: Fast user experience
- **1s check**: Maximum acceptable delay

---

#### **JSON & Content Validation**

| Check Name | Purpose | How It Works |
|------------|---------|--------------|
| `products - valid JSON response` | Parseable JSON | Try parsing `r.body`, catch exceptions |
| `products - content-type is JSON` | Correct header | `r.headers['Content-Type']?.includes('application/json')` |
| `response not empty` | Non-empty body | `r.body.length > 0` |

**Example:**
```javascript
'products - valid JSON response': (r) => {
    try {
        JSON.parse(r.body);  // Attempt to parse
        return true;          // Success = valid JSON
    } catch {
        return false;         // Parse error = invalid JSON
    }
}
```

---

#### **Business Logic Validation**

| Check Name | Validates | Condition |
|------------|-----------|-----------|
| `products data exists` | Response has data field | `JSON.parse(r.body).data !== undefined` |
| `products array not empty` | Data contains items | `JSON.parse(r.body).data.length > 0` |
| `each product has id` | All products have IDs | `JSON.parse(r.body).data.every(p => p.id)` |
| `each product has name` | All products named | `JSON.parse(r.body).data.every(p => p.name)` |
| `each product has price` | All products priced | `JSON.parse(r.body).data.every(p => p.price > 0)` |
| `each product has stock` | All have stock info | `JSON.parse(r.body).data.every(p => p.stock >= 0)` |

**`.every()` Method:**
```javascript
'each product has id': (r) => JSON.parse(r.body).data.every(p => p.id)
// Returns true only if ALL items in array have an 'id' property
// Returns false if even ONE item is missing 'id'
```

**Expected Response Structure:**
```json
{
  "data": [
    {
      "id": "prod-1",
      "name": "Product Name",
      "price": 29.99,
      "stock": 100
    }
  ]
}
```

---

#### **Security Checks**

| Check Name | Purpose | Detection Logic |
|------------|---------|-----------------|
| `no SQL errors exposed` | No SQL error leaks | `!r.body.toLowerCase().includes('sql')` |
| `no stack traces leaked` | No error traces | `!r.body.includes(' at ') && !r.body.includes('Error:')` |
| `no sensitive data in response` | No credentials exposed | Check for 'password', 'secret', 'apikey' |

**Why These Matter:**
- **SQL errors**: Expose database structure to attackers
- **Stack traces**: Reveal file paths, code structure
- **Sensitive data**: Security vulnerability

**Example:**
```javascript
'no sensitive data in response': (r) => {
    const body = r.body.toLowerCase();
    return !body.includes('password') && 
           !body.includes('secret') && 
           !body.includes('apikey');
}
```

---

### Add to Cart Checks

#### **HTTP Status Validation**

| Check Name | Purpose | Pass Condition |
|------------|---------|----------------|
| `product added to cart` | Successful addition | `r.status === 200` |
| `add to cart - status not 5xx` | No server errors | `r.status < 500` |

---

#### **Response Time Validation**

| Check Name | Purpose | Target |
|------------|---------|--------|
| `add to cart - response time OK` | Meet threshold | Config value |
| `add to cart < 500ms` | Fast response | 500ms |

---

#### **JSON Validation**

| Check Name | Purpose |
|------------|---------|
| `add to cart - valid JSON response` | Parseable JSON |
| `add to cart - content-type is JSON` | Correct content type |

---

#### **Business Logic - Cart Item Validation**

| Check Name | Validates | Conditional Logic |
|------------|-----------|-------------------|
| `returns cart item data` | Has data field | `r.status === 200 ? JSON.parse(r.body).data !== undefined : true` |
| `cart item has id` | Item has ID | Only when status 200 |
| `correct product id returned` | Product ID matches request | `JSON.parse(r.body).data.productId === randomProduct.id` |
| `correct quantity returned` | Quantity matches request | `JSON.parse(r.body).data.quantity === requestedQty` |

**Conditional Logic Explained:**
```javascript
'cart item has id': (r) => {
    if (r.status === 200) {
        return JSON.parse(r.body).data.id !== undefined;
    }
    return true;  // Don't fail check if request wasn't successful
}
```

**Why Conditional?**
- If request fails (400, 500), these business checks shouldn't fail
- Focuses validation on successful operations only
- Prevents cascading failures in metrics

**Expected Response:**
```json
{
  "data": {
    "id": "cart-item-123",
    "productId": "prod-5",
    "quantity": 2,
    "price": 29.99
  }
}
```

---

#### **Error Handling**

| Check Name | Purpose | Logic |
|------------|---------|-------|
| `add to cart - proper error format on failure` | Structured errors | Verify `error` or `message` field exists when status ≥ 400 |

```javascript
'add to cart - proper error format on failure': (r) => {
    if (r.status >= 400) {
        const body = JSON.parse(r.body);
        return body.error !== undefined || body.message !== undefined;
    }
    return true;  // Pass if no error
}
```

---

### View Cart Checks

#### **HTTP Status Validation**

| Check Name | Purpose |
|------------|---------|
| `cart retrieved` | Successful fetch (200) |
| `view cart - status not 5xx` | No server errors |

---

#### **Response Time Validation**

| Check Name | Target |
|------------|--------|
| `view cart - response time OK` | Config threshold |
| `cart retrieval < 500ms` | 500ms |

---

#### **JSON Validation**

| Check Name | Purpose |
|------------|---------|
| `view cart - valid JSON response` | Parseable JSON |
| `view cart - content-type is JSON` | Correct header |

---

#### **Business Logic - Cart Structure**

| Check Name | Validates | Description |
|------------|-----------|-------------|
| `cart has data property` | Response structure | `JSON.parse(r.body).data !== undefined` |
| `cart has items` | Non-empty cart | `JSON.parse(r.body).data.length > 0` |
| `each item has id` | Item IDs present | `data.every(item => item.id)` |
| `each item has productId` | Product references | `data.every(item => item.productId)` |
| `each item has quantity` | Quantities valid | `data.every(item => item.quantity > 0)` |
| `each item has price` | Prices present | `data.every(item => item.price > 0)` |

**Expected Cart Structure:**
```json
{
  "data": [
    {
      "id": "cart-item-1",
      "productId": "prod-5",
      "quantity": 2,
      "price": 29.99
    },
    {
      "id": "cart-item-2",
      "productId": "prod-8",
      "quantity": 1,
      "price": 49.99
    }
  ],
  "total": 109.97
}
```

---

#### **Cart Total Calculation Validation**

| Check Name | Purpose | Logic |
|------------|---------|-------|
| `cart total exists` | Total field present | `cart.total !== undefined` |
| `cart total matches items` | Correct calculation | Sum all `price * quantity`, compare with `cart.total` |

**Calculation Logic:**
```javascript
'cart total matches items': (r) => {
    const cart = JSON.parse(r.body);
    if (!cart.total || !cart.data) return false;
    
    // Calculate expected total
    const calculatedTotal = cart.data.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0);
    
    // Allow 0.01 difference for floating point precision
    return Math.abs(cart.total - calculatedTotal) < 0.01;
}
```

**Why 0.01 tolerance?** 
JavaScript floating-point arithmetic can have tiny rounding errors:
```javascript
// Example: 0.1 + 0.2 = 0.30000000000000004 (not exactly 0.3)
```

---

### Checkout Process Checks

#### **HTTP Status Validation**

| Check Name | Purpose |
|------------|---------|
| `checkout successful` | Order created (200) |
| `checkout - status not 5xx` | No server errors |

---

#### **Response Time Validation**

| Check Name | Target |
|------------|--------|
| `checkout response time OK` | Config threshold |
| `checkout < 1s` | 1000ms (1 second) |

---

#### **JSON Validation**

| Check Name | Purpose |
|------------|---------|
| `checkout - valid JSON response` | Parseable JSON |
| `checkout - content-type is JSON` | Correct header |

---

#### **Business Logic - Order Validation**

| Check Name | Validates | Conditional | Description |
|------------|-----------|-------------|-------------|
| `order created` | Order has ID | Status 200 only | `JSON.parse(r.body).data.id !== undefined` |
| `order id is valid` | Non-empty ID | Status 200 only | `JSON.parse(r.body).data.id.length > 0` |
| `order has timestamp` | Creation time | Status 200 only | `data.timestamp !== undefined` |
| `order total exists` | Total present | Status 200 only | `data.total !== undefined` |
| `order total matches cart` | Correct amount | Status 200 only | Compare with pre-checkout cart total |
| `order has items` | Items array | Status 200 only | `data.items !== undefined` |
| `order items preserved` | Item count matches | Status 200 only | `data.items.length === cartItemCount` |
| `order has customer info` | Customer data | Status 200 only | `data.customerInfo !== undefined` |

**Pre-Checkout Cart Fetch:**
```javascript
// Get cart state BEFORE checkout
const cartResponse = http.get(`${BASE_URL}/api/cart/${sessionId}`);
const cartTotal = cartResponse.status === 200 ? JSON.parse(cartResponse.body).total : 0;
const cartItemCount = cartResponse.status === 200 ? JSON.parse(cartResponse.body).data.length : 0;

// Then checkout
const response = http.post(`${BASE_URL}/api/checkout/${sessionId}`, ...);

// Validate order matches cart
'order total matches cart': (r) => {
    if (r.status === 200) {
        return Math.abs(JSON.parse(r.body).data.total - cartTotal) < 0.01;
    }
    return true;
}
```

**Expected Order Structure:**
```json
{
  "data": {
    "id": "order-abc123",
    "timestamp": "2026-02-06T15:09:38Z",
    "total": 109.97,
    "items": [
      {
        "productId": "prod-5",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "customerInfo": {
      "name": "User 1",
      "email": "user1@example.com",
      "phone": "1234561",
      "address": "1 Test Street"
    }
  }
}
```

---

#### **Error Handling**

| Check Name | Purpose | Logic |
|------------|---------|-------|
| `checkout - proper error format on failure` | Structured errors | Has `error` or `message` when status ≥ 400 |
| `checkout - error message is meaningful` | Non-empty message | `(body.message || body.error || '').length > 0` |

```javascript
'checkout - error message is meaningful': (r) => {
    if (r.status >= 400) {
        const body = JSON.parse(r.body);
        // Get message or error field, default to empty string
        // Check that it has content
        return (body.message || body.error || '').length > 0;
    }
    return true;  // Pass if no error occurred
}
```

**Good Error Response:**
```json
{
  "error": "Cart is empty. Cannot proceed with checkout.",
  "statusCode": 400
}
```

**Bad Error Response:**
```json
{
  "error": "",  // Empty - fails 'error message is meaningful'
  "statusCode": 400
}
```

---

## Check vs Threshold

### Checks
- ✅ **Validate individual requests**
- 📊 **Report pass/fail counts**
- 🔄 **Do NOT stop test execution**
- 📈 **Show trends and patterns**

### Thresholds
- 🎯 **Set pass/fail criteria for entire test**
- ❌ **Can abort test early**
- 📊 **Aggregate metrics**
- 🚨 **Determine overall test status**

**Example:**

```javascript
// CHECK - validates this specific request
check(response, {
    'status is 200': (r) => r.status === 200,  // Pass or fail for THIS request
});

// THRESHOLD - defines test-wide criteria
export const options = {
    thresholds: {
        'checks': ['rate>0.95'],  // Overall test fails if <95% checks pass
        'http_req_duration': ['p(95)<400'],  // 95th percentile must be under 400ms
    },
};
```

---

## Best Practices

### 1. **Name Checks Descriptively**

```javascript
// ❌ BAD
'check 1': (r) => r.status === 200

// ✅ GOOD
'products loaded successfully': (r) => r.status === 200
```

### 2. **Use Unique Names Per Endpoint**

```javascript
// ❌ BAD - Duplicate name
check(productsResponse, { 'status not 5xx': (r) => r.status < 500 });
check(cartResponse, { 'status not 5xx': (r) => r.status < 500 });  // Same name!

// ✅ GOOD - Unique names
check(productsResponse, { 'products - status not 5xx': (r) => r.status < 500 });
check(cartResponse, { 'cart - status not 5xx': (r) => r.status < 500 });
```

### 3. **Layer Checks from Basic to Complex**

```javascript
check(response, {
    // Layer 1: HTTP basics
    'status is 200': (r) => r.status === 200,
    
    // Layer 2: Content type
    'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    
    // Layer 3: Structure
    'has data field': (r) => JSON.parse(r.body).data !== undefined,
    
    // Layer 4: Business logic
    'all items have prices': (r) => JSON.parse(r.body).data.every(item => item.price > 0),
});
```

### 4. **Use Conditional Checks for Error Cases**

```javascript
// Only validate business logic on successful responses
'order id is valid': (r) => {
    if (r.status === 200) {
        return JSON.parse(r.body).data.id.length > 0;
    }
    return true;  // Skip validation if request failed
}
```

### 5. **Always Return Boolean**

```javascript
// ❌ WRONG
'check': (r) => {
    console.log(r.status);  // Returns undefined
}

// ✅ CORRECT
'check': (r) => {
    console.log(r.status);
    return r.status === 200;  // Returns boolean
}
```

### 6. **Group Related Checks**

```javascript
check(response, {
    // HTTP Status Validation
    'products loaded': (r) => r.status === 200,
    'status not 5xx': (r) => r.status < 500,
    
    // Response Time Validation
    'response time < 500ms': (r) => r.timings.duration < 500,
    
    // Business Logic Validation
    'data exists': (r) => JSON.parse(r.body).data !== undefined,
});
```

### 7. **Handle JSON Parsing Errors**

```javascript
// ❌ RISKY - Will crash if body isn't JSON
'data exists': (r) => JSON.parse(r.body).data !== undefined

// ✅ SAFE - Handle parse errors
'data exists': (r) => {
    try {
        return JSON.parse(r.body).data !== undefined;
    } catch {
        return false;  // Invalid JSON = check fails
    }
}
```

### 8. **Use Security Checks**

Always include checks for:
- No SQL error messages exposed
- No stack traces in responses
- No sensitive data leakage

```javascript
check(response, {
    'no SQL errors': (r) => !r.body.toLowerCase().includes('sql'),
    'no stack traces': (r) => !r.body.includes(' at ') && !r.body.includes('Error:'),
    'no passwords exposed': (r) => !r.body.toLowerCase().includes('password'),
});
```

---

## Reading Check Results

### Report Format

```
Check Name                  | Passes | Failures | Success Rate
---------------------------|--------|----------|-------------
products loaded            | 3128   | 0        | 100.00%
cart item has id           | 709    | 2419     | 22.67%
cart total exists          | 0      | 3128     | 0.00%
```

### Interpreting Results

**100% Success Rate** ✅
- Feature works perfectly under load
- No issues detected

**>90% Success Rate** ⚠️
- Mostly working but occasional failures
- Investigate intermittent issues

**<90% Success Rate** 🚨
- Significant problems
- Critical issue requiring immediate attention

**0% Success Rate** ❌
- Complete failure
- Feature not working or missing

---

## Troubleshooting Failed Checks

### Pattern Recognition

**Same failure count across related checks:**
```
cart has items              | 2419   | 709      | 77.33%
each item has id            | 709    | 2419     | 22.67%
each item has price         | 709    | 2419     | 22.67%
```
👉 Indicates related issue (e.g., cart persistence problem affecting 709 sessions)

**Cascading failures:**
```
cart total exists           | 0      | 3128     | 0.00%
cart total matches items    | 0      | 3128     | 0.00%
```
👉 First check fails, so second always fails (missing feature/field)

**All time checks failing:**
```
response time < 500ms       | 100    | 3028     | 3.20%
response time < 1s          | 500    | 2628     | 16.00%
```
👉 Performance degradation under load

---

## Summary

**Checks are your diagnostic tools** - they validate:
- ✅ HTTP correctness
- 🕒 Performance targets  
- 📋 Data structure integrity
- 🎯 Business logic accuracy
- 🔒 Security compliance

**Use them to:**
- Identify failure patterns
- Measure feature reliability
- Validate API contracts
- Track quality under load
- Debug performance issues

---

**Next Steps:**
- Review your test file: `k6/average-load.test.js`
- Run tests and analyze check reports
- Add checks for any missing validations
- Set thresholds based on check success rates
