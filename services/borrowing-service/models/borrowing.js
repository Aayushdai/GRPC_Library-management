const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Borrowing extends Model {
        static associate(models) {
            Borrowing.belongsTo(models.Member, {
                foreignKey: 'memberId',
                as: 'member'
            });
        }
    }
    Borrowing.init({
        memberId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        bookId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        borrowedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        dueAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        returnedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('borrowed', 'returned', 'overdue'),
            allowNull: false,
            defaultValue: 'borrowed'
        }
    }, {
        sequelize,
        modelName: 'Borrowing'
    });
    return Borrowing;
}