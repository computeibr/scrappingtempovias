const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const etl = require('./controller/etl');
const rotasvia = require('./controller/rotasvia');
const auth = require('./controller/auth');
const dashboard = require('./controller/dashboard');

const app = express();

app.use(express.json());
app.use('/files', express.static(path.resolve(__dirname, 'public', 'upload')));

app.use(
  cors({
    origin: '*',
    exposedHeaders: ['Content-Disposition'],
    methods: '*',
  }),
);

// Rotas legadas — mantidas para compatibilidade com o scraper interno
app.use('/rota', rotasvia);

// API
app.use('/api/auth', auth);
app.use('/api/dashboard', dashboard);

// Serve o frontend (build do Vite) em produção
const frontendBuild = path.resolve(__dirname, 'frontend', 'dist');
app.use(express.static(frontendBuild));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/rota/')) {
    return res.status(404).json({ erro: true, mensagem: 'Rota não encontrada.' });
  }
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => { console.log('Tempovias API rodando na porta %s', port); });
