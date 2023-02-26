import * as functions from "firebase-functions";
import { updateAlgolia } from "../lib/helpers/draft_orders/timeCompletion";
import { Product } from "../lib/types/products";

export const productsCreated = functions.firestore
.document("/merchants/{merchantID}/products/{productsID}")
.onCreate(async (snap) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let product: Product = snap.exists ? snap.data() as Product : {} as Product;

    if (product !== null) {
        functions.logger.info(" ⏭️ [QUEUE] - Push Task to Queue");
        updateAlgolia(product);

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})