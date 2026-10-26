const configuredBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(configuredBase) ? configuredBase : `${configuredBase}/api`;

export async function apiDownload(endpoint, fallbackName) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  } catch {
    throw new Error("Could not reach the API. Make sure the backend is running on port 5000.");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const message = contentType.includes("application/json")
      ? (await response.json()).message
      : "The download could not be completed.";
    throw new Error(message || "The download could not be completed.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
