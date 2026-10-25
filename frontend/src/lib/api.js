const configuredBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(configuredBase) ? configuredBase : `${configuredBase}/api`;

export async function apiRequest(endpoint, options = {}) {
  let response;
  try {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });
  } catch {
    throw new Error("Could not reach the API. Make sure the backend is running on port 5000.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The API returned an unexpected response. Check that the backend is running and the Vite API proxy is active.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "The request could not be completed.");

  return data;
}
