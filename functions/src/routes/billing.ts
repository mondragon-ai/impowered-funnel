import * as express from "express";
import * as functions from "firebase-functions";
import {
    SendSecret
} from "../lib/types/merchants";
import { sendMerchantSecret } from "../lib/helpers/merchants/sendSecret";
import { validateKey } from "./auth";
import { chargeMerchantStripe } from "../lib/helpers/merchants/chargeMerchant";

/**
 * Mercahnt Routes
 * @param app 
 */
export const billingRoutes = (app: express.Router) => {

    app.post("/billing/send_secret", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' 💰 [BILLING] - Send Merchant secret to client');

        // Fetch Obj 
        let {
            merchant_uuid,
        }: SendSecret = req.body;

        console.log(merchant_uuid)
        
        // Create merchant & own User 
        const {secret, status} = await sendMerchantSecret(
            merchant_uuid,
        );

        console.log(secret);

        // Create merchant & own User 
        res.status(status).json({
            text: status < 300 ? " 🎉 [SUCCESS]: merchant secret found" : " 🚨 [ERROR]: Cant Find merchant Check logs",
            data: secret
        });
    });

    app.post("/billing/charge", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' 💰 [BILLING] - Ready to Charge Customer');

        // Fetch Obj 
        let {
            merchant_uuid,
            amount,
        }: SendSecret = req.body;

        const transaction_id = await chargeMerchantStripe(merchant_uuid,amount);

        // Create merchant & own User 
        res.status(transaction_id.status).json({
            text: transaction_id.status < 300 ? " 🎉 [SUCCESS]: merchant secret found" : " 🚨 [ERROR]: Cant Find merchant Check logs",
            data: transaction_id
        });
    });
}