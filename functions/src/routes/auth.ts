import * as express from "express"
// import { getDocument, getFunnelDocument, updateDocument, updateFunnelsDocument } from "../lib/helpers/firestore";
// import { handleStripeCharge, handleSubscription } from "../lib/helpers/stripe";
// import { Customer } from "../lib/types/customers";
// import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateAPIKey } from "../lib/helpers/auth/auth";
import { createAppSessions } from "../lib/helpers/firestore";
import { AppSession } from "../lib/types/Sessions";

export const authRoutes = (app: express.Router) => {

    app.post("/sessions/create", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> SESSIONS CREATE');
        let text = "ERROR: Likely internal prolem 🔥", status= 500, result: AppSession | any = null;

        const merchant_uuid = "50rAgweT9PoQKs5u5o7t"

        const API_KEY = generateAPIKey();


        let today = new Date().toISOString().split('T')[0];
        let sessions = {
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            api_key: API_KEY,
            merchant_uuid: merchant_uuid,
            host: req.hostname,
            usage: { date: today, count: 0 },
            dev_api_key: "string",
            production: false,
            roles: ["ALL", "STOREFRONT"]
        };

        try {
            const response = await createAppSessions(API_KEY as string, merchant_uuid,"sessions",sessions);

            if (response.status < 300) {
                status = 200
                text = "SUCCESS: Document app session created"
                functions.logger.debug("SUCCESS: Document app session created");
            }

        } catch (e) {
            text = text + " -- updated document"
            functions.logger.error(text + " -- updated document");
        }
        
        res.status(status).json({
            text: text,
            data: result
        })

    });
}
