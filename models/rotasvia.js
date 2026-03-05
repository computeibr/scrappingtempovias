const Sequelize = require('sequelize');
const db = require('./db');

const Rotasvia = db.define('tv_tempo_via', {
    id: {type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true},
    name: {type: Sequelize.STRING(100)},
    url: {type: Sequelize.TEXT}
}, {
    freezeTableName: true
});

//Rotasvia.sync();
module.exports = Rotasvia;