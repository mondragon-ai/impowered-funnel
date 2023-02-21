import * as expres from "express";
import * as functions from "firebase-functions";
import { getCollections } from "../lib/helpers/firestore";
import { validateKey } from "./auth";

// Algolia 
import algoliasearch from "algoliasearch";

const algolia = algoliasearch(
    process.env.X_ALGOLGIA_APPLICATION_ID as string,
    process.env.X_ALGOLGIA_API_KEY as string,
)

const product_index = algolia.initIndex("prod_blog_search");

export const dbManagerRoutes = (app: expres.Router) => {
    app.post("/algolia/collection/sync", validateKey, async (req: expres.Request, res: expres.Response) => {
        functions.logger.debug(" ====> Ready to sync to algolia");
        let status = 200,
            text = "SUCCESS: collection successfully synced ✅",
            result: {id?: string, objectID?: string}[] | null = null,
            size = 0,
            ok = true;

        const merchant_uuid:string = req.body.merchant_uuid;
        const collection:string = req.body.collection;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        // Fetch colletion to be synecd
        try {
            const response = await getCollections(merchant_uuid, collection);

            // data check && set
            if (response?.status < 300 && response?.data?.collection) {
                result = response?.data?.collection;
                size = response?.data?.size;
            }
            
        } catch (e) {
            text = "ERROR: Likely a problem uploading / syncing primary db with angolia. Check logs";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   

        // Push to Algolia index
        try {
            let push_data: {}[] = [];
            // If data is returned successfully sync
            if (result !== null) {
                result.forEach(item => {
                    push_data.push({...item, objectID: item?.id })
                });
            }

            if (push_data.length > 0) {
                functions.logger.debug(" => Data ready to sync to algolia");
                await product_index.saveObjects(push_data);

            }

        } catch (e) {
            text = "ERROR: Likely a problem uploading / syncing primary db with angolia. Check logs";
            status = 500;
            ok = false;
            functions.logger.error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                collection: result
            }
        })
    });
    
}