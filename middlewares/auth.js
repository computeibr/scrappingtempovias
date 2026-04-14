const jwt = require('jsonwebtoken');
const { promisify } = require('util');
require('dotenv').config();

module.exports = {
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
};
