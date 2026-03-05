const express = require('express');
const Sequelize = require('sequelize');
const router = express.Router();

const yup = require('yup');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const TempoVias = require('../models/tempovias');


router.post('/tempovias', async (req, res) => {
  const dados = req.body;

  console.log(dados);

  await TempoVias.create(dados)
    .then(() => res.json({
      erro: false,
      mensagem: 'Tempo cadastrado com sucesso!',
    }))
    .catch(() => res.status(400).json({
      erro: true,
      mensagem: 'Erro: Tempo não cadastrado com sucesso!',
    }));
});


module.exports = router;