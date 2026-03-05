const express = require("express");
const Sequelize = require('sequelize');
const router = express.Router();

const yup = require('yup');
const { Op } = require("sequelize");
const bcrypt = require('bcryptjs');

const Rotasvia = require('../models/rotasvia');
const { eAdmin } = require('../middlewares/auth');


router.get("/rotasvia", async (req, res) => {

    await Rotasvia.findAll({
        order: [['id', 'ASC']]
    })
        .then((rotasvias) => {
            return res.json({
                rotasvias
            });
        }).catch(() => {
            return res.status(400).json({
                erro: true,
                mensagem: "Erro: Nenhuma Via encontrada!"
            });
        });
});

router.post("/rotasvia", eAdmin, async (req, res) => {
    const { name, url, geometry } = req.body;

    if (!name || !url) {
        return res.status(400).json({ erro: true, mensagem: "Nome e URL são obrigatórios." });
    }

    await Rotasvia.create({ name, url, geometry: geometry || null })
        .then((rota) => res.status(201).json({ erro: false, mensagem: "Rota cadastrada com sucesso!", rota }))
        .catch(() => res.status(400).json({ erro: true, mensagem: "Erro ao cadastrar rota." }));
});

router.delete("/rotasvia/:id", eAdmin, async (req, res) => {
    const { id } = req.params;

    await Rotasvia.destroy({ where: { id } })
        .then((deleted) => {
            if (!deleted) return res.status(404).json({ erro: true, mensagem: "Rota não encontrada." });
            return res.json({ erro: false, mensagem: "Rota removida com sucesso!" });
        })
        .catch(() => res.status(400).json({ erro: true, mensagem: "Erro ao remover rota." }));
});

module.exports = router;