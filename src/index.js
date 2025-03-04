import dotenv from "dotenv";
import express from "express";
import rabbitMQService from "./services/rabbitMQ.service.js";
import { buyToken, checkForTokensToSell, sellToken } from "./controllers/tokenController.js";
import { syncDatabase } from "./database/sync.js";
import './logger.js';
dotenv.config();

const app = express();
const port = process.env.APP_PORT || 4100;

// Body parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Create the queues for data
(async () => {
    try {
        await rabbitMQService.connect();
        const queues = ["BUY", "SELL"];
        for (const queue of queues) {
            await rabbitMQService.getChannel(queue);
        }
    } catch (error) {
        console.error("Error:", error);
    }
})();


// Start the server
try {
    app.listen(port, () => {
        console.log(`Buying and selling service running on http://localhost:${port}`);
    });
} catch (error) {
    console.log(`An error occurred while trying to initialize service: ${error.message}`);
}

// (async () => {
//     while (true) {
//       await checkForTokensToSell(); // Wait for the function to finish
//       console.log("Waiting 1 second before the next call...")
//       await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
//     }
// })()

setInterval(checkForTokensToSell, 30000);

// checkForTokensToSell

// Start processing the queue
(async () => {
    await rabbitMQService.startQueueProcessors([
        {
            queueName: "BUY",
            processor: buyToken
        },
        {
            queueName: "SELL",
            processor: sellToken
        }
    ]);
})();
