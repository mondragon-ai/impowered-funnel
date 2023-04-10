import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { Merchant } from "../lib/types/merchants";
// import { createAlgoDB } from "../routes/db";
import { createAppSessions } from "../lib/helpers/firestore";
import { decrypt } from "../lib/helpers/algorithms";
import { createAlgoliaIndex } from "../lib/db";


export const pmerchantCreated = functions.firestore
.document("/merchants/{merchantID}")
.onCreate(async (snap) => {

    functions.logger.info(" 🏪 [MERCHANT]: Merchant On Create - Trigger");
    let merchant: Merchant = snap.exists ? snap.data() as Merchant : {} as Merchant;

    try {
        const storefront_api = merchant.api_key !== "" ? decrypt(merchant.api_key) : "ipat_" + crypto.randomBytes(10).toString('hex');

        await createAppSessions(
            storefront_api, 
            {
                merchant_uuid: merchant.id,
                host: merchant.host
            }
        );

        const merchantId = merchant.id;
        createAlgoliaIndex(merchantId,"merchants",merchant);

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
