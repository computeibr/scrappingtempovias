const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Rotasvia   = require('../models/rotasvia');
const RouteShare = require('../models/routeShare');
const RouteAccessRequest = require('../models/routeAccessRequest');
const CategoryShare = require('../models/categoryShare');
const rotasVisiveis = require('../utils/rotasVisiveis');
const User       = require('../models/User');
const { eAdmin, soAdmin } = require('../middlewares/auth');

// Retorna true/false/null (null = rota não encontrada)
async function temPermissaoEscrita(routeId, userId, userRole) {
    if (userRole === 99) return true;
    const rota = await Rotasvia.findByPk(routeId, { attributes: ['creatorId'] });
    if (!rota) return null;
    return rota.creatorId === userId;
}

// ─── Detecção de rotas parecidas ─────────────────────────────────────────────
const STOPWORDS = new Set([
    'av', 'avenida', 'rua', 'r', 'estrada', 'estr', 'sentido', 'de', 'da', 'do', 'das', 'dos',
    'e', 'a', 'o', 'ate', 'para', 'pra', 'via', 'rota', 'x', 'km', 'id',
]);

function tokensNome(nome) {
    return new Set(
        (nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(t => t.length >= 2 && !/^\d+$/.test(t) && !STOPWORDS.has(t)),
    );
}

// Parecido = pelo menos 2 palavras em comum (ou todas, se o nome digitado tiver só 1)
// e ≥ 60% das palavras do nome menor
function nomesParecidos(a, b) {
    const ta = tokensNome(a), tb = tokensNome(b);
    if (!ta.size || !tb.size) return false;
    let comuns = 0;
    ta.forEach(t => { if (tb.has(t)) comuns++; });
    return comuns >= Math.min(2, ta.size) && comuns / Math.min(ta.size, tb.size) >= 0.6;
}

// Primeiro e último ponto de uma encoded polyline do Google
function extremosPolyline(enc) {
    if (!enc) return null;
    let i = 0, lat = 0, lng = 0, primeiro = null;
    while (i < enc.length) {
        for (let k = 0; k < 2; k++) {
            let shift = 0, result = 0, b;
            do {
                b = enc.charCodeAt(i++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const d = (result & 1) ? ~(result >> 1) : (result >> 1);
            if (k === 0) lat += d; else lng += d;
        }
        if (!primeiro) primeiro = [lat / 1e5, lng / 1e5];
    }
    if (!primeiro) return null;
    return { inicio: primeiro, fim: [lat / 1e5, lng / 1e5] };
}

function distanciaM([lat1, lng1], [lat2, lng2]) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Início e fim precisam estar a até 15% do comprimento da rota (teto de 200 m) —
// evita que rotas curtas em sentidos opostos (ex.: Av. Delfim Moreira, ~140 m) pareçam iguais
function mesmoTrajeto(a, b) {
    const comprimento = Math.min(distanciaM(a.inicio, a.fim), distanciaM(b.inicio, b.fim));
    const tolerancia = Math.min(200, comprimento * 0.15);
    return distanciaM(a.inicio, b.inicio) <= tolerancia && distanciaM(a.fim, b.fim) <= tolerancia;
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

        const rotasvias = await rotasVisiveis(userId, userRole, { order: [['id', 'ASC']] });

        // Categorias compartilhadas diretamente com meu e-mail (para o badge "compartilhado")
        const minhasCategorias = await CategoryShare.findAll({
            where: { email: me.email },
            attributes: ['ownerId', 'categoria'],
        });
        const categoriaComigo = new Set(minhasCategorias.map(c => `${c.ownerId}|${c.categoria}`));

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
                isSharedWithMe: !isCreator && !isAdmin && plain.creatorId !== null
                    && (shares.includes(me.email) || categoriaComigo.has(`${plain.creatorId}|${plain.categoria}`)),
                shares: (isCreator || isAdmin) ? shares : [],
            };
        });

        return res.json({ rotasvias: enriched });
    } catch (err) {
        console.error('Erro em /rotasvia/minhas:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao listar rotas.' });
    }
});

