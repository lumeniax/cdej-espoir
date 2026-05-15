const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

let _getToken: () => string | null = () => null;
export function setApiClientTokenGetter(fn: () => string | null) {
  _getToken = fn;
}

/**
 * Wrapper bas-niveau autour de `fetch` qui :
 *  - applique automatiquement le BASE_URL Vite (utile pour les déploiements
 *    sous-chemin comme GitHub Pages),
 *  - injecte le header `Authorization: Bearer <token>` quand un token est connu,
 *  - n'écrase pas le `Content-Type` quand on envoie un `FormData`,
 *  - inclut les credentials (cookies) pour permettre le refresh JWT.
 */
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

/**
 * Wrapper haut-niveau qui :
 *  - parse la réponse JSON,
 *  - gère proprement les réponses sans corps (204, HEAD, Content-Length: 0),
 *  - lève une erreur avec le message du serveur en cas d'échec HTTP.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiClient(path, options);

  // Réponses sans corps : 204 No Content / 205 Reset / 304 Not Modified / HEAD
  const noBody =
    res.status === 204 ||
    res.status === 205 ||
    res.status === 304 ||
    res.headers.get("content-length") === "0" ||
    (options?.method ?? "GET").toUpperCase() === "HEAD";

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (!noBody) {
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message ?? message;
      } catch {
        // corps non-JSON, on ignore
      }
    }
    throw new Error(message);
  }

  if (noBody) {
    return undefined as unknown as T;
  }

  // Certains endpoints renvoient 200 sans corps : on retourne `undefined` plutôt
  // que de planter sur `.json()`.
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}
