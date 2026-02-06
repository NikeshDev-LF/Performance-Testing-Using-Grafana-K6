// import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * Generates a custom HTML report for K6 tests
 * @param {Object} data - K6 summary data
 * @param {string} reportPath - Path where HTML report should be saved
 * @returns {Object} - Summary output object
 */
export function generateHTMLReport(data, reportPath) {
    return {
        'stdout': JSON.stringify(data, null, 2), // Simple JSON output instead of textSummary
        [reportPath]: generateCustomHTMLReport(data),
    };
}

function generateCustomHTMLReport(data) {
    const metrics = data.metrics;
    const testDuration = (data.state.testRunDurationMs / 1000).toFixed(2);
    
    // Calculate overall test status
    let overallStatus = 'PASSED';
    const failedThresholds = [];
    
    Object.entries(metrics).forEach(([name, metric]) => {
        if (metric.thresholds) {
            Object.entries(metric.thresholds).forEach(([threshold, result]) => {
                if (!result.ok) {
                    overallStatus = 'FAILED';
                    failedThresholds.push({ metric: name, threshold, result });
                }
            });
        }
    });

    // Recursively collect all checks from all groups
    function collectChecks(group) {
        let allChecks = [];
        
        // Add checks from current group
        if (group.checks && group.checks.length > 0) {
            allChecks = allChecks.concat(group.checks);
        }
        
        // Recursively collect from child groups
        if (group.groups && group.groups.length > 0) {
            group.groups.forEach(childGroup => {
                allChecks = allChecks.concat(collectChecks(childGroup));
            });
        }
        
        return allChecks;
    }
    
    const allChecks = data.root_group ? collectChecks(data.root_group) : [];

    // Extract endpoint-specific metrics with request counts
    const endpointMetrics = [];
    const endpointMap = new Map();
    
    // Collect endpoint metrics - check both with and without curly braces
    Object.entries(metrics).forEach(([metricName, metric]) => {
        // Match patterns like: http_req_duration{name:GetProducts,method:GET}
        const durationMatch = metricName.match(/http_req_duration(?:\{([^}]+)\})?/);
        
        if (durationMatch && metricName.includes('name:')) {
            const tags = metricName.match(/\{([^}]+)\}/);
            if (tags) {
                const tagPairs = tags[1].split(',');
                let endpoint = 'Unknown';
                let method = 'GET';
                
                tagPairs.forEach(pair => {
                    const [key, value] = pair.split(':');
                    if (key === 'name') endpoint = value;
                    if (key === 'method') method = value;
                });
                
                if (!endpointMap.has(endpoint)) {
                    endpointMap.set(endpoint, {
                        endpoint,
                        method,
                        count: 0,
                        avg: metric.values?.avg?.toFixed(2) || 'N/A',
                        min: metric.values?.min?.toFixed(2) || 'N/A',
                        max: metric.values?.max?.toFixed(2) || 'N/A',
                        p50: metric.values?.med?.toFixed(2) || 'N/A',
                        p90: metric.values?.['p(90)']?.toFixed(2) || 'N/A',
                        p95: metric.values?.['p(95)']?.toFixed(2) || 'N/A',
                    });
                }
            }
        }
        
        // Count requests per endpoint - match http_reqs{name:X}
        const reqsMatch = metricName.match(/http_reqs(?:\{([^}]+)\})?/);
        if (reqsMatch && metricName.includes('name:')) {
            const tags = metricName.match(/\{([^}]+)\}/);
            if (tags) {
                const tagPairs = tags[1].split(',');
                let endpoint = 'Unknown';
                
                tagPairs.forEach(pair => {
                    const [key, value] = pair.split(':');
                    if (key === 'name') endpoint = value;
                });
                
                const existing = endpointMap.get(endpoint);
                if (existing) {
                    existing.count = metric.values?.count || 0;
                }
            }
        }
    });
    
    endpointMetrics.push(...Array.from(endpointMap.values()));

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Performance Test Report - ${new Date().toLocaleDateString()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .status-badge {
            display: inline-block;
            padding: 10px 25px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.2em;
            margin-top: 15px;
        }
        .status-passed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
        .content { padding: 30px; }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .card h3 {
            color: #4b5563;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        .card .value { font-size: 2em; font-weight: bold; color: #1f2937; }
        .card .unit { font-size: 0.8em; color: #6b7280; margin-left: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 {
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            font-size: 1.8em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }
        td { padding: 12px 15px; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #f9fafb; }
        tr:last-child td { border-bottom: none; }
        .pass { color: #10b981; font-weight: bold; }
        .fail { color: #ef4444; font-weight: bold; }
        .metric-name {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #4b5563;
        }
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #1f2937;
        }
        .endpoint-name {
            font-weight: 600;
            color: #1f2937;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .method-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .method-get { background: #10b981; color: white; }
        .method-post { background: #3b82f6; color: white; }
        .method-put { background: #f59e0b; color: white; }
        .method-delete { background: #ef4444; color: white; }
        .method-patch { background: #8b5cf6; color: white; }
        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
            border-top: 1px solid #e5e7eb;
        }
        .alert {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .alert h3 { color: #991b1b; margin-bottom: 10px; }
        .alert ul { list-style: none; padding-left: 0; }
        .alert li { color: #7f1d1d; padding: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 K6 Performance Test Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <div class="status-badge status-${overallStatus.toLowerCase()}">
                ${overallStatus === 'PASSED' ? '✅' : '❌'} ${overallStatus}
            </div>
        </div>
        
        <div class="content">
            ${failedThresholds.length > 0 ? `
            <div class="alert">
                <h3>⚠️ Failed Thresholds</h3>
                <ul>
                    ${failedThresholds.map(ft => `
                        <li>❌ <strong>${ft.metric}</strong>: ${ft.threshold}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div class="summary-cards">
                <div class="card">
                    <h3>Test Duration</h3>
                    <div class="value">${testDuration}<span class="unit">seconds</span></div>
                </div>
                <div class="card">
                    <h3>Total Requests</h3>
                    <div class="value">${metrics.http_reqs?.values.count || 0}</div>
                </div>
                <div class="card">
                    <h3>Request Rate</h3>
                    <div class="value">${(metrics.http_reqs?.values.rate || 0).toFixed(2)}<span class="unit">req/s</span></div>
                </div>
                <div class="card">
                    <h3>Avg Response Time</h3>
                    <div class="value">${metrics.http_req_duration?.values.avg?.toFixed(2) || 0}<span class="unit">ms</span></div>
                </div>
                <div class="card">
                    <h3>Error Rate</h3>
                    <div class="value">${((metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}<span class="unit">%</span></div>
                </div>
                <div class="card">
                    <h3>Successful Requests</h3>
                    <div class="value">${metrics.successful_requests?.values.count || 0}</div>
                </div>
            </div>
            
            ${endpointMetrics.length > 0 ? `
            <div class="section">
                <h2>🎯 API Endpoint Performance</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Method</th>
                            <th>Requests</th>
                            <th>Avg</th>
                            <th>Min</th>
                            <th>Med</th>
                            <th>Max</th>
                            <th>P90</th>
                            <th>P95</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${endpointMetrics.map(ep => `
                            <tr>
                                <td><span class="endpoint-name">${ep.endpoint}</span></td>
                                <td><span class="method-badge method-${ep.method.toLowerCase()}">${ep.method}</span></td>
                                <td><strong>${ep.count}</strong></td>
                                <td>${ep.avg} ms</td>
                                <td>${ep.min} ms</td>
                                <td>${ep.p50} ms</td>
                                <td>${ep.max} ms</td>
                                <td>${ep.p90} ms</td>
                                <td>${ep.p95} ms</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <div class="section">
                <h2>📊 Test Groups Performance</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Test Scenario</th>
                            <th>Avg Duration</th>
                            <th>Med Duration</th>
                            <th>P95 Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(metrics)
                            .filter(([name]) => name.startsWith('group_duration{'))
                            .map(([name, metric]) => {
                                const groupMatch = name.match(/group:::(.+)}/);
                                const groupName = groupMatch ? groupMatch[1] : name;
                                const hasThreshold = metric.thresholds && Object.keys(metric.thresholds).length > 0;
                                const thresholdPassed = hasThreshold ? Object.values(metric.thresholds).every(t => t.ok) : true;
                                
                                return `
                                    <tr>
                                        <td><strong>${groupName}</strong></td>
                                        <td>${metric.values.avg?.toFixed(2) || 'N/A'} ms</td>
                                        <td>${metric.values.med?.toFixed(2) || 'N/A'} ms</td>
                                        <td>${metric.values['p(95)']?.toFixed(2) || 'N/A'} ms</td>
                                        <td class="${thresholdPassed ? 'pass' : 'fail'}">
                                            ${thresholdPassed ? '✅ PASS' : '❌ FAIL'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>🎯 Performance Goals (Thresholds)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Performance Goal</th>
                            <th>Target</th>
                            <th>Actual Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(metrics)
                            .filter(([_, metric]) => metric.thresholds)
                            .map(([name, metric]) => {
                                return Object.entries(metric.thresholds)
                                    .map(([threshold, result]) => {
                                        let actualValue = 'N/A';
                                        
                                        if (threshold.includes('p(95)') && metric.values['p(95)']) {
                                            actualValue = metric.values['p(95)'].toFixed(2) + (metric.contains === 'time' ? ' ms' : '');
                                        } else if (threshold.includes('p(99)') && metric.values['p(99)']) {
                                            actualValue = metric.values['p(99)'].toFixed(2) + (metric.contains === 'time' ? ' ms' : '');
                                        } else if (threshold.includes('rate') && metric.values.rate !== undefined) {
                                            actualValue = (metric.values.rate * 100).toFixed(2) + '%';
                                        }
                                        
                                        return `
                                            <tr>
                                                <td class="metric-name">${name}</td>
                                                <td><code>${threshold}</code></td>
                                                <td><strong>${actualValue}</strong></td>
                                                <td class="${result.ok ? 'pass' : 'fail'}">
                                                    ${result.ok ? '✅ PASS' : '❌ FAIL'}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                            }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>✅ Checks</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Check Name</th>
                            <th>Passes</th>
                            <th>Failures</th>
                            <th>Success Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allChecks.length > 0 ? allChecks.map(check => {
                            const total = check.passes + check.fails;
                            const successRate = total > 0 ? (check.passes / total * 100).toFixed(2) : '0.00';
                            return `
                                <tr>
                                    <td><strong>${check.name}</strong></td>
                                    <td class="pass">${check.passes}</td>
                                    <td class="${check.fails > 0 ? 'fail' : ''}">${check.fails}</td>
                                    <td><strong>${successRate}%</strong></td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="4">No checks defined</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by K6 Load Testing Framework | Test completed in ${testDuration}s</p>
            <p>Report created: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;
}
