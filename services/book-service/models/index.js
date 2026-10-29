const sequelize = require("../config/database.js");
const { DataTypes } = require("sequelize");

const Book = require("./book")(sequelize, DataTypes);

const db= {
    sequelize,
    Book
};

module.exports = db;