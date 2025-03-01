import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('degeonter_transaction_module', 'root', '', {
  host: 'localhost', // Change if using a remote DB
  dialect: 'mysql',
  logging: false,
});

export default sequelize