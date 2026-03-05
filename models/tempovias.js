const Sequelize = require('sequelize');
const db = require('./db');
const Rotasvia = require('../models/rotasvia');



const TempoVias = db.define('tempovias', {
   
    viaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: Rotasvia, // Referencia ao modelo TvTempoVia
          key: 'id',
        },
      },
    id: {type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true},
    nomedarota: {type: Sequelize.STRING, allowNull: true},
    tempo: {type: Sequelize.STRING, allowNull: true},
    km: {type: Sequelize.STRING, allowNull: true},
    leitura: {type: Sequelize.DATE, allowNull: true},
    urlfoto: {type: Sequelize.STRING},
});


//TempoVias.sync();

module.exports = TempoVias;
