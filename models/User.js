const Sequelize = require('sequelize');
const db = require('./db');

// Perfis: 1=View (somente leitura), 2=User (padrão), 99=Admin (acesso total)
const User = db.define('users', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
  name: { type: Sequelize.STRING(100), allowNull: false },
  email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
  password: { type: Sequelize.STRING, allowNull: false },
  perfilId: { type: Sequelize.INTEGER, defaultValue: 1 },
}, { freezeTableName: true });

// User.sync();
module.exports = User;
