#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write

import { parseArgs } from "jsr:@std/cli/parse-args";
import { load } from "jsr:@std/dotenv";
import { validateTestEnvironment, requireTestEnvironment } from "./test-utils.ts";

interface TestConfig {
  baseUrl?: string;
  timeout?: number;
  verbose?: boolean;
  pattern?: string;
  suites?: string[];
  outputFile?: string;
  skipSetup?: boolean;
  skipTeardown?: boolean;
}

class TestRunner {
  private config: TestConfig;
  
  constructor(config: TestConfig = {}) {
    this.config = {
      baseUrl: 'http://localhost:54321/functions/v1',
      timeout: 30000,
      verbose: false,
      ...config
    };
  }

  /**
   * Discover test files
   */
  async discoverTests(pattern?: string): Promise<string[]> {
    const testFiles: string[] = [];
    
    try {
      for await (const dirEntry of Deno.readDir('./')) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.test.ts')) {
          if (!pattern || dirEntry.name.includes(pattern)) {
            testFiles.push(`./${dirEntry.name}`);
          }
        }
      }
    } catch (error) {
      console.error("Error discovering test files:", error);
    }
    
    return testFiles.sort();
  }

  /**
   * Run a single test file and capture results
   */
  async runTestFile(filePath: string): Promise<{ passed: number, failed: number, error?: Error }> {
    try {
      console.log(`\n🔧 Running test file: ${filePath}`);
      
      // Validate test environment first
      requireTestEnvironment();
      
      // Set environment variables for the test - use existing env vars or local defaults
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || this.config.baseUrl?.replace('/functions/v1', '') || 'http://localhost:54321';
      
      // Only set if not already present
      if (!Deno.env.get('SUPABASE_URL')) {
        Deno.env.set('SUPABASE_URL', supabaseUrl);
      }
      
      // Use existing keys from environment, or local dev defaults ONLY if confirmed local
      if (!Deno.env.get('SUPABASE_ANON_KEY')) {
        if (!supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1')) {
          throw new Error('SUPABASE_ANON_KEY must be set for non-local testing');
        }
        // These are the standard local development keys - NEVER use in production
        console.warn('⚠️  Using local development keys - ensure this is a test environment');
        Deno.env.set('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');
      }
      
      if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        if (!supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1')) {
          throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set for non-local testing');
        }
        Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU');
      }
      
      // Run the test file as a subprocess to properly execute it
      const command = new Deno.Command("deno", {
        args: ["run", "--allow-all", filePath],
        stdout: "piped",
        stderr: "piped",
        env: {
          ...Deno.env.toObject(),
          TEST_MODE: "true",
          NODE_ENV: "test"
        }
      });
      
      // Execute command and capture output
      const output = await command.output();
      const outputText = new TextDecoder().decode(output.stdout);
      const errorText = new TextDecoder().decode(output.stderr);
      
      // Print the output to console
      if (outputText) {
        console.log(outputText);
      }
      if (errorText) {
        console.error(errorText);
      }
      
      // Parse test results from output - look for the TEST SUMMARY from test-framework
      let testResults = { passed: 0, failed: 0 };
      
      // Split into lines and look for the summary pattern
      const lines = outputText.split('\n');
      
      // Find the TEST SUMMARY section (there should be exactly one per test file)
      // It's preceded and followed by ═ characters
      for (let i = 0; i < lines.length; i++) {
        // Look for the pattern: ═══...═══\n📊 TEST SUMMARY\n═══...═══
        if (lines[i].includes('═') && lines[i].length > 20) {
          if (i + 1 < lines.length && lines[i + 1].includes('TEST SUMMARY')) {
            // Found the summary header, now get the counts
            for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
              const line = lines[j];
              
              // Stop at the closing separator
              if (line.includes('═') && line.length > 20) {
                break;
              }
              
              // Parse the counts
              const passedMatch = line.match(/✅ Passed:\s*(\d+)/);
              const failedMatch = line.match(/❌ Failed:\s*(\d+)/);
              
              if (passedMatch) {
                testResults.passed = parseInt(passedMatch[1]);
              }
              if (failedMatch) {
                testResults.failed = parseInt(failedMatch[1]);
              }
            }
            
            // We found the summary, stop looking
            if (testResults.passed > 0 || testResults.failed > 0) {
              break;
            }
          }
        }
      }
      
      // If we still didn't find results, count actual test lines as fallback
      if (testResults.passed === 0 && testResults.failed === 0) {
        for (const line of lines) {
          // Count actual test result lines (indented with test names)
          if (line.match(/^\s{2}✅\s+should/)) {
            testResults.passed++;
          } else if (line.match(/^\s{2}❌\s+should/)) {
            testResults.failed++;
          }
        }
      }
      
      // Check exit code
      if (!output.success && testResults.passed === 0 && testResults.failed === 0) {
        // If the process failed and we couldn't parse results, count it as a failure
        testResults.failed = 1;
      }
      
      return testResults;
      
    } catch (error) {
      console.error(`❌ Error running test file ${filePath}:`, error);
      return { passed: 0, failed: 1, error: error as Error };
    }
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<void> {
    console.log("🧪 Midnight Protocol Function Test Runner");
    console.log("═".repeat(50));
    
    // Validate environment first
    const env = validateTestEnvironment();
    if (!env.isValid) {
      console.error("\n❌ Test Environment Validation Failed:");
      env.errors.forEach(error => console.error(`  • ${error}`));
      Deno.exit(1);
    }
    
    if (env.warnings.length > 0) {
      console.warn("\n⚠️  Test Environment Warnings:");
      env.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
    
    if (this.config.verbose) {
      console.log("\nConfiguration:");
      console.log(`  Base URL: ${this.config.baseUrl}`);
      console.log(`  Timeout: ${this.config.timeout}ms`);
      console.log(`  Pattern: ${this.config.pattern || 'all'}`);
      console.log(`  Environment: ${env.isLocal ? 'Local' : 'Remote'}`);
      console.log("");
    }

    // Discover test files
    const testFiles = await this.discoverTests(this.config.pattern);
    
    if (testFiles.length === 0) {
      console.log("⚠️  No test files found");
      return;
    }

    console.log(`📁 Found ${testFiles.length} test file(s):`);
    testFiles.forEach(file => console.log(`  • ${file}`));
    console.log("");

    let totalPassed = 0;
    let totalFailed = 0;
    let totalErrors = 0;

    // Check if Supabase is running
    console.log("🔍 Checking Supabase services...");
    const healthCheck = await this.checkSupabaseHealth();
    if (!healthCheck.healthy) {
      console.error("❌ Supabase services are not ready:");
      healthCheck.errors.forEach(error => console.error(`  • ${error}`));
      console.error("\n💡 Make sure to run 'supabase start' before running tests");
      Deno.exit(1);
    }
    console.log("✅ Supabase services are ready");

    // Run specific test suites if specified
    const targetFiles = this.config.suites 
      ? testFiles.filter(file => this.config.suites!.some(suite => file.includes(suite)))
      : testFiles;

    if (targetFiles.length === 0) {
      console.log("⚠️  No matching test files found for specified suites");
      return;
    }

    // Run each test file
    const fileResults: Map<string, { passed: number, failed: number }> = new Map();
    
    for (const testFile of targetFiles) {
      try {
        const result = await this.runTestFile(testFile);
        fileResults.set(testFile, { passed: result.passed, failed: result.failed });
        totalPassed += result.passed;
        totalFailed += result.failed;
        if (result.error) {
          totalErrors++;
        }
        
        if (this.config.verbose) {
          console.log(`📊 ${testFile}: ${result.passed} passed, ${result.failed} failed`);
        }
      } catch (error) {
        console.error(`💥 Failed to run ${testFile}:`, error);
        totalErrors++;
      }
    }

    // Final summary
    console.log("\n" + "═".repeat(60));
    console.log("🎯 FINAL TEST SUMMARY");
    console.log("═".repeat(60));
    console.log(`Test Files: ${targetFiles.length}`);
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`💥 Errors: ${totalErrors}`);
    
    const successRate = totalPassed + totalFailed > 0 
      ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
      : '0';
    console.log(`📈 Success Rate: ${successRate}%`);
    
    // Save results to file if requested
    if (this.config.outputFile) {
      const results = {
        timestamp: new Date().toISOString(),
        files: targetFiles.length,
        passed: totalPassed,
        failed: totalFailed,
        errors: totalErrors,
        successRate: parseFloat(successRate)
      };
      
      try {
        await Deno.writeTextFile(this.config.outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📝 Results saved to ${this.config.outputFile}`);
      } catch (error) {
        console.error(`Failed to save results: ${error}`);
      }
    }

    if (totalFailed > 0 || totalErrors > 0) {
      console.log("\n❌ Some tests failed - check output above for details");
      Deno.exit(1);
    } else {
      console.log("\n✅ All tests passed!");
    }
  }

  /**
   * Check if Supabase services are healthy
   */
  private async checkSupabaseHealth(): Promise<{ healthy: boolean, errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check Supabase REST API by trying to access the OpenAPI spec
      const baseUrl = this.config.baseUrl?.replace('/functions/v1', '') || 'http://localhost:54321';
      const apiResponse = await fetch(`${baseUrl}/rest/v1/`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
        }
      });
      
      // The REST API should return something (even if it's an error about missing tables)
      // We just want to know if the service is running
      if (!apiResponse) {
        errors.push(`Supabase REST API not responding`);
      }
    } catch (error) {
      errors.push(`Cannot connect to Supabase API: ${error.message}`);
    }

    try {
      // Check if we can reach the auth endpoint
      const baseUrl = this.config.baseUrl?.replace('/functions/v1', '') || 'http://localhost:54321';
      const authResponse = await fetch(`${baseUrl}/auth/v1/health`, {
        method: 'GET'
      });
      
      // Auth health endpoint should return 200
      if (!authResponse.ok && authResponse.status !== 404) {
        errors.push(`Auth service not responding (${authResponse.status})`);
      }
    } catch (error) {
      // This is OK - just means auth endpoint might not have a health check
    }

    try {
      // Check if we can reach functions endpoint by checking if it returns proper CORS headers
      const functionsTest = await fetch(`${this.config.baseUrl}/test-function-that-does-not-exist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      // We expect 404 (function not found) or 401 (unauthorized) - both mean the service is running
      if (functionsTest.status !== 404 && functionsTest.status !== 401 && functionsTest.status !== 400) {
        // If we get a different error, the service might not be running properly
        if (!functionsTest.ok) {
          errors.push(`Functions endpoint not accessible (${functionsTest.status})`);
        }
      }
    } catch (error) {
      errors.push(`Cannot connect to functions endpoint: ${error.message}`);
    }

    return {
      healthy: errors.length === 0,
      errors
    };
  }
}

// CLI interface
async function main() {
  // Load environment variables from .env.test file
  try {
    await load({ envPath: '.env.test', export: true });
    console.log("✅ Loaded environment variables from .env.test");
  } catch (error) {
    console.warn("⚠️  Could not load .env.test file:", error.message);
    console.log("   Using existing environment variables or defaults");
  }

  const args = parseArgs(Deno.args, {
    string: ['pattern', 'url', 'output', 'suites'],
    boolean: ['verbose', 'help', 'skip-setup', 'skip-teardown'],
    alias: {
      'p': 'pattern',
      'v': 'verbose',
      'h': 'help',
      'u': 'url',
      'o': 'output',
      's': 'suites'
    },
    default: {
      url: 'http://localhost:54321/functions/v1'
    }
  });

  if (args.help) {
    console.log(`
🧪 Midnight Protocol Function Test Runner

Usage: deno run --allow-all run-tests.ts [options]

Options:
  -p, --pattern <pattern>    Only run tests matching pattern
  -u, --url <url>           Supabase functions URL (default: http://localhost:54321/functions/v1)
  -s, --suites <suites>     Comma-separated list of test suites to run
  -o, --output <file>       Save test results to JSON file
  -v, --verbose             Enable verbose output
  --skip-setup              Skip global setup
  --skip-teardown           Skip global teardown
  -h, --help                Show this help

Examples:
  deno run --allow-all run-tests.ts                    # Run all tests
  deno run --allow-all run-tests.ts -p admin           # Run tests matching 'admin'
  deno run --allow-all run-tests.ts -s admin-api       # Run only admin-api tests
  deno run --allow-all run-tests.ts -v                 # Run with verbose output
    `);
    return;
  }

  const config: TestConfig = {
    baseUrl: args.url,
    pattern: args.pattern,
    suites: args.suites ? args.suites.split(',').map(s => s.trim()) : undefined,
    outputFile: args.output,
    verbose: args.verbose,
    skipSetup: args['skip-setup'],
    skipTeardown: args['skip-teardown']
  };

  const runner = new TestRunner(config);
  await runner.runAll();
}

if (import.meta.main) {
  await main();
}