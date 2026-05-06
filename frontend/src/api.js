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
  login: (email, password) => API.post('/auth/login', { email, password })
};

export const userAPI = {
  getProfile: (id) => API.get(`/users/profile/${id}`),
  getAllUsers: () => API.get('/users/all'),
  follow: (id) => API.post(`/users/follow/${id}`),
  unfollow: (id) => API.post(`/users/unfollow/${id}`)
};

export const postAPI = {
  createPost: (content, image) => API.post('/posts/create', { content, image }),
  getFeed: () => API.get('/posts/feed'),
  likePost: (id) => API.post(`/posts/${id}/like`),
  unlikePost: (id) => API.post(`/posts/${id}/unlike`),
  commentPost: (id, text) => API.post(`/posts/${id}/comment`, { text }),
  sharePost: (id) => API.post(`/posts/${id}/share`)
};

export const jobAPI = {
  createJob: (title, company, location, description, salary) => 
    API.post('/jobs/create', { title, company, location, description, salary }),
  getJobs: () => API.get('/jobs'),
  applyJob: (id) => API.post(`/jobs/${id}/apply`)
};
