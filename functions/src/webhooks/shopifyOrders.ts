import * as express from "express";
import * as functions from "firebase-functions";
import { findMerchant, getCollections, updateMerchant } from "../lib/helpers/firestore";
import { createWebhook } from "../lib/helpers/shopify";
import * as admin from "firebase-admin";
import { validateKey } from "../routes/auth";
// import { createDocument } from "../lib/helpers/firestore";
// import { validateKey } from "../routes/auth"
// import { SubscriptionAgreement } from "../lib/types/products";

export const shopifyOrderCreatedWebHook = (app: express.Router) => {
    app.post("/shopify/order/complete", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅🛍️ [SHOPIFY] - Shopify Order Completed (webhook)");
        let status = 200,
            text = " 🎉 [SUCCESS]: Subscsription document succesffully created 👽",
            result: string = "",
            ok = true;

        const { headers } = req;
        functions.logger.info(req.body);
        const shopify_domain = headers['x-shopify-shop-domain'];
        // const shopifyApi = headers['x-shopify-access-token'];
        functions.logger.info(shopify_domain);
        const merchants = await findMerchant("SHOPIFY_DOMAIN",shopify_domain);
      
        if (merchants.status < 300 && merchants.data.list) {
            let merchant_uuid = "";
            merchants.data.list.forEach(m => {
                if (m.exists) {
                    merchant_uuid = m.id
                }
            });
            functions.logger.info(merchant_uuid);

            try {
                const order = req.body;
                const lineItems = order.line_items;
                let matchedDesignObjects = [];
            
                // Get matching Design Objects in imPowered
                const designObjects = await getCollections(merchant_uuid, "designs");

                functions.logger.info(designObjects);
                for (const lineItem of lineItems) {
                    const li_sku = lineItem.sku as string;
                    const matchingDesignObject = designObjects.data.collection && designObjects.data.collection.find(
                        (obj) => li_sku.includes(obj.sku)
                    );
                    if (matchingDesignObject) {
                        matchedDesignObjects.push(matchingDesignObject);
                    }
                }

                functions.logger.info(matchedDesignObjects);
            //   // Update the matched Design Objects in your database
            // TODO: CHARGE ON EACH ===> HOW TO STRUCTURe?
            // TODO: SEND TO POD TEAM w/ new API
            // TODO: UPDATE ANALYTICS ? 
            //   await updateDesignObjects(matchedDesignObjects);
            } catch (error) {
              console.log(error);
            }
        }
      

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                sub_uuid: result
            }
        })
    });


    app.post("/shopify/weebhoook/create", validateKey, async (req: express.Request, res: express.Response,) => {
        functions.logger.debug(" ✅🛍️ [SHOPIFY] - Shopify Create Webhook");
        let status = 200,
            text = " 🎉 [SUCCESS]: Subscsription to 'order/created' succesffully created",
            ok = true;

        const {
            merchant_uuid,
            shopify_api_token
        } = req.body;


        try {

            const response = await createWebhook(shopify_api_token)

            if (response) {
                functions.logger.debug(response);
                await updateMerchant(merchant_uuid, {
                    SHOPIFY: {
                        PK: shopify_api_token
                    },
                    updated_at: admin.firestore.Timestamp.now()
                })
            }
            
        } catch (e) {
            
        }


        res.status(status).json({
            ok: ok,
            text: text,
            result: ok
        })
    })
}
