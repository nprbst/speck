#!/usr/bin/env bun

/**
 * Deployment Verification Script
 *
 * Verifies that the deployed website meets all requirements:
 * - All pages are accessible
 * - Performance budgets are met
 * - SEO tags are present
 * - Accessibility standards are met
 *
 * Usage:
 *   bun website/scripts/verify-deployment.ts https://speck.codes
 */

import { $ } from 'bun';

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface PageTest {
  url: string;
  name: string;
  expectedStatus: number;
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logResult(result: VerificationResult) {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? colors.green : colors.red;
  log(`${icon} ${result.message}`, color);
  if (result.details) {
    console.log(`  ${result.details}`);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function testPageAccessibility(baseUrl: string, pages: PageTest[]): Promise<VerificationResult[]> {
  log('\n📄 Testing Page Accessibility...', colors.blue);
  const results: VerificationResult[] = [];

  for (const page of pages) {
    const url = `${baseUrl}${page.url}`;
    try {
      const response = await fetchWithTimeout(url);
      const passed = response.status === page.expectedStatus;
      results.push({
        passed,
        message: `${page.name} (${page.url})`,
        details: passed ? `Status: ${response.status}` : `Expected ${page.expectedStatus}, got ${response.status}`,
      });
    } catch (error) {
      results.push({
        passed: false,
        message: `${page.name} (${page.url})`,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return results;
}

async function testSEOTags(baseUrl: string): Promise<VerificationResult[]> {
  log('\n🔍 Testing SEO Tags...', colors.blue);
  const results: VerificationResult[] = [];

  try {
    const response = await fetchWithTimeout(baseUrl);
    const html = await response.text();

    // Check title tag
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    results.push({
      passed: !!titleMatch && titleMatch[1].length > 0,
      message: 'Title tag present',
      details: titleMatch ? `"${titleMatch[1]}"` : 'Not found',
    });

    // Check meta description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    results.push({
      passed: !!descMatch && descMatch[1].length > 0 && descMatch[1].length <= 160,
      message: 'Meta description present and valid',
      details: descMatch ? `${descMatch[1].length} characters` : 'Not found',
    });

    // Check Open Graph tags
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/);
    results.push({
      passed: !!ogTitleMatch,
      message: 'Open Graph title present',
      details: ogTitleMatch ? `"${ogTitleMatch[1]}"` : 'Not found',
    });

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/);
    results.push({
      passed: !!ogImageMatch,
      message: 'Open Graph image present',
      details: ogImageMatch ? ogImageMatch[1] : 'Not found',
    });

    // Check canonical URL
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
    results.push({
      passed: !!canonicalMatch,
      message: 'Canonical URL present',
      details: canonicalMatch ? canonicalMatch[1] : 'Not found',
    });

  } catch (error) {
    results.push({
      passed: false,
      message: 'SEO tag check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function testRobotsTxt(baseUrl: string): Promise<VerificationResult> {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/robots.txt`);
    const content = await response.text();
    const passed = response.status === 200 && content.includes('Sitemap:');
    return {
      passed,
      message: 'robots.txt accessible and contains sitemap',
      details: passed ? 'OK' : 'Missing sitemap reference',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'robots.txt check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testSitemap(baseUrl: string): Promise<VerificationResult> {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/sitemap-index.xml`);
    const content = await response.text();
    const passed = response.status === 200 && content.includes('<sitemap>');
    return {
      passed,
      message: 'Sitemap accessible and valid',
      details: passed ? 'OK' : 'Invalid sitemap format',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Sitemap check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testPerformance(baseUrl: string): Promise<VerificationResult[]> {
  log('\n⚡ Testing Performance...', colors.blue);
  const results: VerificationResult[] = [];

  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(baseUrl);
    const loadTime = Date.now() - startTime;
    const html = await response.text();

    results.push({
      passed: loadTime < 3000,
      message: 'Page load time',
      details: `${loadTime}ms (target: <3000ms)`,
    });

    results.push({
      passed: html.length < 100000,
      message: 'HTML size',
      details: `${(html.length / 1024).toFixed(2)} KB (target: <100KB)`,
    });

    // Check for cache headers
    const cacheControl = response.headers.get('cache-control');
    results.push({
      passed: !!cacheControl,
      message: 'Cache-Control header present',
      details: cacheControl || 'Not found',
    });

  } catch (error) {
    results.push({
      passed: false,
      message: 'Performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function testAccessibility(baseUrl: string): Promise<VerificationResult[]> {
  log('\n♿ Testing Basic Accessibility...', colors.blue);
  const results: VerificationResult[] = [];

  try {
    const response = await fetchWithTimeout(baseUrl);
    const html = await response.text();

    // Check for lang attribute
    const langMatch = html.match(/<html[^>]+lang="([^"]*)"/);
    results.push({
      passed: !!langMatch,
      message: 'HTML lang attribute present',
      details: langMatch ? `lang="${langMatch[1]}"` : 'Not found',
    });

    // Check for skip-to-content link
    const skipLinkMatch = html.match(/skip-to-content|skip-link|skip-navigation/i);
    results.push({
      passed: !!skipLinkMatch,
      message: 'Skip-to-content link present',
      details: skipLinkMatch ? 'Found' : 'Not found',
    });

    // Check for viewport meta tag
    const viewportMatch = html.match(/<meta\s+name="viewport"/);
    results.push({
      passed: !!viewportMatch,
      message: 'Viewport meta tag present',
      details: viewportMatch ? 'Found' : 'Not found',
    });

  } catch (error) {
    results.push({
      passed: false,
      message: 'Accessibility check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function main() {
  const baseUrl = process.argv[2];

  if (!baseUrl) {
    log('❌ Error: Please provide a base URL', colors.red);
    log('Usage: bun verify-deployment.ts <base-url>', colors.yellow);
    log('Example: bun verify-deployment.ts https://speck.codes', colors.yellow);
    process.exit(1);
  }

  log(`\n${colors.bold}🚀 Verifying deployment: ${baseUrl}${colors.reset}\n`);

  const pages: PageTest[] = [
    { url: '/', name: 'Homepage', expectedStatus: 200 },
    { url: '/docs/getting-started/quick-start', name: 'Quick Start', expectedStatus: 200 },
    { url: '/docs/getting-started/troubleshooting', name: 'Troubleshooting Guide', expectedStatus: 200 },
    { url: '/docs/getting-started/setup-reference', name: 'Setup Reference', expectedStatus: 200 },
    { url: '/docs/commands/reference', name: 'Commands Reference', expectedStatus: 200 },
    { url: '/comparison', name: 'Comparison Page', expectedStatus: 200 },
    { url: '/nonexistent-page', name: '404 Page', expectedStatus: 404 },
  ];

  // Run all tests
  const pageResults = await testPageAccessibility(baseUrl, pages);
  const seoResults = await testSEOTags(baseUrl);
  const robotsResult = await testRobotsTxt(baseUrl);
  const sitemapResult = await testSitemap(baseUrl);
  const performanceResults = await testPerformance(baseUrl);
  const accessibilityResults = await testAccessibility(baseUrl);

  // Display results
  pageResults.forEach(logResult);
  log('\n🔍 SEO Verification...', colors.blue);
  seoResults.forEach(logResult);
  logResult(robotsResult);
  logResult(sitemapResult);
  performanceResults.forEach(logResult);
  accessibilityResults.forEach(logResult);

  // Summary
  const allResults = [
    ...pageResults,
    ...seoResults,
    robotsResult,
    sitemapResult,
    ...performanceResults,
    ...accessibilityResults,
  ];

  const totalTests = allResults.length;
  const passedTests = allResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  log('\n' + '='.repeat(60), colors.blue);
  log(`\n📊 Summary:`, colors.bold);
  log(`  Total tests: ${totalTests}`);
  log(`  Passed: ${passedTests}`, colors.green);
  log(`  Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  log(`  Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    log('\n✅ All deployment verification tests passed!', colors.green);
    process.exit(0);
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Please review the issues above.`, colors.yellow);
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
