const Sequelize = require('sequelize');
const db = require('./db');

const Rotasvia = db.define('tv_tempo_via', {
    id:        { type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    name:      { type: Sequelize.STRING(100) },
    url:       { type: Sequelize.TEXT },
    geometry:  { type: Sequelize.TEXT },
    categoria: { type: Sequelize.STRING(100), allowNull: true },
    creatorId: { type: Sequelize.INTEGER, allowNull: true },
}, { freezeTableName: true });

// Rotasvia.sync();
module.exports = Rotasvia;