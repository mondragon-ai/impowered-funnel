import * as express from "express";
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { Funnel } from "../lib/types/funnels";
import { Collection } from "../lib/types/products";
import { validateKey } from "./auth";

export const collectionRoutes = (app: express.Router) => {
    app.post("/collections/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create collection");
        let status = 200,
            text = "SUCCESS: Collection document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        const collection: Funnel = req.body.collection;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        // Create collection document 
        try {
            const response = await createDocument(merchant_uuid, "collections", "col_", collection);

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
                col_uuid: result
            }
        })
    });

    app.post("/collections", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started ");
        let status = 200,
            text = "SUCCESS: Collection(s) sucessfully fetched ✅",
            result: Collection[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const col_uuid: string = req.body.col_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (col_uuid === "") {
                const response = await getCollections(merchant_uuid, "collections");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "collections", col_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Collection];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a order";
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
                collections: result
            }
        })
    });
}