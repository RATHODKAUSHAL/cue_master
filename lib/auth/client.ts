"use client";

export const USER_SESSION_KEY = "user_session";

export function saveUserSession(token: string) {
  window.localStorage.setItem(USER_SESSION_KEY, token);
}

export function clearUserSession() {
  window.localStorage.removeItem(USER_SESSION_KEY);
}

export function getUserSession() {
  return window.localStorage.getItem(USER_SESSION_KEY);
}

export async function userFetch(input: string, init: RequestInit = {}) {
  const token = getUserSession();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers, cache: init.cache ?? "no-store" });

  if (response.status === 401) {
    clearUserSession();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/login");
    throw new Error("Unauthorized");
  }

  return response;
}
