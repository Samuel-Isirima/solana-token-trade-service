import sequelize from './database.js';
import Token from '../models/Token.js';

export const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use { force: true } to drop & recreate tables
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
  } finally {
    // process.exit();
  }
};



syncDatabase()