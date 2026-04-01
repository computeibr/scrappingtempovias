const express = require('express');
const router = express.Router();
const { eAdmin } = require('../middlewares/auth');
const { acl } = require('../middlewares/acl');
const DiasNaoUteis = require('../models/DiasNaoUteis');

// GET /api/feriados — lista todos (qualquer usuário autenticado)
router.get('/', eAdmin, async (req, res) => {
  try {
    const feriados = await DiasNaoUteis.findAll({ order: [['data', 'ASC']] });
    return res.json({ feriados });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// POST /api/feriados — cadastra dia não útil (somente admin)
router.post('/', eAdmin, acl([99]), async (req, res) => {
  try {
    const { data, descricao, tipo } = req.body;
    if (!data || !descricao) {
      return res.status(400).json({ erro: true, mensagem: 'Data e descrição são obrigatórios.' });
    }
    const feriado = await DiasNaoUteis.create({
      data,
      descricao: descricao.trim(),
      tipo: tipo || 'ponto_facultativo',
    });
    return res.status(201).json({ erro: false, feriado });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ erro: true, mensagem: 'Já existe um registro para esta data.' });
    }
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// DELETE /api/feriados/:id — remove dia não útil (somente admin)
router.delete('/:id', eAdmin, acl([99]), async (req, res) => {
  try {
    const deleted = await DiasNaoUteis.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ erro: true, mensagem: 'Registro não encontrado.' });
    }
    return res.json({ erro: false, mensagem: 'Removido com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

module.exports = router;
