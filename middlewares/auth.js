const jwt = require('jsonwebtoken');
const { promisify } = require('util');
require('dotenv').config();

module.exports = {
  // Verifica JWT válido (qualquer perfil autenticado)
  async eAdmin(req, res, next) {
    // return res.json({messagem: "Validar token"});
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Erro: Necessário realizar o login para acessar a página!',
      });
    }

    const [bearer, token] = authHeader.split(' ');

    if (!token) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Erro: Necessário realizar o login para acessar a página!',
      });
    }

    try {
      const decoded = await promisify(jwt.verify)(token, process.env.SECRET);
      req.userId = decoded.id;
      req.locals = { role: decoded.role };
      res.locals = { role: decoded.role };
      // req.levelAcess = decoded.levelAcess;

      return next();
    } catch (err) {
      const motivo = err.name === 'TokenExpiredError' ? 'token expirado' : 'token inválido';
      console.log(`Auth rejeitada — ${motivo} (${req.method} ${req.path})`);
      return res.status(401).json({
        erro: true,
        mensagem: 'Sessão expirada. Faça login novamente.',
      });
    }
  },

  // Verifica JWT válido E perfilId=99 (Admin)
  async soAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ erro: true, mensagem: 'Necessário realizar o login.' });
    }
    const [, token] = authHeader.split(' ');
    if (!token) {
      return res.status(401).json({ erro: true, mensagem: 'Necessário realizar o login.' });
    }
    try {
      const decoded = await promisify(jwt.verify)(token, process.env.SECRET);
      if (decoded.role !== 99) {
        return res.status(403).json({ erro: true, mensagem: 'Acesso restrito a administradores.' });
      }
      req.userId = decoded.id;
      req.locals = { role: decoded.role };
      res.locals = { role: decoded.role };
      return next();
    } catch (err) {
      const motivo = err.name === 'TokenExpiredError' ? 'token expirado' : 'token inválido';
      console.log(`Auth rejeitada — ${motivo} (${req.method} ${req.path})`);
      return res.status(401).json({ erro: true, mensagem: 'Sessão expirada. Faça login novamente.' });
    }
  },
};
