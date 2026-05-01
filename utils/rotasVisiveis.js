const { Op } = require('sequelize');
const Rotasvia   = require('../models/rotasvia');
const RouteShare = require('../models/routeShare');
const User       = require('../models/User');

// Retorna Rotasvia.findAll() filtrado pelas rotas visíveis ao usuário:
// Admin → todas; outros → criadas por ele + legadas (creatorId null) + compartilhadas com seu e-mail
async function rotasVisiveis(userId, userRole, options = {}) {
    if (userRole === 99) {
        return Rotasvia.findAll(options);
    }

    const me = await User.findByPk(userId, { attributes: ['email'] });
    const sharedRoutes = await RouteShare.findAll({
        where: { email: me?.email || '' },
        attributes: ['routeId'],
    });
    const sharedIds = sharedRoutes.map(s => s.routeId);

    return Rotasvia.findAll({
        where: {
            [Op.or]: [
                { creatorId: userId },
                { creatorId: null },
                ...(sharedIds.length ? [{ id: { [Op.in]: sharedIds } }] : []),
            ],
        },
        ...options,
    });
}

module.exports = rotasVisiveis;
