import { TestUser } from "./test-auth.ts";
import { validateInput, ValidationSchema, withTimeout } from "./test-utils.ts";

export interface FunctionTestResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
  headers: Headers;
  body?: string;
}

export interface FunctionCallOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class TestClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:54321/functions/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * Call a Supabase edge function with authentication
   */
  async callFunction(
    functionName: string,
    user: TestUser,
    payload?: any,
    options: FunctionCallOptions = {}
  ): Promise<FunctionTestResponse> {
    // Input validation
    const schema: ValidationSchema = {
      functionName: { type: "string", required: true, minLength: 1 },
    };

    validateInput({ functionName }, schema);

    if (!user || !user.authToken) {
      throw new Error("Valid authenticated user required");
    }
    const url = `${this.baseUrl}/${functionName}`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.authToken}`,
      ...options.headers,
    };

    // console.log(`Calling ${functionName} with token:`, user.authToken ? `${user.authToken.substring(0, 20)}...` : 'NO TOKEN');
    // console.log('Headers being sent:', headers);

    const requestOptions: RequestInit = {
      method: options.method || "POST",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    };

    try {
      const response = await withTimeout(
        fetch(url, requestOptions),
        options.timeout || 300000,
        `Function call to ${functionName}`
      );

      const responseBody = await response.text();
      let data: any = null;

      try {
        data = responseBody ? JSON.parse(responseBody) : null;
      } catch (parseError) {
        // Response body is not JSON, keep as string
        data = responseBody;
      }

      return {
        ok: response.ok,
        status: response.status,
        data: data,
        error: !response.ok
          ? data?.error || data || `HTTP ${response.status}`
          : undefined,
        headers: response.headers,
        body: responseBody,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Request failed";
      console.error(`Function call to ${functionName} failed:`, errorMessage);

      return {
        ok: false,
        status: 0,
        error: errorMessage,
        headers: new Headers(),
        body: "",
      };
    }
  }

  /**
   * Call admin API function with admin user
   */
  async callAdminApi(
    action: string,
    adminUser: TestUser,
    params?: any
  ): Promise<FunctionTestResponse> {
    // Validate inputs
    const schema: ValidationSchema = {
      action: { type: "string", required: true, minLength: 1 },
    };

    validateInput({ action }, schema);

    if (!adminUser) {
      throw new Error("Admin user is required but was undefined or null");
    }

    if (adminUser.role !== "admin") {
      throw new Error("User must have admin role to call admin API");
    }

    return this.callFunction("admin-api", adminUser, { action, params });
  }

  /**
   * Call internal API function with regular user
   */
  async callInternalApi(
    action: string,
    user: TestUser,
    params?: any
  ): Promise<FunctionTestResponse> {
    return this.callFunction("internal-api", user, { action, params });
  }

  /**
   * Call omniscient system function
   */
  async callOmniscientSystem(
    action: string,
    user: TestUser,
    params?: any
  ): Promise<FunctionTestResponse> {
    return this.callFunction("omniscient-system", user, { action, params });
  }

  /**
   * Call function without authentication (for testing auth failures)
   */
  async callFunctionUnauthenticated(
    functionName: string,
    payload?: any,
    options: FunctionCallOptions = {}
  ): Promise<FunctionTestResponse> {
    const url = `${this.baseUrl}/${functionName}`;

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      method: options.method || "POST",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    };

    try {
      const response = await fetch(url, requestOptions);
      const responseBody = await response.text();
      let data: any = null;

      try {
        data = responseBody ? JSON.parse(responseBody) : null;
      } catch (parseError) {
        data = responseBody;
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        error: !response.ok
          ? data?.error || data || `HTTP ${response.status}`
          : undefined,
        headers: response.headers,
        body: responseBody,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Request failed";
      console.error(`Function call to ${functionName} failed:`, errorMessage);

      return {
        ok: false,
        status: 0,
        error: errorMessage,
        headers: new Headers(),
        body: "",
      };
    }
  }

  /**
   * Health check for functions
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if functions endpoint responds to OPTIONS request
      const response = await withTimeout(
        fetch(this.baseUrl, { method: "OPTIONS" }),
        5000,
        "Health check"
      );
      // 404 is ok - it means the endpoint exists but no specific function
      return response.ok || response.status === 404;
    } catch (error) {
      console.warn("Health check failed:", error);
      return false;
    }
  }

  /**
   * Wait for functions to be ready
   */
  async waitForReady(
    maxAttempts: number = 10,
    delayMs: number = 1000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.healthCheck()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  /**
   * Helper to make GET requests
   */
  async get(
    functionName: string,
    user: TestUser,
    headers?: Record<string, string>
  ): Promise<FunctionTestResponse> {
    return this.callFunction(functionName, user, null, {
      method: "GET",
      headers,
    });
  }

  /**
   * Helper to make POST requests
   */
  async post(
    functionName: string,
    user: TestUser,
    payload?: any,
    headers?: Record<string, string>
  ): Promise<FunctionTestResponse> {
    return this.callFunction(functionName, user, payload, {
      method: "POST",
      headers,
    });
  }

  /**
   * Helper to make PUT requests
   */
  async put(
    functionName: string,
    user: TestUser,
    payload?: any,
    headers?: Record<string, string>
  ): Promise<FunctionTestResponse> {
    return this.callFunction(functionName, user, payload, {
      method: "PUT",
      headers,
    });
  }

  /**
   * Helper to make DELETE requests
   */
  async delete(
    functionName: string,
    user: TestUser,
    payload?: any,
    headers?: Record<string, string>
  ): Promise<FunctionTestResponse> {
    return this.callFunction(functionName, user, payload, {
      method: "DELETE",
      headers,
    });
  }
}
