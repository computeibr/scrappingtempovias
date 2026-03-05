const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    timezone: 'America/Sao_Paulo',
    dialectOptions: process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
});

sequelize.authenticate()
    .then(() => console.log('Conexão com PostgreSQL realizada com sucesso!'))
    .catch((err) => console.error('Erro ao conectar no PostgreSQL:', err.message));

module.exports = sequelize;