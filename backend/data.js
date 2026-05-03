const bcryptjs = require('bcryptjs');

const users = [
  {
    id: 1,
    email: 'john@example.com',
    password: bcryptjs.hashSync('password123', 10),
    name: 'John Doe',
    title: 'Software Engineer',
    bio: 'Passionate about coding',
    followers: [2],
    following: [2],
    profileImage: 'https://via.placeholder.com/150?text=John'
  },
  {
    id: 2,
    email: 'jane@example.com',
    password: bcryptjs.hashSync('password123', 10),
    name: 'Jane Smith',
    title: 'Product Manager',
    bio: 'Building great products',
    followers: [1],
    following: [1],
    profileImage: 'https://via.placeholder.com/150?text=Jane'
  }
];

const posts = [
  {
    id: 1,
    userId: 1,
    content: 'Just launched my new project!',
    image: null,
    likes: [2],
    comments: [
      { userId: 2, text: 'Awesome work!', id: 1 }
    ],
    shares: 0,
    createdAt: new Date()
  }
];

const jobs = [
  {
    id: 1,
    postedBy: 2,
    title: 'React Developer',
    company: 'Tech Corp',
    location: 'San Francisco',
    description: 'We are looking for an experienced React developer',
    salary: '$120k-150k',
    applications: [],
    createdAt: new Date()
  }
];

const nextIds = {
  users: 3,
  posts: 2,
  jobs: 2,
  comments: 2
};

module.exports = { users, posts, jobs, nextIds };