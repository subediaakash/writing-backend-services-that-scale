import { getChannel } from "./connection";


export const subscribeEvent = async (
    queueName: string,
    event: string,
    handler: (data: any) => Promise<void>
) => {

    const channel = getChannel();
    await channel.assertQueue(queueName, { durable: true });
    channel.bindQueue(queueName, "events", event);
    channel.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
            const data = JSON.parse(msg.content.toString());
            await handler(data);
            channel.ack(msg);

        } catch (error) {
            console.error("Error processing message:", error);
        }

    });
}

// we can use this function inside user services to subscribe to events
// import { subscribeEvent } from "@packages/event-bus/consumer";
// import { EVENTS } from "@packages/event-bus/events";

// subscribeEvent(
//   "user-service-queue",
//   EVENTS.USER_CREATED,
//   async (data) => {

//     await db.insert(users).values({
//       id: data.userId,
//       email: data.email
//     });

//   }
// );