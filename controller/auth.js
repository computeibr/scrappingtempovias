require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');

// Perfis: 1=View, 2=User, 99=Admin
const PERFIS = { 1: 'View', 2: 'User', 99: 'Admin' };

function perfilNome(id) {
  return PERFIS[id] || `Perfil ${id}`;
}

// Middleware: verifica JWT e exige perfilId=99 (Admin)
async function soAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: true, mensagem: 'Não autenticado.' });
  const [, token] = authHeader.split(' ');
  if (!token) return res.status(401).json({ erro: true, mensagem: 'Não autenticado.' });
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.SECRET);
    if (decoded.role !== 99) {
      return res.status(403).json({ erro: true, mensagem: 'Acesso restrito a administradores.' });
    }
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ erro: true, mensagem: 'Sessão expirada. Faça login novamente.' });
  }
}

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

// POST /api/auth/criar-usuario — apenas Admin
router.post('/criar-usuario', soAdmin, async (req, res) => {
  const { name, email, password, perfilId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ erro: true, mensagem: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const perfil = parseInt(perfilId) || 1;
  if (![1, 2, 99].includes(perfil)) {
    return res.status(400).json({ erro: true, mensagem: 'Perfil inválido. Use: 1=View, 2=User, 99=Admin.' });
  }

  const existe = await User.findOne({ where: { email } });
  if (existe) {
    return res.status(400).json({ erro: true, mensagem: 'E-mail já cadastrado.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash, perfilId: perfil });

  return res.status(201).json({
    erro: false,
    mensagem: 'Usuário criado com sucesso.',
    user: { id: user.id, name: user.name, email: user.email, perfilId: user.perfilId, perfil: perfilNome(user.perfilId) },
  });
});

// GET /api/auth/usuarios — lista todos (Admin)
router.get('/usuarios', soAdmin, async (req, res) => {
  const usuarios = await User.findAll({
    attributes: ['id', 'name', 'email', 'perfilId', 'createdAt'],
    order: [['createdAt', 'ASC']],
  });
  return res.json(usuarios.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    perfilId: u.perfilId,
    perfil: perfilNome(u.perfilId),
    createdAt: u.createdAt,
  })));
});

// PUT /api/auth/usuarios/:id — edita nome, email, perfil e/ou senha (Admin)
router.put('/usuarios/:id', soAdmin, async (req, res) => {
  const { name, email, perfilId, password } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ erro: true, mensagem: 'Usuário não encontrado.' });

  if (name) user.name = name;
  if (email) {
    const existe = await User.findOne({ where: { email } });
    if (existe && existe.id !== user.id) {
      return res.status(400).json({ erro: true, mensagem: 'E-mail já está em uso.' });
    }
    user.email = email;
  }
  if (perfilId !== undefined) {
    const perfil = parseInt(perfilId);
    if (![1, 2, 99].includes(perfil)) {
      return res.status(400).json({ erro: true, mensagem: 'Perfil inválido.' });
    }
    user.perfilId = perfil;
  }
  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  await user.save();
  return res.json({
    erro: false,
    mensagem: 'Usuário atualizado.',
    user: { id: user.id, name: user.name, email: user.email, perfilId: user.perfilId, perfil: perfilNome(user.perfilId) },
  });
});

// DELETE /api/auth/usuarios/:id — remove usuário (Admin, não pode remover a si mesmo)
router.delete('/usuarios/:id', soAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.userId) {
    return res.status(400).json({ erro: true, mensagem: 'Você não pode remover sua própria conta.' });
  }
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ erro: true, mensagem: 'Usuário não encontrado.' });
  await user.destroy();
  return res.json({ erro: false, mensagem: 'Usuário removido.' });
});

module.exports = router;
