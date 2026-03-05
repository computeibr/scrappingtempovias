function badRequest(res, message) {
  return res.status(400).json({
    erro: true,
    mensagem: message,
  });
}

function notFound(res, message) {
  return res.status(404).json({
    erro: true,
    mensagem: message,
  });
}

module.exports = {
  badRequest,
  notFound,
};
