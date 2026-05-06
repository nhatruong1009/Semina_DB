# LinkedIn Clone

A full-stack LinkedIn clone application built with React and Node.js/Express using temporary in-memory data storage.

## Features

✅ **Authentication**
- User registration and login with JWT
- Secure password hashing with bcryptjs

✅ **Posts**
- Create posts with content
- Like/unlike posts
- Comment on posts
- Share posts

✅ **Follow System**
- Follow/unfollow users
- View follower counts
- See only posts from followed users in feed

✅ **Jobs**
- Post job listings
- Browse available jobs
- Apply to jobs

✅ **Network**
- Browse all users
- View user profiles with title and bio
- Follow/unfollow directly from network page

## Getting Started

### Prerequisites
- Node.js 14+
- npm

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:9000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## Default Test Accounts

Email: `john@example.com`
Password: `password123`

Email: `jane@example.com`
Password: `password123`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/all` - Get all users
- `GET /api/users/profile/:id` - Get user profile
- `POST /api/users/follow/:id` - Follow user
- `POST /api/users/unfollow/:id` - Unfollow user

### Posts
- `POST /api/posts/create` - Create post
- `GET /api/posts/feed` - Get user feed
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/unlike` - Unlike post
- `POST /api/posts/:id/comment` - Comment on post
- `POST /api/posts/:id/share` - Share post

### Jobs
- `POST /api/jobs/create` - Post job
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs/:id/apply` - Apply to job

## Notes

- Currently uses in-memory storage (data resets on server restart)
- Will integrate with MongoDB database in future updates
- JWT tokens stored in localStorage on client
