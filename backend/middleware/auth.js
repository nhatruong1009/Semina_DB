const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.email = decoded.email
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
const checkSuperAdmin = (req, res, next) => {
  // Replace with your own UUID or add a role check
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;

  console.log(SUPERADMIN_EMAIL, req.email )
  if (req.email !== SUPERADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden: only super admin can access' });
  }
  next();
};
module.exports = { verifyToken, checkSuperAdmin };