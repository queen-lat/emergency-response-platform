const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Hospital = sequelize.define('Hospital', {
  hospital_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  total_beds: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  available_beds: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  contact: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'hospitals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Hospital;
