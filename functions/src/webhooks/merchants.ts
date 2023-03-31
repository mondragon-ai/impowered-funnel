import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { Merchant } from "../lib/types/merchants";
// import { createAlgoDB } from "../routes/db";
import { createAppSessions } from "../lib/helpers/firestore";


// import algoliasearch from "algoliasearch";

// const algolia = algoliasearch(
//     process.env.X_ALGOLGIA_APPLICATION_ID as string,
//     process.env.X_ALGOLGIA_API_KEY as string,
// );

// const product_index = algolia.initIndex("prod_product_search_engine");
// const blog_index = algolia.initIndex("prod_blog_search");



export const pmerchantCreated = functions.firestore
.document("/merchants/{merchantID}")
.onCreate(async (snap) => {

    functions.logger.info(" 🏪 [MERCHANT]: Merchant On Create - Trigger");
    let merchant: Merchant = snap.exists ? snap.data() as Merchant : {} as Merchant;

    try {
        const storefront_api = "ipat_" + crypto.randomBytes(10).toString('hex');

        await createAppSessions(
            storefront_api, 
            {
                merchant_uuid: merchant.id,
                host: merchant.host
            }
        );
    } catch (error) {
        functions.logger.error(" 🚨 [ERROR]: creating sessions");
    }

    // try {

    //     if (merchant !== null) {
    //         functions.logger.info(" ⏭️ [START] - Push Algolia");
    //         await createAlgoDB(product, "products");

    //     } 

    // } catch (error) {
    //     functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
    // }
});
