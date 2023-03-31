import * as crypto from "crypto";
import * as express from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createDocumentWthId, createMerchant } from "../lib/helpers/firestore";
import {
    Merchant,
    CreateMerchant
} from "../lib/types/merchants";

const today = admin.firestore.Timestamp.now();

/**
 * Mercahnt Routes
 * @param app 
 */
export const merchantRoutes = (app: express.Router) => {

    app.post("/merchants/create",  async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Create Merchant');
        let text = "", status= 500, result: Merchant | any = null;

        let {
            merchant,
            user
        }: CreateMerchant = req.body;

        console.log(req.headers)
        console.log(req.url)


        const merchant_uuid = "mer_" + crypto.randomBytes(10).toString("hex");

        try {
            const merchant_data = {
                ...merchant,
                updated_at: today,
                created_at: today,
                merchant_uuid: merchant_uuid,
                host: req.hostname || "",
            }

            await createMerchant(merchant_uuid, merchant_data);
            
        } catch (e) {
            text = " 🚨 [ERROR]: creating merchant.";
            functions.logger.error(text)
        }

        try {
            const user_uuid = "use_" + (user.id || "");
            const user_data = {
                ...user,
                updated_at: today,
                created_at: today,
            }

            await createDocumentWthId(merchant_uuid, "users", user_uuid, user_data);
            
            text = " 🎉 [SUCCESS]: Merchant Created Graciously.";
            status = 200;
        } catch (e) {
            text = " 🚨 [ERROR]: creating user for merchant";
            functions.logger.error(text);
        }
        res.status(status).json({
            text: text,
            data: result
        });
    });


}