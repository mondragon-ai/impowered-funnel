import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { Fulfillment } from "../lib/types/fulfillments";

export const fulfillmentRoutes = (app: express.Router) => {
    app.post("/fulfillments/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create fulfillment");
        let status = 200,
            text = "SUCCESS: Fulfillments document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        let fulfillments: Fulfillment = req.body.fulfillments;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        fulfillments = {
            ...fulfillments,
            updated_at: admin?.firestore?.Timestamp?.now(),
            created_at: admin?.firestore?.Timestamp?.now(),
        } 

        // Create fulfillment document 
        try {
            const response = await createDocument(merchant_uuid, "fulfillments", "ful_", fulfillments);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "ERROR: Likely couldnt create a fulfillment document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                ful_uuid: result
            }
        })
    });

    app.post("/fulfillments", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Fulfillments(s) being fetched ");
        let status = 200,
            text = "SUCCESS: Fulfillments(s) sucessfully fetched ✅",
            result: Fulfillment[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const ful_uuid: string = req.body.ful_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (ful_uuid === "") {
                const response = await getCollections(merchant_uuid, "fulfillments");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "fulfillments", ful_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Fulfillment];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a fulfillment(s)";
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
                fulfillments: result
            }
        })
    });
}