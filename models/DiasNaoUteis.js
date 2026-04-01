const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const DiasNaoUteis = sequelize.define(
  'dias_nao_uteis',
  {
    id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    data:     { type: DataTypes.DATEONLY, allowNull: false, unique: true },
    descricao:{ type: DataTypes.STRING(150), allowNull: false },
    tipo:     { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'feriado_nacional' },
  },
  { tableName: 'dias_nao_uteis', timestamps: true },
);

// Cria a tabela se não existir (seguro — não altera tabelas existentes)
DiasNaoUteis.sync({ force: false }).catch((err) =>
  console.error('[DiasNaoUteis] Erro ao sincronizar tabela:', err.message),
);

module.exports = DiasNaoUteis;
