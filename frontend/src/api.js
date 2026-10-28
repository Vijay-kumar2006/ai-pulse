const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  localStorage.setItem("token", t);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  
  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type");
  const data = (contentType && contentType.includes("application/json"))
    ? await res.json()
    : { message: await res.text() };

  if (!res.ok) throw new Error(data.detail || data.message || "Request failed");
  return data;
}

