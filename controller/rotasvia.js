const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Rotasvia   = require('../models/rotasvia');
const RouteShare = require('../models/routeShare');
const User       = require('../models/User');
const { eAdmin, soAdmin } = require('../middlewares/auth');

// Retorna true/false/null (null = rota não encontrada)
async function temPermissaoEscrita(routeId, userId, userRole) {
    if (userRole === 99) return true;
    const rota = await Rotasvia.findByPk(routeId, { attributes: ['creatorId'] });
    if (!rota) return null;
    return rota.creatorId === userId;
}

// ─── GET /rotasvia — público (usado pelo ETL, sem filtro) ─────────────────────
router.get('/rotasvia', async (req, res) => {
    try {
        const rotasvias = await Rotasvia.findAll({ order: [['id', 'ASC']] });
        return res.json({ rotasvias });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro: Nenhuma Via encontrada!' });
    }
});

// ─── GET /rotasvia/orfas — admin: rotas sem criador ───────────────────────────
router.get('/rotasvia/orfas', soAdmin, async (req, res) => {
    try {
        const rotasvias = await Rotasvia.findAll({
            where: { creatorId: null },
            order: [['id', 'ASC']],
        });
        return res.json({ rotasvias });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao listar rotas órfãs.' });
    }
});

// ─── GET /rotasvia/minhas — autenticado: rotas visíveis ao usuário ────────────
router.get('/rotasvia/minhas', eAdmin, async (req, res) => {
    const { userId, userRole } = req;
    try {
        const me = await User.findByPk(userId, { attributes: ['email'] });
        if (!me) return res.status(401).json({ erro: true, mensagem: 'Usuário não encontrado.' });

        let rotasvias;
        if (userRole === 99) {
            rotasvias = await Rotasvia.findAll({ order: [['id', 'ASC']] });
        } else {
            const sharedRoutes = await RouteShare.findAll({
                where: { email: me.email },
                attributes: ['routeId'],
            });
            const sharedIds = sharedRoutes.map(s => s.routeId);

            rotasvias = await Rotasvia.findAll({
                where: {
                    [Op.or]: [
                        { creatorId: userId },
                        { creatorId: null },
                        ...(sharedIds.length ? [{ id: { [Op.in]: sharedIds } }] : []),
                    ],
                },
                order: [['id', 'ASC']],
            });
        }

        // Busca todos os compartilhamentos das rotas retornadas
        const routeIds = rotasvias.map(r => r.id);
        const allShares = routeIds.length
            ? await RouteShare.findAll({ where: { routeId: { [Op.in]: routeIds } } })
            : [];

        const sharesByRoute = allShares.reduce((acc, s) => {
            if (!acc[s.routeId]) acc[s.routeId] = [];
            acc[s.routeId].push(s.email);
            return acc;
        }, {});

        const enriched = rotasvias.map(r => {
            const plain = r.toJSON();
            const shares = sharesByRoute[r.id] || [];
            const isCreator = plain.creatorId === userId;
            const isAdmin = userRole === 99;
            return {
                ...plain,
                canEdit: isAdmin || isCreator,
                isSharedWithMe: !isCreator && !isAdmin && plain.creatorId !== null && shares.includes(me.email),
                shares: (isCreator || isAdmin) ? shares : [],
            };
        });

        return res.json({ rotasvias: enriched });
    } catch (err) {
        console.error('Erro em /rotasvia/minhas:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao listar rotas.' });
    }
});

// ─── POST /rotasvia — cria rota vinculando ao criador ─────────────────────────
router.post('/rotasvia', eAdmin, async (req, res) => {
    const { name, url, geometry, categoria } = req.body;
    const { userId } = req;

    if (!name || !url) {
        return res.status(400).json({ erro: true, mensagem: 'Nome e URL são obrigatórios.' });
    }

    try {
        const rota = await Rotasvia.create({
            name,
            url,
            geometry:  geometry  || null,
            categoria: categoria || null,
            creatorId: userId,
        });
        return res.status(201).json({ erro: false, mensagem: 'Rota cadastrada com sucesso!', rota });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao cadastrar rota.' });
    }
});

// ─── PUT /rotasvia/:id — edita rota (criador ou admin) ───────────────────────
router.put('/rotasvia/:id', eAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, url, geometry, categoria } = req.body;
    const { userId, userRole } = req;

    if (!name || !url) {
        return res.status(400).json({ erro: true, mensagem: 'Nome e URL são obrigatórios.' });
    }

    const perm = await temPermissaoEscrita(id, userId, userRole);
    if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
    if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para editar esta rota.' });

    try {
        const [updated] = await Rotasvia.update(
            { name, url, geometry: geometry || null, categoria: categoria || null },
            { where: { id } },
        );
        if (!updated) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
        return res.json({ erro: false, mensagem: 'Rota atualizada com sucesso!' });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao atualizar rota.' });
    }
});

// ─── DELETE /rotasvia/:id — remove rota (criador ou admin) ───────────────────
router.delete('/rotasvia/:id', eAdmin, async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req;

    const perm = await temPermissaoEscrita(id, userId, userRole);
    if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
    if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para remover esta rota.' });

    try {
        const deleted = await Rotasvia.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
        return res.json({ erro: false, mensagem: 'Rota removida com sucesso!' });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao remover rota.' });
    }
});

// ─── POST /rotasvia/:id/compartilhar — adiciona e-mail ao compartilhamento ───
router.post('/rotasvia/:id/compartilhar', eAdmin, async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    const { userId, userRole } = req;

    if (!email) return res.status(400).json({ erro: true, mensagem: 'E-mail obrigatório.' });

    const perm = await temPermissaoEscrita(id, userId, userRole);
    if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
    if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para compartilhar esta rota.' });

    try {
        await RouteShare.findOrCreate({
            where: { routeId: id, email: email.toLowerCase().trim() },
        });
        return res.json({ erro: false, mensagem: 'Rota compartilhada com sucesso!' });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao compartilhar rota.' });
    }
});

// ─── DELETE /rotasvia/:id/compartilhar/:email — remove compartilhamento ──────
router.delete('/rotasvia/:id/compartilhar/:email', eAdmin, async (req, res) => {
    const { id } = req.params;
    const email = decodeURIComponent(req.params.email);
    const { userId, userRole } = req;

    const perm = await temPermissaoEscrita(id, userId, userRole);
    if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
    if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para remover compartilhamento.' });

    try {
        await RouteShare.destroy({ where: { routeId: id, email } });
        return res.json({ erro: false, mensagem: 'Compartilhamento removido.' });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao remover compartilhamento.' });
    }
});

// ─── POST /rotasvia/orfas/assumir — admin assume autoria de rotas órfãs ──────
router.post('/rotasvia/orfas/assumir', soAdmin, async (req, res) => {
    const { routeIds } = req.body;
    const { userId } = req;

    try {
        const where = Array.isArray(routeIds) && routeIds.length
            ? { id: { [Op.in]: routeIds }, creatorId: null }
            : { creatorId: null };

        const [count] = await Rotasvia.update({ creatorId: userId }, { where });
        return res.json({ erro: false, mensagem: `${count} rota(s) atribuída(s) com sucesso.` });
    } catch {
        return res.status(400).json({ erro: true, mensagem: 'Erro ao assumir rotas.' });
    }
});

module.exports = router;
