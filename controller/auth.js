require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ erro: true, mensagem: 'E-mail e senha são obrigatórios.' });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ erro: true, mensagem: 'Credenciais inválidas.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ erro: true, mensagem: 'Credenciais inválidas.' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.perfilId },
    process.env.SECRET,
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, perfilId: user.perfilId },
  });
});

// POST /api/auth/criar-usuario (apenas admin ou primeiro uso)
router.post('/criar-usuario', async (req, res) => {
  const { name, email, password, perfilId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ erro: true, mensagem: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const existe = await User.findOne({ where: { email } });
  if (existe) {
    return res.status(400).json({ erro: true, mensagem: 'E-mail já cadastrado.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash, perfilId: perfilId || 1 });

  return res.status(201).json({
    erro: false,
    mensagem: 'Usuário criado com sucesso.',
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
