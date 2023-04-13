import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { SubscriptionAgreement } from "../lib/types/products";
import { UserSummary } from "../lib/types/merchants";

export const usersRoutes = (app: express.Router) => {
    app.post("/users/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug("[USER]: Create User");
        let status = 200,
            text = " 🎉 [SUCCESS]: User document succesffully created",
            result = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid: string = req.body.merchant_uuid;

        // Data to push
        let user: UserSummary = req.body.user;

        try {
            // create user docuemnt 
            const response = await createDocument(merchant_uuid,"users","cus_",{
                ...user,
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
            });

            if (response.status < 300 && response.data) {
                result = response.data.id
            }
            
        } catch (error) {
            status = 400;
            text = " 🚨 [ERROR]: User document couldn't be created";
            result = "";
            ok = false;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: result
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