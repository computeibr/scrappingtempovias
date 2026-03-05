const express = require("express");
const Sequelize = require('sequelize');
const router = express.Router();

const yup = require('yup');
const { Op } = require("sequelize");
const bcrypt = require('bcryptjs');

const Rotasvia = require('../models/rotasvia');


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

module.exports = router;