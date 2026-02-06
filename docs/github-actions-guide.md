# GitHub Actions CI/CD for K6 Load Testing - Complete Guide

## Table of Contents
- [Overview](#overview)
- [Workflow Files Structure](#workflow-files-structure)
- [Workflow Types](#workflow-types)
- [Workflow Anatomy](#workflow-anatomy)
- [Trigger Mechanisms](#trigger-mechanisms)
- [Jobs and Steps Explained](#jobs-and-steps-explained)
- [Docker vs Direct Installation](#docker-vs-direct-installation)
- [Artifacts and Reports](#artifacts-and-reports)
- [Scheduling Tests](#scheduling-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

GitHub Actions automates K6 performance tests in CI/CD pipelines. The project includes **14 workflow files** that run different load test types automatically on code changes, schedules, or manual triggers.

### Benefits

- ✅ **Automated Testing**: Run tests on every push or PR
- 📅 **Scheduled Execution**: Weekly/daily performance checks
- 🎯 **Manual Triggers**: Run tests on-demand via GitHub UI
- 📊 **Report Artifacts**: Automatic HTML report generation and storage
- 🔄 **Continuous Monitoring**: Catch performance regressions early
- 🐳 **Docker Support**: Isolated testing environments

---

## Workflow Files Structure

```
.github/
└── workflows/
    ├── smoke-test.yml              # Smoke test (direct K6 install)
    ├── smoke-test-docker.yml       # Smoke test (Docker)
    ├── load-test.yml               # Load test (direct K6 install)
    ├── load-test-docker.yml        # Load test (Docker)
    ├── average-load-test.yml       # Average load test
    ├── average-load-test-docker.yml
    ├── stress-test.yml             # Stress test
    ├── stress-test-docker.yml
    ├── spike-test.yml              # Spike test
    ├── spike-test-docker.yml
    ├── soak-test.yml               # Soak test
    ├── soak-test-docker.yml
    ├── breakpoint-test.yml         # Breakpoint test
    └── breakpoint-test-docker.yml
```

### Workflow Naming Convention

```
<test-type>-test[-docker].yml

Examples:
- smoke-test.yml          → Direct K6 installation
- smoke-test-docker.yml   → Docker-based execution
```

---

## Workflow Types

### 1. Direct Installation Workflows

**Examples:** `smoke-test.yml`, `load-test.yml`, `average-load-test.yml`

**Characteristics:**
- Install K6 directly on GitHub Actions runner (Ubuntu)
- Faster setup time
- Simpler configuration
- Suitable for most test types

**When to Use:**
- Quick smoke tests
- Regular CI/CD checks
- When Docker overhead is unnecessary

---

### 2. Docker-Based Workflows

**Examples:** `smoke-test-docker.yml`, `load-test-docker.yml`

**Characteristics:**
- Run K6 in Docker container
- Application runs in separate Docker container
- Isolated networking environment
- More complex setup but better isolation

**When to Use:**
- Need environment consistency
- Testing Docker-based deployments
- Require network isolation
- Complex multi-service testing

---

## Workflow Anatomy

### Complete Example: Smoke Test Workflow

```yaml
name: Smoke Test

on:
  push:
    branches:
      - smoke-test
      - main
  workflow_dispatch:
  schedule:
    - cron: '15 18 * * 0'

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          node sample-app/server.js &
          sleep 5
          curl http://localhost:3000/api/health

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 smoke test
        run: k6 run k6/smoke.test.js
        continue-on-error: true

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-test-html-report
          path: reports/smoke/smoke-test-report.html

      - name: Generate summary
        if: always()
        run: |
          echo "## 🔍 Smoke Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Download the HTML report artifact to view detailed results." >> $GITHUB_STEP_SUMMARY
```

---

## Trigger Mechanisms

### 1. Push Triggers

```yaml
on:
  push:
    branches:
      - smoke-test
      - main
```

**What it does:**
- Triggers workflow when code is pushed to specified branches
- Useful for continuous testing on development branches

**Use Case:**
```bash
# Push to main triggers workflow
git push origin main

# Push to specific test branch
git push origin smoke-test
```

---

### 2. Manual Triggers (workflow_dispatch)

```yaml
on:
  workflow_dispatch:
```

**What it does:**
- Allows manual workflow execution from GitHub UI
- No parameters or code changes needed

**How to Use:**
1. Go to **Actions** tab in GitHub
2. Select workflow (e.g., "Smoke Test")
3. Click **"Run workflow"**
4. Choose branch
5. Click **"Run workflow"** button

**Benefits:**
- Run tests on-demand
- Test before deployment
- Debug specific scenarios

---

### 3. Scheduled Triggers (cron)

```yaml
on:
  schedule:
    - cron: '15 18 * * 0'
```

**Cron Syntax:**
```
┌───────────── minute (0 - 59)
│ ┌─────────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌─────── month (1 - 12)
│ │ │ │ ┌───── day of week (0 - 6) (Sunday - Saturday)
│ │ │ │ │
* * * * *
```

**Example: `'15 18 * * 0'`**
- `15` = 15 minutes
- `18` = 6:00 PM UTC
- `*` = Every day of month
- `*` = Every month
- `0` = Sunday (0 = Sunday, 1 = Monday, etc.)

**Result:** Runs every Sunday at 6:15 PM UTC (12:00 AM NPT)

**Common Patterns:**

| Pattern | Description | Example |
|---------|-------------|---------|
| `'0 0 * * *'` | Daily at midnight UTC | Performance baseline |
| `'0 12 * * 1-5'` | Weekdays at noon UTC | Business hours test |
| `'*/30 * * * *'` | Every 30 minutes | Continuous monitoring |
| `'0 0 * * 0'` | Weekly on Sunday | Weekly regression |
| `'0 2 1 * *'` | Monthly on 1st at 2 AM | Monthly audit |

**Tools:**
- [Crontab.guru](https://crontab.guru) - Visualize cron schedules

---

### 4. Pull Request Triggers (Optional)

```yaml
on:
  pull_request:
    branches:
      - main
    types:
      - opened
      - synchronize
```

**When to Add:**
- Validate performance before merging
- Catch regressions in PRs
- Ensure code changes don't degrade performance

---

## Jobs and Steps Explained

### Job Definition

```yaml
jobs:
  smoke-test:              # Job ID (unique identifier)
    runs-on: ubuntu-latest # Runner environment
    
    steps:
      # ... steps here
```

**`runs-on` Options:**

| Option | OS | Use Case |
|--------|----|----|
| `ubuntu-latest` | Ubuntu 22.04 | General purpose (used in all workflows) |
| `ubuntu-20.04` | Ubuntu 20.04 | Legacy compatibility |
| `windows-latest` | Windows Server 2022 | Windows-specific tests |
| `macos-latest` | macOS 12 | macOS-specific tests |

---

### Step 1: Checkout Code

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**What it does:**
- Clones repository to GitHub Actions runner
- Makes all files available for subsequent steps

**Version:** `@v4` is latest stable version

**Required:** Yes (always first step)

---

### Step 2: Setup Node.js

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
```

**What it does:**
- Installs specified Node.js version
- Sets up npm/yarn/pnpm

**`node-version` Options:**
- `'22'` - Latest Node.js 22.x
- `'20'` - Latest Node.js 20.x (LTS)
- `'18.16.0'` - Specific version

**Why Node.js?**
Sample application (`sample-app/server.js`) requires Node.js to run.

---

### Step 3: Install Dependencies

```yaml
- name: Install dependencies
  run: npm ci
```

**`npm ci` vs `npm install`:**

| Command | Use Case | Speed | Behavior |
|---------|----------|-------|----------|
| `npm ci` | CI/CD environments | Faster | Clean install from `package-lock.json` |
| `npm install` | Development | Slower | May update `package-lock.json` |

**Why `npm ci`?**
- ✅ Deterministic installs (reproducible)
- ✅ Faster in CI environments
- ✅ Fails if `package-lock.json` is out of sync

---

### Step 4: Start Application

```yaml
- name: Start application
  run: |
    node sample-app/server.js &
    sleep 5
    curl http://localhost:3000/api/health
```

**Line-by-Line:**

```bash
node sample-app/server.js &
# Start Node.js server in background (&)

sleep 5
# Wait 5 seconds for server to fully start

curl http://localhost:3000/api/health
# Verify server is responding (health check)
```

**`&` Symbol:**
- Runs process in background
- Allows workflow to continue to next command
- Without `&`, step would hang waiting for server to exit

**Health Check:**
- Ensures server is ready before running tests
- Fails workflow early if application doesn't start
- Prevents wasted time running tests against dead server

---

### Step 5: Install K6 (Direct Installation)

```yaml
- name: Install k6
  run: |
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
```

**What it does:**

1. **Add K6 repository GPG key** (for package verification)
2. **Add K6 apt repository** to sources
3. **Update package list**
4. **Install K6**

**Commands Explained:**

```bash
# 1. Initialize GPG
sudo gpg -k

# 2. Import K6's GPG key
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

# 3. Add K6 apt repository
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list

# 4. Update and install
sudo apt-get update
sudo apt-get install k6
```

**Alternative (Snap):**
```yaml
- name: Install k6
  run: sudo snap install k6
```

---

### Step 6: Run K6 Test

```yaml
- name: Run k6 smoke test
  run: k6 run k6/smoke.test.js
  continue-on-error: true
```

**Command:** `k6 run k6/smoke.test.js`
- Executes K6 test script
- Generates HTML and JSON reports (via `handleSummary`)

**`continue-on-error: true`:**
- Workflow continues even if test fails
- Allows report upload even on test failure
- Essential for capturing failure details

**Without `continue-on-error`:**
```
Test Fails → Workflow Stops → No Report Uploaded ❌
```

**With `continue-on-error`:**
```
Test Fails → Workflow Continues → Report Uploaded ✅
```

---

### Step 7: Upload Report Artifact

```yaml
- name: Upload HTML report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: smoke-test-html-report
    path: reports/smoke/smoke-test-report.html
```

**`if: always()`:**
- Runs step regardless of previous step status
- Ensures report is uploaded even if test fails

**`uses: actions/upload-artifact@v4`:**
- GitHub Action for storing build artifacts
- Preserves files generated during workflow

**`with` Parameters:**

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `name` | Artifact name in GitHub UI | `smoke-test-html-report` |
| `path` | File/folder to upload | `reports/smoke/smoke-test-report.html` |

**Accessing Artifacts:**
1. Go to **Actions** tab
2. Click on workflow run
3. Scroll to **Artifacts** section
4. Download ZIP file containing report

**Retention:**
- Default: 90 days
- Configurable in repository settings

---

### Step 8: Generate Summary

```yaml
- name: Generate summary
  if: always()
  run: |
    echo "## 🔍 Smoke Test Results" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "Download the HTML report artifact to view detailed results." >> $GITHUB_STEP_SUMMARY
```

**`$GITHUB_STEP_SUMMARY`:**
- Special GitHub Actions environment variable
- Content appears in workflow run summary page
- Supports Markdown formatting

**Result:**
Creates a summary box on workflow page:

```markdown
## 🔍 Smoke Test Results

Download the HTML report artifact to view detailed results.
```

**Enhanced Summary (Optional):**
```yaml
- name: Generate summary
  if: always()
  run: |
    echo "## 📊 Average Load Test Results" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "**Test Type:** Average Load Test" >> $GITHUB_STEP_SUMMARY
    echo "**Duration:** 16 minutes" >> $GITHUB_STEP_SUMMARY
    echo "**Virtual Users:** 20-40" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### 📥 Download Report" >> $GITHUB_STEP_SUMMARY
    echo "Download the HTML report artifact to view detailed results." >> $GITHUB_STEP_SUMMARY
```

---

## Docker vs Direct Installation

### Direct Installation Workflow

**Pros:**
- ✅ Faster setup (no Docker overhead)
- ✅ Simpler configuration
- ✅ Direct access to filesystem
- ✅ Lower resource usage

**Cons:**
- ❌ Less isolation
- ❌ OS-dependent
- ❌ Harder to replicate locally

**Best For:**
- Smoke tests
- Quick CI checks
- Simple applications

---

### Docker-Based Workflow

**Example: `smoke-test-docker.yml`**

```yaml
- name: Create Docker network
  run: docker network create k6-network

- name: Start application in Docker
  run: |
    docker run -d \
      --name sample-app \
      --network k6-network \
      -p 3000:3000 \
      -w /app \
      -v ${{ github.workspace }}:/app \
      node:22-alpine \
      sh -c "npm ci && node sample-app/server.js"

- name: Update baseUrl for Docker network
  run: |
    sed -i 's|http://localhost:3000|http://sample-app:3000|g' fixture/common.config.json

- name: Run k6 smoke test in Docker
  run: |
    docker run --rm \
      --network k6-network \
      -v ${{ github.workspace }}:/workspace \
      -w /workspace \
      --user $(id -u):$(id -g) \
      grafana/k6:latest \
      run k6/smoke.test.js
```

**Key Differences:**

#### 1. Docker Network

```yaml
- name: Create Docker network
  run: docker network create k6-network
```

**Purpose:**
- Allows containers to communicate
- `sample-app` and `k6` containers on same network
- Isolated from host network

---

#### 2. Application in Docker

```yaml
docker run -d \
  --name sample-app \
  --network k6-network \
  -p 3000:3000 \
  -w /app \
  -v ${{ github.workspace }}:/app \
  node:22-alpine \
  sh -c "npm ci && node sample-app/server.js"
```

**Flags Explained:**

| Flag | Purpose | Example |
|------|---------|---------|
| `-d` | Run in detached mode (background) | Container runs as daemon |
| `--name sample-app` | Container name | Reference by name in network |
| `--network k6-network` | Join Docker network | Enable inter-container communication |
| `-p 3000:3000` | Port mapping (host:container) | Access from GitHub runner |
| `-w /app` | Working directory inside container | Set context for commands |
| `-v ${{ github.workspace }}:/app` | Mount workspace as volume | Share code with container |
| `node:22-alpine` | Docker image | Lightweight Node.js image |
| `sh -c "..."` | Command to execute | Install deps and start server |

---

#### 3. Update baseUrl for Docker Network

```yaml
- name: Update baseUrl for Docker network
  run: |
    sed -i 's|http://localhost:3000|http://sample-app:3000|g' fixture/common.config.json
```

**Why Needed?**

**Direct Installation:**
```json
{
  "baseUrl": "http://localhost:3000"
}
```
K6 runs on same host, can access `localhost:3000` ✅

**Docker:**
```json
{
  "baseUrl": "http://sample-app:3000"
}
```
K6 runs in separate container, must use container name `sample-app` ✅

**`sed` Command:**
```bash
sed -i 's|http://localhost:3000|http://sample-app:3000|g' fixture/common.config.json
#     │  └────────┬─────────────┴─────────────────────┘
#     │           │
#     │           └─ Search and replace pattern
#     └─ In-place edit (modify file directly)
```

---

#### 4. K6 in Docker

```yaml
docker run --rm \
  --network k6-network \
  -v ${{ github.workspace }}:/workspace \
  -w /workspace \
  --user $(id -u):$(id -g) \
  grafana/k6:latest \
  run k6/smoke.test.js
```

**Flags Explained:**

| Flag | Purpose |
|------|---------|
| `--rm` | Remove container after execution |
| `--network k6-network` | Join same network as app |
| `-v ${{ github.workspace }}:/workspace` | Mount workspace (test files) |
| `-w /workspace` | Set working directory |
| `--user $(id -u):$(id -g)` | Run as current user (file permissions) |
| `grafana/k6:latest` | Official K6 Docker image |
| `run k6/smoke.test.js` | K6 command |

**User Permissions:**
```bash
--user $(id -u):$(id -g)
#      └─┬──┘  └──┬───┘
#        │        └─ Group ID
#        └─ User ID
```

Without this, files created by K6 (reports) would be owned by root, causing permission errors.

---

#### 5. Cleanup

```yaml
- name: Stop and remove containers
  if: always()
  run: |
    docker stop sample-app || true
    docker rm sample-app || true
    docker network rm k6-network || true
```

**`|| true`:**
- Prevents step from failing if container/network doesn't exist
- Ensures cleanup always succeeds

---

### Docker Workflow Pros/Cons

**Pros:**
- ✅ Complete isolation
- ✅ Replicable environment
- ✅ Consistent across platforms
- ✅ Network isolation testing
- ✅ Easy to add services (DB, Redis, etc.)

**Cons:**
- ❌ Slower setup time
- ❌ More complex configuration
- ❌ Higher resource usage
- ❌ Additional cleanup needed

---

## Artifacts and Reports

### Artifact Upload

```yaml
- name: Upload HTML report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: smoke-test-html-report
    path: reports/smoke/smoke-test-report.html
```

### Artifact Structure

```
Workflow Run
└── Artifacts
    ├── smoke-test-html-report.zip
    │   └── smoke-test-report.html
    ├── load-test-html-report.zip
    │   └── load-test-report.html
    └── average-load-test-html-report.zip
        └── average-load-test-report.html
```

### Accessing Reports

**Method 1: GitHub UI**
1. Navigate to **Actions** tab
2. Click on workflow run
3. Scroll to **Artifacts** section
4. Click artifact name to download

**Method 2: GitHub CLI**
```bash
# List artifacts
gh run view <run-id> --log-failed

# Download artifact
gh run download <run-id> -n smoke-test-html-report
```

**Method 3: API**
```bash
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <TOKEN>" \
  https://api.github.com/repos/<owner>/<repo>/actions/artifacts
```

---

## Scheduling Tests

### Strategy by Test Type

| Test Type | Recommended Schedule | Cron Expression | Reasoning |
|-----------|---------------------|-----------------|-----------|
| **Smoke** | Every push + daily | `'0 0 * * *'` | Catch basic issues quickly |
| **Load** | Daily off-hours | `'0 2 * * *'` | When traffic is low |
| **Average Load** | Weekly | `'15 18 * * 0'` | Sunday evening baseline |
| **Stress** | Weekly | `'0 3 * * 6'` | Saturday night (low usage) |
| **Spike** | Weekly | `'0 4 * * 0'` | Sunday morning |
| **Soak** | Monthly | `'0 0 1 * *'` | 1st of month (long duration) |
| **Breakpoint** | On-demand | Manual only | Resource intensive |

### Multiple Schedules

```yaml
on:
  schedule:
    - cron: '0 0 * * *'   # Daily at midnight
    - cron: '0 12 * * 1'  # Monday at noon
    - cron: '0 18 * * 5'  # Friday at 6 PM
```

---

## Best Practices

### 1. Use Appropriate Test Triggers

```yaml
# ✅ GOOD: Smoke test on every push
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

# ❌ BAD: Soak test on every push (too slow)
on:
  push:
    branches: [main]  # 4-hour test on every push!
```

---

### 2. Always Upload Reports on Failure

```yaml
# ✅ GOOD: continue-on-error + if: always()
- name: Run k6 test
  run: k6 run k6/load.test.js
  continue-on-error: true

- name: Upload HTML report
  if: always()  # Runs even if test failed
  uses: actions/upload-artifact@v4
```

---

### 3. Health Check Before Testing

```yaml
# ✅ GOOD: Verify app is running
- name: Start application
  run: |
    node sample-app/server.js &
    sleep 5
    curl -f http://localhost:3000/api/health || exit 1
```

**`-f` flag:** Fails on HTTP errors (4xx, 5xx)

---

### 4. Use Secrets for Production URLs

```yaml
# In workflow
- name: Run k6 test
  env:
    BASE_URL: ${{ secrets.PRODUCTION_API_URL }}
  run: k6 run k6/load.test.js
```

```javascript
// In test file
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
```

**Set Secret:**
1. Go to repository **Settings**
2. **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Name: `PRODUCTION_API_URL`
5. Value: `https://api.production.com`

---

### 5. Cache Dependencies

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'  # Cache npm dependencies
```

**Benefits:**
- Faster workflow execution
- Reduced bandwidth
- Consistent dependency versions

---

### 6. Timeout Long-Running Tests

```yaml
jobs:
  soak-test:
    runs-on: ubuntu-latest
    timeout-minutes: 300  # 5 hours max
```

**Prevents:**
- Infinite loops
- Hung processes
- Billing surprises

---

### 7. Use Job Matrices for Multiple Environments

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-type: [smoke, load, stress]
    steps:
      - name: Run test
        run: k6 run k6/${{ matrix.test-type }}.test.js
```

**Result:** Runs 3 parallel jobs (smoke, load, stress)

---

### 8. Add Notifications

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Load test failed! Check artifacts for details.'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Troubleshooting

### Problem: K6 Installation Fails

**Error:**
```
E: Unable to locate package k6
```

**Solution:**
Ensure GPG key and repository are added correctly:
```yaml
- name: Install k6
  run: |
    curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
    echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
```

---

### Problem: Application Not Starting

**Error:**
```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```

**Solution:**
Increase wait time and add better health check:
```yaml
- name: Start application
  run: |
    node sample-app/server.js &
    
- name: Wait for app to be ready
  run: |
    for i in {1..30}; do
      if curl -f http://localhost:3000/api/health; then
        echo "✅ App is ready"
        exit 0
      fi
      echo "Waiting for app... attempt $i/30"
      sleep 2
    done
    echo "❌ App failed to start"
    exit 1
```

---

### Problem: Report Not Generated

**Error:**
```
⚠️ HTML report not found
```

**Solution:**
Ensure reports directory exists:
```yaml
- name: Create reports directory
  run: mkdir -p reports/smoke

- name: Run k6 test
  run: k6 run k6/smoke.test.js

- name: Verify report exists
  run: |
    if [ ! -f "reports/smoke/smoke-test-report.html" ]; then
      echo "❌ Report not generated"
      ls -R reports/
      exit 1
    fi
```

---

### Problem: Docker Permission Denied

**Error:**
```
permission denied while trying to connect to Docker daemon
```

**Solution:**
Ensure user has Docker permissions:
```yaml
- name: Fix Docker permissions
  run: |
    sudo usermod -aG docker $USER
    newgrp docker
```

Or use `sudo`:
```yaml
- name: Run k6 in Docker
  run: sudo docker run --rm grafana/k6:latest run k6/smoke.test.js
```

---

### Problem: Network Timeout in Docker

**Error:**
```
ERRO[0005] Post "http://sample-app:3000/api/products": dial tcp: lookup sample-app on 127.0.0.11:53: no such host
```

**Solution:**
Verify Docker network is created and both containers are on it:
```yaml
- name: Create Docker network
  run: docker network create k6-network

- name: Start app
  run: |
    docker run -d --name sample-app --network k6-network ...

- name: Verify network
  run: docker network inspect k6-network

- name: Run K6
  run: |
    docker run --rm --network k6-network ...
```

---

### Problem: Workflow Triggered Too Often

**Issue:** Workflow runs on every commit to `main`

**Solution:**
Use path filters to trigger only on relevant changes:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'k6/**'
      - 'fixture/**'
      - 'sample-app/**'
      - '.github/workflows/smoke-test.yml'
```

**Result:** Only triggers when test files or configs change

---

## Summary

### Workflow Execution Flow

```
Trigger (Push/Schedule/Manual)
    ↓
Checkout Code
    ↓
Setup Environment (Node.js)
    ↓
Install Dependencies (npm ci)
    ↓
Start Application (Background)
    ↓
Install K6 (or use Docker)
    ↓
Run K6 Test (generate reports)
    ↓
Upload Report Artifact
    ↓
Generate Summary
    ↓
Cleanup (Docker only)
```

### Key Takeaways

1. ✅ **14 workflow files** covering all test types
2. ✅ **Two approaches**: Direct install vs Docker
3. ✅ **Three triggers**: Push, manual, scheduled
4. ✅ **Artifacts preserved** for 90 days
5. ✅ **`continue-on-error`** ensures reports upload on failure
6. ✅ **`if: always()`** runs cleanup and uploads regardless of status
7. ✅ **Cron schedules** automate regular testing
8. ✅ **Docker isolation** for complex scenarios
9. ✅ **Health checks** prevent wasted test runs
10. ✅ **Summaries** provide quick insights

---

## Next Steps

1. Review existing workflow files in `.github/workflows/`
2. Understand trigger mechanisms for your use case
3. Choose between direct vs Docker approach
4. Set up scheduled tests for regular monitoring
5. Configure Slack/email notifications for failures
6. Implement secrets for production testing
7. Optimize workflows with caching

**Related Files:**
- [.github/workflows/smoke-test.yml](../.github/workflows/smoke-test.yml)
- [.github/workflows/smoke-test-docker.yml](../.github/workflows/smoke-test-docker.yml)
- [All workflow files](../.github/workflows/)
