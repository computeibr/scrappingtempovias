const Sequelize = require('sequelize');
const db = require('./db');

// Pedido de acesso (somente leitura) a uma rota de outro usuário.
// Ao aprovar, o criador gera um registro em route_shares com o e-mail do solicitante.
const RouteAccessRequest = db.define('route_access_requests', {
    id:          { type: Sequelize.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    routeId:     { type: Sequelize.INTEGER, allowNull: false },
    requesterId: { type: Sequelize.INTEGER, allowNull: false },
    status:      { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendente' }, // pendente | aprovado | recusado
}, { freezeTableName: true });

// RouteAccessRequest.sync();
module.exports = RouteAccessRequest;
