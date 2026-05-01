const Sequelize = require('sequelize');
const db = require('./db');

const RouteShare = db.define('route_shares', {
    id:      { type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    routeId: { type: Sequelize.INTEGER, allowNull: false },
    email:   { type: Sequelize.STRING(150), allowNull: false },
}, { freezeTableName: true });

// RouteShare.sync();
module.exports = RouteShare;
