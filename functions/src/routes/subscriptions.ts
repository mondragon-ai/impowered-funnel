import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { SubscriptionAgreement } from "../lib/types/products";

export const subscriptionRoutes = (app: express.Router) => {
    app.post("/subscriptions/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create subscription");
        let status = 200,
            text = "SUCCESS: Subscsription document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        let subscription: SubscriptionAgreement = req.body.subscription;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        subscription = {
            ...subscription,
            updated_at: admin?.firestore?.Timestamp?.now(),
            created_at: admin?.firestore?.Timestamp?.now(),
        } 


        // Create subscription document 
        try {
            const response = await createDocument(merchant_uuid, "subscriptions", "sub_", subscription);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "ERROR: Likely couldnt create a collection document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                sub_uuid: result
            }
        })
    });

    app.post("/subscriptions", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Subscriptions bieng fetched ");
        let status = 200,
            text = "SUCCESS: Subscription(s) sucessfully fetched ✅",
            result: SubscriptionAgreement[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const sub_uuid: string = req.body.sub_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (sub_uuid === "") {
                const response = await getCollections(merchant_uuid, "subscriptions");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "subscriptions", sub_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as SubscriptionAgreement];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a subscription(s)";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                subscriptions: result
            }
        })
    });
}