import * as functions from "firebase-functions";
import { Product } from "../lib/types/products";
import { updateAlgoliaFn } from "../routes/db";

export const productsCreated = functions.firestore
.document("/merchants/{merchantID}/products/{productsID}")
.onCreate(async (snap) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let product: Product = snap.exists ? snap.data() as Product : {} as Product;

    if (product !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await updateAlgoliaFn(product, "products");

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
});

export const productsUpdated = functions.firestore
.document("/merchants/{merchantID}/products/{productsID}")
.onUpdate(async (change, context) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let product: Product = change.after.exists ? change.after.data() as Product : {} as Product;

    if (product !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await updateAlgoliaFn(product, "products");

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})