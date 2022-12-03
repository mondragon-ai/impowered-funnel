import * as express from "express"
// import { getDocument, getFunnelDocument, updateDocument, updateFunnelsDocument } from "../lib/helpers/firestore";
// import { handleStripeCharge, handleSubscription } from "../lib/helpers/stripe";
// import { Customer } from "../lib/types/customers";
// import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
// import { generateAPIKey } from "../lib/helpers/auth/auth";
import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { validateKey} from "./auth";
import { Product} from "../lib/types/products";

export const productRoutes = (app: express.Router) => {

    app.post("/products/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> SESSIONS CREATE');
        let text = "ERROR: Likely internal prolem 🔥", status= 500, result: string | any = null;
        const merchant_uuid = req.body.merchant_uuid;

        // TODO SANATIZE DATA W/ FN
        const new_data = req.body.product as Product;

        functions.logger.debug(' => DATA ', new_data);

        const product: Product = {
            ...new_data,
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        } as Product;

        try {
            const response = await createDocument(merchant_uuid,"products","pro_", product);

            if (response.status < 300) {
                status = 200;
                text = "SUCCESS: Product created";
                result = response.data.id;
            }
        } catch (e) {
            text = text + " - Creating document"
        }
        res.status(status).json({
            text: text,
            data: result
        })
    });

    app.post("/products", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> SESSIONS CREATE');
        let text = "ERROR: Likely product fetching prolem 📦", status= 500, result: Product[] | any = null, size = 0;

        // Merchant UUID
        const merchant_uuid = req.body.merchant_uuid;

        // Product UUID
        const product_uuid = req.body.product_uuid;
        
        try {

            if (product_uuid === "") {
                const response = await getCollections(merchant_uuid,"products");
    
                if (response.status < 300) {
                    result = response.data.collection;
                    size = response.data.size;
                    text = "SUCCESS: Products fetched 📦",
                    status= 200
                }

            } else {
                const response = await getDocument(merchant_uuid,"products", product_uuid);
    
                if (response.status < 300 && response.data !== undefined) {
                    result = [response.data]
                    text = "SUCCESS: Products fetched 📦",
                    status= 200
                }
            }

        } catch (e) {
            functions.logger.error(text + " - fetching products.");
            text = text + " - fetching products."
        }

        res.status(status).json({
            text: text,
            data: {
                size: size,
                result: result
            },
        })
    })
}