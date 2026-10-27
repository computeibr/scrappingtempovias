const { Op } = require('sequelize');
const Rotasvia      = require('../models/rotasvia');
const RouteShare    = require('../models/routeShare');
const CategoryShare = require('../models/categoryShare');
const User          = require('../models/User');

// Condições (OR) que tornam uma rota visível a um usuário não-admin:
// criadas por ele + legadas (creatorId null) + públicas + compartilhadas com seu e-mail
// + rotas do dono numa categoria pública ou compartilhada com seu e-mail
async function condicoesVisibilidade(userId) {
    const me = await User.findByPk(userId, { attributes: ['email'] });
    const email = me?.email || '';

    const [sharedRoutes, regrasCategoria] = await Promise.all([
        RouteShare.findAll({ where: { email }, attributes: ['routeId'] }),
        CategoryShare.findAll({
            where: { [Op.or]: [{ email: null }, { email }] },
            attributes: ['ownerId', 'categoria'],
        }),
    ]);
    const sharedIds = sharedRoutes.map(s => s.routeId);

    return [
        { creatorId: userId },
        { creatorId: null },
        { publica: true },
        ...(sharedIds.length ? [{ id: { [Op.in]: sharedIds } }] : []),
        ...regrasCategoria.map(r => ({ creatorId: r.ownerId, categoria: r.categoria })),
    ];
}

// Retorna Rotasvia.findAll() filtrado pelas rotas visíveis ao usuário (Admin → todas)
async function rotasVisiveis(userId, userRole, options = {}) {
    if (userRole === 99) {
        return Rotasvia.findAll(options);
    }
    return Rotasvia.findAll({
        where: { [Op.or]: await condicoesVisibilidade(userId) },
        ...options,
    });
}

module.exports = rotasVisiveis;
