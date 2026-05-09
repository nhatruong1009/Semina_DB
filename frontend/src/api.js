import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:9000/api'
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const authAPI = {
  register: (email, password, name) => API.post('/auth/register', { email, password, name }),
  login: (email, password) => API.post('/auth/login', { email, password }),
  refresh: (user_id, refreshToken) => API.post('/auth/refresh', {user_id, refreshToken }),
  logout: (user_id, refreshToken) => API.post('/auth/logout', {user_id, refreshToken }),
};

export const userAPI = {
  getProfile: (id) => API.get(`/users/profile/${id}`),
  getAllUsers: () => API.get('/users/all'),
  follow: (id) => API.post(`/users/follow/${id}`),
  unfollow: (id) => API.post(`/users/unfollow/${id}`)
};

export const postAPI = {
  createPost: (content, media) => API.post('/posts/create', { content, media }),
  getFeed: () => API.get('/posts/feed'),
  likePost: (id) => API.post(`/posts/${id}/like`),
  unlikePost: (id) => API.post(`/posts/${id}/unlike`),
  commentPost: (id, text) => API.post(`/posts/${id}/comment`, { text }),
  sharePost: (id) => API.post(`/posts/${id}/share`),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const jobAPI = {
  createJob: (title, company_id, location, description, salary_range) =>
    API.post('/jobs/create', { title, company_id, location, description, salary_range }),
  updateJob: (id, title, location, description, salary_range) =>
    API.put(`/jobs/${id}`, { title, location, description, salary_range }),
  deleteJob: (id) => API.delete(`/jobs/${id}`),
  getJobs: () => API.get('/jobs'),
  getMyJobs: () => API.get('/jobs/my-jobs'),
  getJobApplicants: (id) => API.get(`/jobs/${id}/applicants`),
  applyJob: (id) => API.post(`/jobs/${id}/apply`),
  getApplied: () => API.get('/jobs/applied'),
};


export const networkAPI = {
  getSuggestions: (userId, params) => API.get(`/users/suggestions/${userId}`, { params }),
  getSuggestionsAll: (userId, params) => API.get(`/users/suggestions-all/${userId}`, { params }),
  getMutual: (userId1, userId2) => API.get(`/users/mutual/${userId1}/${userId2}`),
  getJobRecommendations: (userId) => API.get(`/users/job-recommendations/${userId}`),
  getSameSchool: (userId, params) => API.get(`/users/same-school/${userId}`, { params }),
  getSameCompany: (userId, params) => API.get(`/users/same-company/${userId}`, { params }),
  connect: (userId1, userId2) => API.post('/users/connect', { userId1, userId2 }),
  follow: (followerId, followeeId) => API.post('/users/follow', { followerId, followeeId }),
  unfollow: (followeeId) => API.post('/users/unfollow', { followeeId }),
  getPostInteractions: (postId) => API.get(`/posts/${postId}/interactions`),
  getNetworkFeed: () => API.get('/posts/feed/network'),
  getFollowers: (userId) => API.get(`/users/followers/${userId}`),
  getFollowing: (userId) => API.get(`/users/following/${userId}`),
};

export const companyAPI = {
  getCompanies: () => API.get('/companies'),
  getMyCompanies: () => API.get('/companies/my'),
  addUser: (companyId, userId, role) => API.post(`/companies/${companyId}/add-user`, { userId, role }),
  getCompanyUsers: (companyId) => API.get(`/companies/${companyId}/users`),
  deactivateUser: (companyId, userId) => API.delete(`/companies/${companyId}/users/${userId}`)
};

export const adminCompanyAPI = {
  createCompanyWithAdmin: (name, industry, description, email) => API.post('/admin/companies/create', { name, industry, description, email }),
  getAllCompanies: () => API.get('/admin/companies'),
};



let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

function addSubscriber(callback) {
  refreshSubscribers.push(callback);
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Already refreshing → queue this request
        return new Promise((resolve) => {
          addSubscriber((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(API(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const savedUser = localStorage.getItem('user');
        if (!refreshToken || !savedUser) {
          localStorage.clear();
          return Promise.reject(error);
        }

        const parsedUser = JSON.parse(savedUser);
        const res = await authAPI.refresh(parsedUser.id, refreshToken);
        const newAccessToken = res.data.token;

        localStorage.setItem('token', newAccessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }

        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        localStorage.clear();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
