import * as functions from "firebase-functions";
import { db } from "./firebase";
import { rest } from "./rest";

const express = rest(db);

const settings: functions.RuntimeOptions = {
    memory: "512MB",
    timeoutSeconds: 120
}

export const funnel = functions.runWith(settings).https.onRequest(express);

export { orderCreated } from "./webhooks/orders";
export { dailyCronJob } from "./cronjobs/daily";
