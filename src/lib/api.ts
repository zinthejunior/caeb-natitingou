const BASE_URL = "http://localhost:8000/api";

function getHeaders() {
  const token = localStorage.getItem('caeb_token');
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  if (!res.ok) {
    let err = `API error ${res.status}`;
    try { const errObj = await res.json(); err = JSON.stringify(errObj); } catch { /* ignore */ }
    throw new Error(err);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/auth/me/'),
  logout: () => request<any>('/auth/logout/', { method: 'POST' }),

  // Data
  getBooks: (qs: string = "") => request<any[]>(`/books/${qs ? `?${qs}` : ''}`),
  getBook: (id: string | number) => request<any>(`/books/${id}/`),
  
  getClubs: () => request<any[]>('/clubs/'),
  getClub: (id: string | number) => request<any>(`/clubs/${id}/`),
  
  getEvents: () => request<any[]>('/events/'),
  getEvent: (id: string | number) => request<any>(`/events/${id}/`),
  
  getNewsList: () => request<any[]>('/news/'),
  getNews: (id: string | number) => request<any>(`/news/${id}/`),

  getGenres: () => request<any[]>('/genres/'),
  getEducationLevels: () => request<any[]>('/education-levels/'),
  
  getBorrows: () => request<any[]>('/borrows/'),
  createBorrow: (bookId: number) => request<any>('/borrows/', { method: 'POST', body: JSON.stringify({ book: bookId }) }),

  // AI & Recommendations
  chat: (message: string) => request<any>('/chat/', { method: 'POST', body: JSON.stringify({ message }) }),
  getRecommendations: () => request<any[]>('/recommendations/'),

  // Lab
  getLabStations: () => request<any[]>('/lab_stations/'),
  getLabReservations: () => request<any[]>('/lab_reservations/'),
  createLabReservation: (data: any) => request<any>('/lab_reservations/', { method: 'POST', body: JSON.stringify(data) }),
};