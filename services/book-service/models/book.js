'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Book extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Book.init({
    title:{ 
      type: DataTypes.STRING,
       allowNull: false
       },
    author: {
       type: DataTypes.STRING,
        allowNull: false
       },
    isbn: {
       type: DataTypes.STRING,
       unique: true,
        allowNull: true
       },
    totalCopies: {
       type: DataTypes.INTEGER,
        allowNull: false,
         defaultValue: 1,
         validate: { min: 0, isInt:true }
         },
    availableCopies: {
       type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 0, isInt:true }
      }
  }, {
    sequelize,
    modelName: 'Book',
    validate: {
      availableCopiesNotExceedTotal() {
        if (this.availableCopies > this.totalCopies) {
          throw new Error('Available copies cannot exceed total copies');
        }
      }
    }
  });
  return Book;
};