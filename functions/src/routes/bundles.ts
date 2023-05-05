import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument, updateDocument } from "../lib/helpers/firestore";
import { Bundle, Collection } from "../lib/types/products";
import { validateKey } from "./auth";

export const bundleRoutes = (app: express.Router) => {
    app.post("/bundles/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create bundle");
        let status = 200,
            text = "SUCCESS: Bundle document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        let bundle: Bundle = req.body.bundle;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        bundle = {
            ...bundle,
            updated_at: admin?.firestore?.Timestamp?.now(),
            created_at: admin?.firestore?.Timestamp?.now(),
        } 

        // Create collection document 
        try {
            const response = await createDocument(merchant_uuid, "bundles", "bun_", bundle);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "ERROR: Likely couldnt create a bundle document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                bun_uuid: result
            }
        })
    });


    app.post("/bundles/update", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to update bundle");
        let status = 200,
            text = "SUCCESS: Bundle document succesffully updated 👽",
            ok = true;
    
            // Merchant uuid
            const merchant_uuid:string = req.body.merchant_uuid;
    
            // Data to push
            let bundle: Bundle = req.body.bundle;
    
            if (!bundle?.id && bundle?.id != "") {
                throw new Error("Bundle did not exist propely");
            }
    
            bundle = {
                ...bundle,
                updated_at: admin?.firestore?.Timestamp?.now(),
                created_at: admin?.firestore?.Timestamp?.now(),
            } 
    
            // TODO: SPECIAL SCOPE ACCESS CHECK
    
    
            // TODO: SANATIZE DATA
    
            // Update collection document 
            try {
                await updateDocument(merchant_uuid, "bundles", bundle?.id,  bundle as Bundle);
    
                // data check && set
                functions.logger.debug(" => Document created");
                
            } catch (e) {
                text = "ERROR: Likely couldnt update a bundle document";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }   
            
            res.status(status).json({
                ok: ok,
                text: text,
                result: bundle
            })
    });

    app.post("/bundles", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started ");
        let status = 200,
            text = "SUCCESS: Bundle(s) sucessfully fetched ✅",
            result: Collection[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const bun_uuid: string = req.body.bun_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (bun_uuid === "") {
                const response = await getCollections(merchant_uuid, "bundles");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "bundles", bun_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Collection];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a bundle(s)";
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
                bundles: result
            }
        })
    });
}