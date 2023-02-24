import * as express from "express";
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
// import { createDocument } from "../lib/helpers/firestore";
// import { validateKey } from "../routes/auth"
// import { SubscriptionAgreement } from "../lib/types/products";

export const shopifyOrderCreatedWebHook = (app: express.Router) => {
    app.post("/shopify/order/complete", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [START] - Shopify Order Completed (webhook)");
        let status = 200,
            text = " 🎉 [SUCCESS]: Subscsription document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        // const merchant_uuid:string = req.body.merchant_uuid;

        console.log(req.body)
        console.log(text)

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                sub_uuid: result
            }
        })
    });
}