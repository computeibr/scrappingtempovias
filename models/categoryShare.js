const Sequelize = require('sequelize');
const db = require('./db');

// Compartilhamento por categoria (regra contínua): vale para as rotas que ownerId
// criou nessa categoria, inclusive as adicionadas depois.
// email NULL = categoria pública (todos os usuários logados veem).
const CategoryShare = db.define('category_shares', {
    id:        { type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    ownerId:   { type: Sequelize.INTEGER, allowNull: false },
    categoria: { type: Sequelize.STRING(100), allowNull: false },
    email:     { type: Sequelize.STRING(150), allowNull: true },
}, { freezeTableName: true });

// CategoryShare.sync();
module.exports = CategoryShare;
