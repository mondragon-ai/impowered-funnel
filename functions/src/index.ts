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
export { blogsCreated, blogsUpdated } from "./webhooks/blogs";
export { pmerchantCreated } from "./webhooks/merchants";
export { productsCreated, productsUpdated } from "./webhooks/products";
export { fulfillmentCreated } from "./webhooks/fulfillment";
export { dailyCronJob } from "./cronjobs/daily";
export { hourlyCronJob } from "./cronjobs/hourly";


