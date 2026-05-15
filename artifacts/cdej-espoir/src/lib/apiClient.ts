const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

let _getToken: () => string | null = () => null;
export function setApiClientTokenGetter(fn: () => string | null) {
  _getToken = fn;
}

export async function apiClient(path: string, options?: RequestInit): Promise<Response> {
  const token = _getToken();
  const isFormData = options?.body instanceof FormData;
  return fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiClient(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
