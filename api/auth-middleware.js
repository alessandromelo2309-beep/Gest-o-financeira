const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gestao-financeira-secret-2026';

function authMiddleware(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

module.exports = { authMiddleware, JWT_SECRET };
