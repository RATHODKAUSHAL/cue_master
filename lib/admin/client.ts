"use client";

const TOKEN_KEY = "cuedesk_admin_token";

export function saveAdminToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function adminFetch(input: string, init: RequestInit = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    clearAdminToken();
    await fetch("/api/v1/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/v1/admin/login");
    throw new Error("Unauthorized");
  }
  return response;
}
