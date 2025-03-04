import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Telegram bot setup
const TELEGRAM_BOT_TOKEN = '7639753856:AAG7p7TfPeT2qNPfb0L_UL-9QsCjC8ikLMk';
const TELEGRAM_CHAT_ID = '5521041325';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Get the current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log directory and file
const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'app.log');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: logFile }) // Log to file
  ],
});

// Function to send logs to Telegram
const sendToTelegram = async (message) => {
    try {
      await axios.post(TELEGRAM_API_URL, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      });
    } catch (error) {
      console.error('Error sending log to Telegram:', error);
    }
  };
  
  // Override console.log and console.error
  console.log = (...args) => {
    const message = args.join(' ');
    logger.info(message);
    sendToTelegram(`[LOG] ${message}`);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    logger.error(message);
    sendToTelegram(`[ERROR] ${message}`);
  };
  
  // Capture uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (err) => {
    const errorMessage = `Uncaught Exception: ${err.stack || err.message}`;
    logger.error(errorMessage);
    sendToTelegram(errorMessage);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason) => {
    const errorMessage = `Unhandled Rejection: ${reason}`;
    logger.error(errorMessage);
    sendToTelegram(errorMessage);
  });
  
  export default logger;
  