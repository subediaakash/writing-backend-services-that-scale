import { connectionRabbitMQ } from "./connection";
import express from 'express';

const app = express();

async function start() {
    await connectionRabbitMQ();

    app.listen(3000);
}

start();