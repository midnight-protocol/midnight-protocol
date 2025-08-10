import { assertEquals, assertExists, assert, assertFalse } from "jsr:@std/assert";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  duration: number;
  logs: string[];
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export interface TestContext {
  log: (message: string) => void;
  assert: typeof assert;
  assertEquals: typeof assertEquals;
  assertExists: typeof assertExists;
  assertFalse: typeof assertFalse;
  assertResponse: (response: any, expectedStatus: number) => void;
  assertSuccess: (response: any) => void;
  assertError: (response: any) => void;
  assertHasProperty: (obj: any, property: string) => void;
  assertArrayLength: (arr: any[], expectedLength: number) => void;
}

export type TestFunction = (ctx: TestContext) => Promise<void> | void;

export class TestFramework {
  private suites: Map<string, { tests: Map<string, TestFunction>, setup?: () => Promise<void>, teardown?: () => Promise<void> }> = new Map();
  private globalSetup?: () => Promise<void>;
  private globalTeardown?: () => Promise<void>;
  private results: TestSuite[] = [];

  /**
   * Register global setup function
   */
  setGlobalSetup(setup: () => Promise<void>): void {
    this.globalSetup = setup;
  }

  /**
   * Register global teardown function
   */
  setGlobalTeardown(teardown: () => Promise<void>): void {
    this.globalTeardown = teardown;
  }

  /**
   * Create a test suite
   */
  describe(suiteName: string, setup?: () => Promise<void>, teardown?: () => Promise<void>): TestSuiteBuilder {
    this.suites.set(suiteName, { tests: new Map(), setup, teardown });
    return new TestSuiteBuilder(suiteName, this.suites.get(suiteName)!);
  }

  /**
   * Run all test suites
   */
  async run(): Promise<{ passed: number, failed: number, suites: TestSuite[] }> {
    console.log("🧪 Starting test execution...\n");
    
    let totalPassed = 0;
    let totalFailed = 0;

    // Run global setup
    if (this.globalSetup) {
      console.log("⚙️  Running global setup...");
      try {
        await this.globalSetup();
        console.log("✅ Global setup completed\n");
      } catch (error) {
        console.error("❌ Global setup failed:", error);
        return { passed: 0, failed: 0, suites: [] };
      }
    }

    // Run each test suite
    for (const [suiteName, suite] of this.suites.entries()) {
      console.log(`📦 Running suite: ${suiteName}`);
      
      const suiteResult: TestSuite = {
        name: suiteName,
        tests: [],
        passed: 0,
        failed: 0,
        duration: 0
      };

      const suiteStart = performance.now();

      // Run suite setup
      if (suite.setup) {
        try {
          await suite.setup();
          console.log(`  ⚙️  Suite setup completed`);
        } catch (error) {
          console.error(`  ❌ Suite setup failed:`, error);
          continue;
        }
      }

      // Run tests in the suite
      for (const [testName, testFn] of suite.tests.entries()) {
        const testResult = await this.runTest(suiteName, testName, testFn);
        suiteResult.tests.push(testResult);
        
        if (testResult.passed) {
          suiteResult.passed++;
          totalPassed++;
          console.log(`  ✅ ${testName} (${testResult.duration.toFixed(2)}ms)`);
        } else {
          suiteResult.failed++;
          totalFailed++;
          console.log(`  ❌ ${testName} (${testResult.duration.toFixed(2)}ms)`);
          if (testResult.error) {
            console.log(`     ${testResult.error.message}`);
          }
        }
      }

      // Run suite teardown
      if (suite.teardown) {
        try {
          await suite.teardown();
          console.log(`  🧹 Suite teardown completed`);
        } catch (error) {
          console.error(`  ❌ Suite teardown failed:`, error);
        }
      }

      suiteResult.duration = performance.now() - suiteStart;
      this.results.push(suiteResult);
      
      console.log(`  📊 Suite completed: ${suiteResult.passed} passed, ${suiteResult.failed} failed (${suiteResult.duration.toFixed(2)}ms)\n`);
    }

    // Run global teardown
    if (this.globalTeardown) {
      console.log("🧹 Running global teardown...");
      try {
        await this.globalTeardown();
        console.log("✅ Global teardown completed");
      } catch (error) {
        console.error("❌ Global teardown failed:", error);
      }
    }

    // Print summary
    this.printSummary(totalPassed, totalFailed);

    return {
      passed: totalPassed,
      failed: totalFailed,
      suites: this.results
    };
  }

  /**
   * Run a single test
   */
  private async runTest(suiteName: string, testName: string, testFn: TestFunction): Promise<TestResult> {
    const logs: string[] = [];
    const startTime = performance.now();

    const ctx: TestContext = {
      log: (message: string) => {
        logs.push(message);
        console.log(`    📝 ${message}`);
      },
      assert,
      assertEquals,
      assertExists,
      assertFalse,
      assertResponse: (response: any, expectedStatus: number) => {
        assertEquals(response.status, expectedStatus, `Expected status ${expectedStatus}, got ${response.status}`);
      },
      assertSuccess: (response: any) => {
        assert(response.ok || response.success, `Expected successful response, got: ${JSON.stringify(response)}`);
      },
      assertError: (response: any) => {
        assertFalse(response.ok || response.success, `Expected error response, but got success: ${JSON.stringify(response)}`);
      },
      assertHasProperty: (obj: any, property: string) => {
        assert(obj && typeof obj === 'object' && property in obj, `Object does not have property '${property}'`);
      },
      assertArrayLength: (arr: any[], expectedLength: number) => {
        assertEquals(arr.length, expectedLength, `Expected array length ${expectedLength}, got ${arr.length}`);
      }
    };

    try {
      await testFn(ctx);
      return {
        name: testName,
        passed: true,
        duration: performance.now() - startTime,
        logs
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        error: error as Error,
        duration: performance.now() - startTime,
        logs
      };
    }
  }

  /**
   * Print test summary
   */
  private printSummary(passed: number, failed: number): void {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    console.log("═".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("═".repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log("═".repeat(60));

    if (failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      for (const suite of this.results) {
        for (const test of suite.tests) {
          if (!test.passed) {
            console.log(`  • ${suite.name} > ${test.name}`);
            if (test.error) {
              console.log(`    ${test.error.message}`);
            }
          }
        }
      }
    }
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.reduce((sum, suite) => sum + suite.tests.length, 0),
        passed: this.results.reduce((sum, suite) => sum + suite.passed, 0),
        failed: this.results.reduce((sum, suite) => sum + suite.failed, 0),
        duration: this.results.reduce((sum, suite) => sum + suite.duration, 0)
      },
      suites: this.results
    }, null, 2);
  }
}

export class TestSuiteBuilder {
  constructor(
    private suiteName: string,
    private suite: { tests: Map<string, TestFunction>, setup?: () => Promise<void>, teardown?: () => Promise<void> }
  ) {}

  /**
   * Add a test to this suite
   */
  it(testName: string, testFn: TestFunction): TestSuiteBuilder {
    this.suite.tests.set(testName, testFn);
    return this;
  }

  /**
   * Add an async test to this suite
   */
  test(testName: string, testFn: TestFunction): TestSuiteBuilder {
    return this.it(testName, testFn);
  }
}

// Singleton instance for easy use
export const testFramework = new TestFramework();