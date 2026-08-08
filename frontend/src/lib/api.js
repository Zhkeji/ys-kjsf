const BASE = '/api';

function getToken() {
  return localStorage.getItem('ys_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch') throw new Error('网络连接失败，请检查服务是否运行');
    throw e;
  }
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginScoped: (body, scope) => request('/auth/login', { method: 'POST', body: JSON.stringify({ ...body, scope }) }),
  me: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/password', { method: 'PUT', body: JSON.stringify(body) }),
  setStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),

  // Users
  getUser: (username) => request(`/users/${username}`),
  getUsers: (params = '') => request(`/users${params}`),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  getFollowers: (id) => request(`/users/${id}/followers`),
  getFollowing: (id) => request(`/users/${id}/following`),
  getReputation: (id) => request(`/users/${id}/reputation`),
  getOnline: () => request('/users/online/list'),
  getLeaderboard: () => request('/users/leaderboard/top'),

  // Categories
  getCategories: () => request('/categories'),
  getCategory: (slug) => request(`/categories/${slug}`),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Threads
  getThreads: (params = '') => request(`/threads${params}`),
  getTrending: () => request('/threads/trending/week'),
  getThread: (id) => request(`/threads/${id}`),
  createThread: (body) => request('/threads', { method: 'POST', body: JSON.stringify(body) }),
  updateThread: (id, body) => request(`/threads/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteThread: (id) => request(`/threads/${id}`, { method: 'DELETE' }),
  moderateThread: (id, body) => request(`/threads/${id}/moderate`, { method: 'PATCH', body: JSON.stringify(body) }),
  getPosts: (id, params = '') => request(`/threads/${id}/posts${params}`),
  createPost: (id, body) => request(`/threads/${id}/posts`, { method: 'POST', body: JSON.stringify(body) }),
  updatePost: (postId, body) => request(`/threads/posts/${postId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePost: (postId) => request(`/threads/posts/${postId}`, { method: 'DELETE' }),
  markBestAnswer: (postId) => request(`/threads/posts/${postId}/best`, { method: 'POST' }),
  votePoll: (threadId, body) => request(`/threads/${threadId}/poll/vote`, { method: 'POST', body: JSON.stringify(body) }),

  // Social
  react: (body) => request('/social/react', { method: 'POST', body: JSON.stringify(body) }),
  getBookmarks: (params = '') => request(`/social/bookmarks${params}`),
  toggleBookmark: (threadId) => request(`/social/bookmarks/${threadId}`, { method: 'POST' }),
  getTags: () => request('/social/tags'),
  getTag: (slug) => request(`/social/tags/${slug}`),

  // Notifications
  getNotifications: (params = '') => request(`/notifications${params}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  readAllNotifications: () => request('/notifications/read-all', { method: 'POST' }),
  readNotification: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // Messages
  getConversations: () => request('/messages'),
  startConversation: (userId) => request(`/messages/with/${userId}`, { method: 'POST' }),
  getMessages: (id, params = '') => request(`/messages/${id}/messages${params}`),
  sendMessage: (id, body) => request(`/messages/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),

  // Chat
  getChatRooms: () => request('/chat/rooms'),
  getChatMessages: (roomId) => request(`/chat/rooms/${roomId}/messages`),
  sendChatMessage: (roomId, body) => request(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  createChatRoom: (body) => request('/chat/rooms', { method: 'POST', body: JSON.stringify(body) }),

  // Search
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  suggest: (q) => request(`/search/suggest?q=${encodeURIComponent(q)}`),

  // Events
  getEvents: () => request('/events'),
  createEvent: (body) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  attendEvent: (id, status) => request(`/events/${id}/attend`, { method: 'POST', body: JSON.stringify({ status }) }),
  unattendEvent: (id) => request(`/events/${id}/attend`, { method: 'DELETE' }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Admin
  getStats: () => request('/admin/stats'),
  getAdminUsers: (params = '') => request(`/admin/users${params}`),
  patchUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getReports: () => request('/admin/reports'),
  createReport: (body) => request('/admin/reports', { method: 'POST', body: JSON.stringify(body) }),
  patchReport: (id, body) => request(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getBadges: () => request('/admin/badges'),
  createBadge: (body) => request('/admin/badges', { method: 'POST', body: JSON.stringify(body) }),
  awardBadge: (id, userId) => request(`/admin/badges/${id}/award`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // Upload
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/upload/image', { method: 'POST', body: fd, headers: {} });
  },
};
