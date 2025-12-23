export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || response.statusText };
  }

  if (!response.ok) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { ...data, success: false, http_status: response.status };
    }
    return { success: false, error: text || response.statusText, http_status: response.status };
  }

  return data;
}
