/**
 * Shared CORS utilities for Supabase Edge Functions
 * Provides secure CORS handling with environment-based origin validation
 */

// Default allowed origins based on environment
const DEFAULT_ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:8080", // Supabase local development
  "https://midnightprotocol.org",
  "https://www.midnightprotocol.org",
  "https://midnight-protocol.netlify.app",
];

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return [
      ...DEFAULT_ALLOWED_ORIGINS,
      ...envOrigins.split(",").map((o) => o.trim()),
    ];
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes("*")) {
      const pattern = allowedOrigin.replace(/\./g, "\\.").replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: HeadersInit = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  // Only set Access-Control-Allow-Origin if the origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    if (!origin || !isOriginAllowed(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}

/**
 * Create a success response with CORS headers
 */
export function corsSuccessResponse(req: Request, data: any): Response {
  const origin = req.headers.get("origin");
  if (!origin || !isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create an error response with CORS headers
 */
export function corsErrorResponse(
  req: Request,
  error: string,
  status: number = 500
): Response {
  const origin = req.headers.get("origin");
  // Even for errors, we should validate the origin
  const headers = origin && isOriginAllowed(origin) ? getCorsHeaders(req) : {};

  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Legacy corsHeaders export for backward compatibility
 * New code should use getCorsHeaders with the request object
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};
