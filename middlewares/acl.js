const User = require('../models/User');

const acl = (rolesCanAccess = []) => async (req, res, next) => {
  const user = await User.findByPk(req.userId);

  if (rolesCanAccess.includes(user?.perfilId) || user.perfilId === 99) {
    next();
  } else {
    return res.status(403).json({
      erro: true,
      mensagem: 'Erro: Acesso Não Autorizado!',
    });
  }
};
module.exports = { acl };
