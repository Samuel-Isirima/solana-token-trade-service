import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/database.js';

class Token extends Model {}

Token.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    token_mint: { type: DataTypes.STRING, allowNull: false },
    buy_marketcap: { type: DataTypes.FLOAT, allowNull: false },
    sell_marketcap: { type: DataTypes.FLOAT, allowNull: true },
    age: { type: DataTypes.INTEGER, allowNull: false },
    buy_quantity: { type: DataTypes.FLOAT, allowNull: false },
    sold: { type: DataTypes.BOOLEAN, defaultValue: false },
    pnl: { type: DataTypes.FLOAT, defaultValue: 0 },
    buytxsignature: { type: DataTypes.STRING, allowNull: false },
    selltxsignature: { type: DataTypes.STRING, allowNull: true },
    solbalancebeforebuy: { type: DataTypes.FLOAT, allowNull: false },
    solbalanceaftersell: { type: DataTypes.FLOAT, allowNull: true },
    solbalancebeforesell: { type: DataTypes.FLOAT, allowNull: true }
  },
  {
    sequelize,
    modelName: 'Token',
    timestamps: true, // Enables createdAt & updatedAt
  }
);

export default Token;
