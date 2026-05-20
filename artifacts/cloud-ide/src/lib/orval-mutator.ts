import { getToken } from "./api-config";

export const customFetch = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw Object.assign(new Error(error.error ?? response.statusText), {
      status: response.status,
      statusText: response.statusText,
      data: error,
    });
  }

  if (response.status === 204) return undefined as T;
  return response.json();
};
