const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Member = require('./member')(sequelize, DataTypes);
const Borrowing = require('./borrowing')(sequelize, DataTypes);

const db = {
    sequelize,
    Member,
    Borrowing
};
Object.values(db).forEach(model => {
    if(model && typeof model.associate === 'function'){
        model.associate(db);
    }
});

module.exports = db;