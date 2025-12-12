import jwt from 'jsonwebtoken';

export function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
    }
  } catch {
    // ignore invalid token; proceed unauthenticated
  }
  next();
}
