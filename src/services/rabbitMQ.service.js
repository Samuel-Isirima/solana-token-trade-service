import amqp from "amqplib";

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channels = new Map();
  }

  async connect() {
    if (this.connection) return;
    this.connection = await amqp.connect("amqp://localhost");
    console.log("Connected to RabbitMQ");
  }

  async getChannel(queueName) {
    if (!this.connection) {
      throw new Error("RabbitMQ connection is not initialized");
    }

    if (this.channels.has(queueName)) {
      return this.channels.get(queueName);
    }

    const channelPromise = (async () => {
      const channel = await this.connection.createChannel();
      await channel.assertQueue(queueName, { durable: true });
      console.log(`Channel created for queue: "${queueName}"`);
      return channel;
    })();

    this.channels.set(queueName, channelPromise);
    return channelPromise;
  }

  async sendToQueue(queueName, message) {
    const channel = await this.getChannel(queueName);
    channel.sendToQueue(queueName, Buffer.from(message), { persistent: true });
    console.log(`Message sent to "${queueName}": ${message}`);
  }

  async consumeQueue(queueName, onMessage) {
    const channel = await this.getChannel(queueName);
    await channel.consume(
      queueName,
      (msg) => {
        if (msg) {
          const messageContent = msg.content.toString();
          console.log(`Received message from ${queueName}: ${messageContent}`);
          onMessage(messageContent);
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
    console.log(`Started consuming messages from "${queueName}"`);
  }

  async close() {
    for (const [queueName, channelPromise] of this.channels) {
      const channel = await channelPromise;
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


// Function to process messages from multiple queues
 async startQueueProcessors(queueProcessors) {
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
}

}

const rabbitMQService = new RabbitMQService();
export default rabbitMQService

