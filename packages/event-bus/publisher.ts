import { getChannel } from "./connection";

export const publishEvent = async (event: string, data: any) => {
    const channel = getChannel();
    channel.publish(
        "events",
        event,
        Buffer.from(JSON.stringify(data)),
        {
            persistent: true
        }
    );
}

// when the user signups then 
// import { publishEvent } from "@packages/event-bus/publisher";
// import { EVENTS } from "@packages/event-bus/events";

// await publishEvent(EVENTS.USER_CREATED, {
//     userId: user.id,
//     email: user.email
// });