// ─── POST /rotasvia/similares — rotas parecidas com a que está sendo criada ──
// Retorna só nome, categoria, criador e situação de acesso (nunca URL/traçado).
router.post('/rotasvia/similares', eAdmin, async (req, res) => {
    const { name, geometry } = req.body;
    const { userId, userRole } = req;

    try {
        const ext = extremosPolyline(geometry);
        const todas = await Rotasvia.findAll({
            attributes: ['id', 'name', 'categoria', 'geometry', 'creatorId', 'publica'],
        });

        const candidatas = [];
        for (const r of todas) {
            const er = ext && extremosPolyline(r.geometry);
            let motivo = null;
            if (er && mesmoTrajeto(ext, er)) {
                motivo = 'trajeto';
            } else if (name && nomesParecidos(name, r.name)) {
                motivo = 'nome';
            }
            if (motivo) candidatas.push({ r, motivo });
        }
        candidatas.sort((a, b) => (a.motivo === 'trajeto' ? 0 : 1) - (b.motivo === 'trajeto' ? 0 : 1));
        const top = candidatas.slice(0, 8);
        if (!top.length) return res.json({ similares: [] });

        const ids = top.map(c => c.r.id);
        const creatorIds = [...new Set(top.map(c => c.r.creatorId).filter(Boolean))];
        const [criadores, visiveis, pedidos] = await Promise.all([
            creatorIds.length ? User.findAll({ where: { id: creatorIds }, attributes: ['id', 'name'] }) : [],
            rotasVisiveis(userId, userRole, { attributes: ['id'] }),
            RouteAccessRequest.findAll({ where: { routeId: ids, requesterId: userId }, attributes: ['routeId', 'status'] }),
        ]);
        const nomeCriador = Object.fromEntries(criadores.map(u => [u.id, u.name]));
        const idsVisiveis = new Set(visiveis.map(v => v.id));
        const statusPedido = Object.fromEntries(pedidos.map(p => [p.routeId, p.status]));

        const similares = top.map(({ r, motivo }) => {
            let acesso = 'sem_acesso';
            if (r.creatorId === userId) acesso = 'propria';
            else if (idsVisiveis.has(r.id)) acesso = 'visivel';
            return {
                id: r.id,
                name: r.name,
                categoria: r.categoria,
                criador: r.creatorId ? (nomeCriador[r.creatorId] || 'usuário removido') : 'rota legada',
                motivo,
                acesso,
                pedido: acesso === 'sem_acesso' ? (statusPedido[r.id] || null) : null,
            };
        });
        return res.json({ similares });
    } catch (err) {
        console.error('Erro em /rotasvia/similares:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao buscar rotas parecidas.' });
    }
});

// ─── POST /rotasvia/:id/pedir-acesso — solicita visualização ao criador ──────
router.post('/rotasvia/:id/pedir-acesso', eAdmin, async (req, res) => {
    const { id } = req.params;
    const { userId } = req;

    try {
        const rota = await Rotasvia.findByPk(id, { attributes: ['id', 'creatorId'] });
        if (!rota) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
        if (!rota.creatorId) return res.status(400).json({ erro: true, mensagem: 'Rotas legadas já são visíveis a todos.' });
        if (rota.creatorId === userId) return res.status(400).json({ erro: true, mensagem: 'Você é o criador desta rota.' });

        const [pedido, criado] = await RouteAccessRequest.findOrCreate({
            where: { routeId: rota.id, requesterId: userId },
            defaults: { status: 'pendente' },
        });
        if (!criado && pedido.status !== 'pendente') await pedido.update({ status: 'pendente' });
        return res.json({ erro: false, mensagem: 'Pedido de acesso enviado ao criador da rota.' });
    } catch (err) {
        console.error('Erro em /pedir-acesso:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao pedir acesso.' });
    }
});

// ─── GET /rotasvia/pedidos — pedidos pendentes nas rotas do usuário (admin: todas)
router.get('/rotasvia/pedidos', eAdmin, async (req, res) => {
    const { userId, userRole } = req;

    try {
        const rotas = await Rotasvia.findAll({
            where: userRole === 99 ? {} : { creatorId: userId },
            attributes: ['id', 'name'],
        });
        if (!rotas.length) return res.json({ pedidos: [] });
        const nomeRota = Object.fromEntries(rotas.map(r => [r.id, r.name]));

        const pedidos = await RouteAccessRequest.findAll({
            where: { routeId: rotas.map(r => r.id), status: 'pendente' },
            order: [['createdAt', 'ASC']],
        });
        if (!pedidos.length) return res.json({ pedidos: [] });

        const solicitantes = await User.findAll({
            where: { id: [...new Set(pedidos.map(p => p.requesterId))] },
            attributes: ['id', 'name', 'email'],
        });
        const porId = Object.fromEntries(solicitantes.map(u => [u.id, u]));

        return res.json({
            pedidos: pedidos.map(p => ({
                id: p.id,
                routeId: p.routeId,
                rotaNome: nomeRota[p.routeId],
                solicitante: porId[p.requesterId]?.name || 'usuário removido',
                email: porId[p.requesterId]?.email || '',
                createdAt: p.createdAt,
            })),
        });
    } catch (err) {
        console.error('Erro em /rotasvia/pedidos:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao listar pedidos de acesso.' });
    }
});

