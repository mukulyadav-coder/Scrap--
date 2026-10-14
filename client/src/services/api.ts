const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const resolveMediaUrl = (path: string): string =>
  new URL(path, new URL(API_BASE_URL, window.location.origin)).toString();

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json() as { detail?: string | { msg?: string }[] };
      if (typeof body.detail === 'string') {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).filter(Boolean).join(' ');
      }
    } catch {
      // Retain the HTTP status when the server response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  health: () => fetch(`${API_BASE_URL}/health`).then(async (response) => {
    if (!response.ok) throw new Error(`Health check failed (${response.status}).`);
    return response.json() as Promise<{ status: string }>;
  }),
  getProfile: (token: string) => request<Record<string, unknown>>('/users/me', token),
  getRates: (token: string) => request<Record<string, unknown>[]>('/rates', token),
  createRate: (token: string, data: unknown) => request<Record<string, unknown>>('/rates', token, json('POST', data)),
  updateRate: (token: string, rateId: string, data: unknown) => request<Record<string, unknown>>(`/rates/${encodeURIComponent(rateId)}`, token, json('PATCH', data)),
  getListings: (token: string, filters: { mine?: boolean; category?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.mine) params.set('mine', 'true');
    if (filters.category) params.set('category', filters.category);
    const query = params.size ? `?${params.toString()}` : '';
    return request<Record<string, unknown>[]>(`/listings${query}`, token);
  },
  createListing: (token: string, data: unknown) => request<Record<string, unknown>>('/listings', token, json('POST', data)),
  updateListing: (token: string, id: string, data: unknown) => request<Record<string, unknown>>(`/listings/${encodeURIComponent(id)}`, token, json('PATCH', data)),
  deleteListing: (token: string, id: string) => request<void>(`/listings/${encodeURIComponent(id)}`, token, { method: 'DELETE' }),
  getOffers: (token: string, listingId?: string) => {
    const query = listingId ? `?listing_id=${encodeURIComponent(listingId)}` : '';
    return request<Record<string, unknown>[]>(`/offers${query}`, token);
  },
  createOffer: (token: string, data: unknown) => request<Record<string, unknown>>('/offers', token, json('POST', data)),
  acceptOffer: (token: string, offerId: string) => request<Record<string, unknown>>(`/offers/${encodeURIComponent(offerId)}/accept`, token, json('POST')),
  getOrders: (token: string) => request<Record<string, unknown>[]>('/orders', token),
  settleOrder: (token: string, orderId: string, data: unknown) => request<Record<string, unknown>>(`/orders/${encodeURIComponent(orderId)}/settle`, token, json('POST', data)),
  getInventory: (token: string) => request<Record<string, unknown>[]>('/inventory', token),
  getBulkRequirements: (token: string) => request<Record<string, unknown>[]>('/bulk-requirements', token),
  createBulkRequirement: (token: string, data: unknown) => request<Record<string, unknown>>('/bulk-requirements', token, json('POST', data)),
  getVerifications: (token: string) => request<Record<string, unknown>[]>('/verifications', token),
  createVerification: (token: string, data: unknown) => request<Record<string, unknown>>('/verifications', token, json('POST', data)),
  reviewVerification: (token: string, id: string, decision: string) => request<Record<string, unknown>>(`/verifications/${encodeURIComponent(id)}/review?decision=${encodeURIComponent(decision)}`, token, json('POST')),
  getComplaints: (token: string) => request<Record<string, unknown>[]>('/complaints', token),
  resolveComplaint: (token: string, id: string, status: string, notes: string) => request<Record<string, unknown>>(`/complaints/${encodeURIComponent(id)}`, token, json('PATCH', { status, resolution_notes: notes })),
  uploadImage: async (token: string, file: File) => {
    const form = new FormData();
    form.set('image', file);
    const result = await request<{ file_path: string }>('/uploads/images', token, { method: 'POST', body: form });
    return result.file_path;
  },
};
