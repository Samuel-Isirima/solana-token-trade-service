require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const rabbitMQService = require('./services/rabbitMQ.service');
const { buyToken, sellToken } = require('./controllers/tokenController');

const app = express();
const port = process.env.APP_PORT || 3000;

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
