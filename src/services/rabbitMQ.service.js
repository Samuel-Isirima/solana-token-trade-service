const amqp = require("amqplib");

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channels = new Map();
  }

  // Ensure a single RabbitMQ connection
  async connect() {
    if (this.connection) return;
    this.connection = await amqp.connect("amqp://localhost");
    console.log("Connected to RabbitMQ");
  }

  // Create or reuse a channel for a specific queue
  async getChannel(queueName) {
    if (!this.connection) {
      throw new Error("RabbitMQ connection is not initialized");
    }

    if (this.channels.has(queueName)) {
      return this.channels.get(queueName);
    }

    const channel = await this.connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    this.channels.set(queueName, channel);
    console.log(`Channel created for queue: "${queueName}"`);
    return channel;
  }

  // Send a message to a specific queue
  async sendToQueue(queueName, message) {
    const channel = await this.getChannel(queueName);
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`Message sent to "${queueName}":`, message);
  }

  // Consume messages from a specific queue
  async consumeQueue(queueName, onMessage) {
    const channel = await this.getChannel(queueName);
    await channel.consume(
      queueName,
      (msg) => {
        if (msg) {
          const messageContent = msg.content.toString();
          console.log(`Received message from ${queueName}:`, messageContent);
          onMessage(JSON.parse(messageContent));
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
    console.log(`Started consuming messages from "${queueName}"`);
  }

  // Close all channels and the connection
  async close() {
    for (const [queueName, channel] of this.channels) {
      await channel.close();
      console.log(`Channel for queue "${queueName}" closed`);
    }
    this.channels.clear();

    if (this.connection) {
      await this.connection.close();
      console.log("Connection to RabbitMQ closed");
      this.connection = null;
    }
  }
}

// Singleton instance
const rabbitMQService = new RabbitMQService();
module.exports = rabbitMQService;

// Function to process messages from multiple queues
const startQueueProcessors = async (queueProcessors) => {
  await rabbitMQService.connect();

  for (const { queueName, processor } of queueProcessors) {
    rabbitMQService.consumeQueue(queueName, async (message) => {
      try {
        await processor(message);
      } catch (error) {
        console.error(`Error processing message from queue ${queueName}:`, error);
      }
    });
  }
};

module.exports.startQueueProcessors = startQueueProcessors;
