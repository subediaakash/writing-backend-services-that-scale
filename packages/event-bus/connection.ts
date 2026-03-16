import amqp from "amqplib"

let channel: amqp.Channel

export const connectionRabbitMQ = async () => {
    const connection = await amqp.connect("amqp://localhost")
    channel = await connection.createChannel()
    await channel.assertExchange("events", "topic", {
        durable: true,
    })
    console.log("Connected to RabbitMQ")
}

export const getChannel = () => {
    if (!channel) {
        throw new Error("Channel not initialized")

    }
    return channel;
}