// ─── POST /rotasvia/pedidos/:id/responder — aprova (vira compartilhamento) ou recusa
router.post('/rotasvia/pedidos/:id/responder', eAdmin, async (req, res) => {
    const { aprovar } = req.body;
    const { userId, userRole } = req;

    try {
        const pedido = await RouteAccessRequest.findByPk(req.params.id);
        if (!pedido) return res.status(404).json({ erro: true, mensagem: 'Pedido não encontrado.' });

        const perm = await temPermissaoEscrita(pedido.routeId, userId, userRole);
        if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
        if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para responder este pedido.' });

        if (aprovar === true) {
            const solicitante = await User.findByPk(pedido.requesterId, { attributes: ['email'] });
            if (!solicitante) return res.status(404).json({ erro: true, mensagem: 'Solicitante não encontrado.' });
            await RouteShare.findOrCreate({
                where: { routeId: pedido.routeId, email: solicitante.email.toLowerCase().trim() },
            });
        }
        await pedido.update({ status: aprovar === true ? 'aprovado' : 'recusado' });
        return res.json({ erro: false, mensagem: aprovar === true ? 'Acesso liberado.' : 'Pedido recusado.' });
    } catch (err) {
        console.error('Erro em /pedidos/responder:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao responder pedido.' });
    }
});

// ─── Compartilhamento por categoria (regra contínua) ─────────────────────────
// Vale para as rotas que o usuário criou na categoria, inclusive as adicionadas depois.
// email NULL = categoria pública. Rotas declaradas ANTES de /rotasvia/:id/compartilhar.
router.get('/rotasvia/categorias/compartilhamentos', eAdmin, async (req, res) => {
    try {
        const regras = await CategoryShare.findAll({
            where: { ownerId: req.userId },
            order: [['categoria', 'ASC'], ['email', 'ASC']],
        });
        const porCategoria = {};
        for (const r of regras) {
            if (!porCategoria[r.categoria]) porCategoria[r.categoria] = { categoria: r.categoria, publica: false, emails: [] };
            if (r.email === null) porCategoria[r.categoria].publica = true;
            else porCategoria[r.categoria].emails.push(r.email);
        }
        return res.json({ categorias: Object.values(porCategoria) });
    } catch (err) {
        console.error('Erro em /categorias/compartilhamentos:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao listar compartilhamentos de categoria.' });
    }
});

// body: { categoria, publica: true } ou { categoria, email }
router.post('/rotasvia/categorias/compartilhar', eAdmin, async (req, res) => {
    const { categoria } = req.body;
    const publica = req.body.publica === true;
    const email = publica ? null : (req.body.email || '').toLowerCase().trim();

    if (!categoria || !categoria.trim()) return res.status(400).json({ erro: true, mensagem: 'Categoria obrigatória.' });
    if (!publica && !email) return res.status(400).json({ erro: true, mensagem: 'E-mail obrigatório.' });

    try {
        await CategoryShare.findOrCreate({ where: { ownerId: req.userId, categoria, email } });
        return res.json({
            erro: false,
            mensagem: publica ? 'Categoria pública.' : 'Categoria compartilhada com sucesso!',
        });
    } catch (err) {
        console.error('Erro em /categorias/compartilhar:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao compartilhar categoria.' });
    }
});

// query: ?categoria=X&email=Y  (sem email = deixa de ser pública)
router.delete('/rotasvia/categorias/compartilhar', eAdmin, async (req, res) => {
    const { categoria, email } = req.query;
    if (!categoria) return res.status(400).json({ erro: true, mensagem: 'Categoria obrigatória.' });

    try {
        await CategoryShare.destroy({
            where: { ownerId: req.userId, categoria, email: email ? email.toLowerCase().trim() : null },
        });
        return res.json({ erro: false, mensagem: 'Compartilhamento de categoria removido.' });
    } catch (err) {
        console.error('Erro ao remover compartilhamento de categoria:', err.message);
        return res.status(400).json({ erro: true, mensagem: 'Erro ao remover compartilhamento de categoria.' });
    }
});

// ─── POST /rotasvia — cria rota vinculando ao criador ─────────────────────────
router.post('/rotasvia', eAdmin, async (req, res) => {
    const { name, url, geometry, categoria, publica } = req.body;
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
            publica:   publica === true,
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
    const { name, url, geometry, categoria, publica } = req.body;
    const { userId, userRole } = req;

    if (!name || !url) {
        return res.status(400).json({ erro: true, mensagem: 'Nome e URL são obrigatórios.' });
    }

    const perm = await temPermissaoEscrita(id, userId, userRole);
    if (perm === null) return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
    if (!perm) return res.status(403).json({ erro: true, mensagem: 'Sem permissão para editar esta rota.' });

    try {
        const [updated] = await Rotasvia.update(
            {
                name, url, geometry: geometry || null, categoria: categoria || null,
                ...(publica !== undefined && { publica: publica === true }),
            },
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
