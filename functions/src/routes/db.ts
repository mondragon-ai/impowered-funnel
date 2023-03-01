import * as expres from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getCollections, getPaginatedCollections } from "../lib/helpers/firestore";
import { validateKey } from "./auth";

// Algolia 
import algoliasearch from "algoliasearch";

const algolia = algoliasearch(
    process.env.X_ALGOLGIA_APPLICATION_ID as string,
    process.env.X_ALGOLGIA_API_KEY as string,
);


const product_index = algolia.initIndex("prod_product_search_engine");
const blog_index = algolia.initIndex("prod_blog_search");

export const dbManagerRoutes = (app: expres.Router) => {
    app.post("/algolia/collection/sync", validateKey, async (req: expres.Request, res: expres.Response) => {
        functions.logger.debug(" ✅ [ALGOLIA] Ready to sync to algolia");
        let status = 200,
            text = "🎉 [SUCCESS]: DB Collectio synced graciously",
            result: {id?: string, objectID?: string, updated_at: {_seconds: number}}[] | null = null,
            size = 0,
            ok = true;

        const merchant_uuid:string = req.body.merchant_uuid;
        const collection:string = req.body.collection;

        // Fetch colletion to be synecd
        try {
            const response = await getCollections(merchant_uuid, collection);

            // data check && set
            if (response?.status < 300 && response?.data?.collection) {
                result = response?.data?.collection;
                size = response?.data?.size;
            }
            
        } catch (e) {
            text = " 🚨 [ERROR]: Likely problem fetching initial collection.";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   

        // Push to Algolia index
        try {
            if (result && result.length == 25) {
                await syncCollection(result,merchant_uuid,collection, size)
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem uploading / syncing primary db with angolia. Check logs.";
            status = 500;
            ok = false;
            functions.logger.error(text);
        }


        // Push to Algolia index
        try {
            if (result && result.length > 0 && collection == "blogs") {
                functions.logger.debug(" => Blogs Ready to Sync");
                let push_data: {}[] = [];
                // If data is returned successfully sync
                if (result !== null) {
                    result.forEach(item => {
                        push_data.push({...item, objectID: item?.id })
                    });
                }
    
                if (push_data.length > 0) {
                    functions.logger.debug(" => Data ready to sync to algolia");
                    await blog_index.saveObjects(push_data);
    
                }
            }
            if (result && result.length > 0 && collection == "products") {
                functions.logger.debug(" => Products Ready to Sync");
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
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem uploading / syncing primary db with angolia. Check logs";
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
    app.post("/algolia/collection/sync_server", async (req: expres.Request, res: expres.Response) => {
        functions.logger.debug(" ✅ [ALGOLIA] -> Ready to sync primary cache DB to algolia");
        let status = 200,
            text = " 🎉 [SUCCESS]: collection successfully synced",
            result: {id?: string, objectID?: string}[] | null = null,
            size = 0,
            ok = true;

        const update_object:any = req.body.update_object;
        const collection: "blogs" | "products" = req.body.collection;
        functions.logger.info(update_object)
        functions.logger.info(collection)

        // Push to Algolia index
        try {
            if (update_object && collection == "blogs") {
                functions.logger.debug(" => Blogs Ready to Sync");
                let push_data: {}[] = [];
                // If data is returned successfully sync
                if (result !== null) {
                    push_data.push({...update_object, objectID: update_object?.id })
                }
    
                if (push_data.length > 0) {
                    functions.logger.debug(" => Data ready to sync to algolia");
                    await blog_index.saveObjects(push_data);
                }
            }
            if (update_object && collection == "products") {
                functions.logger.debug(" => Products Ready to Sync");
                let push_data: {}[] = [];
                // If data is returned successfully sync
                if (result !== null) {
                    push_data.push({...update_object, objectID: update_object?.id })
                }
    
                if (push_data.length > 0) {
                    functions.logger.debug(" => Data ready to sync to algolia");
                    await product_index.saveObjects(push_data);
    
                }
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem uploading / syncing primary db with angolia. Check logs";
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
    
};

export const updateAlgoliaFn = async (
    update_object: any,
    collection: string,
) => {
    functions.logger.info(update_object)
    functions.logger.info(collection)

    let push_data: {}[] = [];

    // Push to Algolia index
    try {
        if (update_object && collection == "blogs") {
            functions.logger.debug(" => Blogs Ready to Sync");
            // If data is returned successfully sync
            push_data.push({...update_object, objectID: update_object?.id })

            if (push_data.length > 0) {
                functions.logger.debug(" => Data ready to sync to algolia");
                await blog_index.saveObjects(push_data);
            }
        }
        
        if (update_object && collection == "products") {
            functions.logger.debug(" => Products Ready to Sync");
            // If data is returned successfully sync
            push_data.push({...update_object, objectID: update_object?.id })

            if (push_data.length > 0) {
                functions.logger.debug(" => Data ready to sync to algolia");
                await product_index.saveObjects(push_data);

            }
        }

    } catch (e) {
        let text = " 🚨 [ERROR]: Likely a problem uploading / syncing primary db with angolia. Check logs";
        functions.logger.error(text);
    }
    functions.logger.info(push_data)

    return
}

export const syncCollection = async (collection: any[], merchant_uuid: string, collecito_name: string, size: number):  Promise<any[]> => {
    // Base case: collection length is less than or equal to 25
    size = size + 25
    console.log(size);
    const seconds = collection[collection?.length-1].updated_at._seconds;
    functions.logger.debug(" RECURSIVE COLLECITONS: ",seconds);
    
    // Fetch another collection
    let newCollection: any[] = [] as any[];
    
    const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
    functions.logger.debug(start);

    const response = await getPaginatedCollections(merchant_uuid, collecito_name, start);
    if (response?.data?.collection && response.status < 300) {
        newCollection = response?.data?.collection;

        if (newCollection.length < 25) {
            size = size + newCollection.length;
            console.log(size);
            return collection as any[];
        }
    }
    
    // Concatenate the new collection with the current one
    const combinedCollection = collection.concat(newCollection);
    
    // Recursively call syncCollection with the combined collection
    return await syncCollection(combinedCollection, merchant_uuid, collecito_name, size);
}

