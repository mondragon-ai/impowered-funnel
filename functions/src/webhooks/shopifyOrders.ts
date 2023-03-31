import * as express from "express";
import * as functions from "firebase-functions";
import { findMerchant, getCollections, updateMerchant } from "../lib/helpers/firestore";
import { createShopifyOrderBiglyPod, createShopifyPODCustomer, createWebhook } from "../lib/helpers/shopify";
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

        const { headers, body } = req;
        const shopify_domain = headers['x-shopify-shop-domain'];
        const merchants = await findMerchant("SHOPIFY_DOMAIN",shopify_domain);

        let matchedDesignObjects: any[] = [];
        // let line_items_product: any[] = [];
        let pod_shopify_product: string = "";
      
        if (merchants.status < 300 && merchants.data.list) {
            let merchant_uuid = "";
            merchants.data.list.forEach(m => {
                if (m.exists) {
                    merchant_uuid = m.id
                }
            });

            try {
                const order = body;
                const lineItems = order.line_items;
            
                // Get matching Design Objects in imPowered
                const designObjects = await getCollections(merchant_uuid, "designs");

                for (const lineItem of lineItems) {
                    const li_sku = lineItem.sku as string;
                    const matchingDesignObject = designObjects.data.collection && designObjects.data.collection.find(
                        (obj) => li_sku.includes(obj.sku)
                    );
                    if (matchingDesignObject) {
                        pod_shopify_product = matchingDesignObject.pod_shopify;
                        console.log(pod_shopify_product)
                        console.log(lineItem)
                        matchedDesignObjects.push(lineItem);
                    }
                }

                if (matchedDesignObjects.length < 1) {
                    text = " ⚠️ [ERROR] Likely does not have a desgn needing to be printed";
                    status = 205;
                }

            } catch (error) {
                functions.logger.error(text);
            }

            let shopify_uuid = "";

            // Create Shpify Customer
            try {
                const order = body;
                const shipping = order.shipping_address;
                const email = order.email;

                const respoonse = await createShopifyPODCustomer(shipping, email);

                if (respoonse != undefined) {
                    const result = JSON.parse(JSON.stringify(respoonse));
    
                    if (result.customers[0] && result.customers[0].id != "") {
                        functions.logger.info(" ❹ [SHOPIFY] - External UUID Created");
                        shopify_uuid = result.customers[0].id;
                    }
                }
                
            } catch (error) {
                functions.logger.error(error);
            }

            // // Fethc Bigly POD Product
            // TODO: Consider if this step is necceary 
            
            // try {

            //     const respoonse = await fetchPODProduct(pod_shopify_product);

            //     if (respoonse != undefined) {
            //         const result = JSON.parse(JSON.stringify(respoonse));

            //         console.log(" 🛍️ [SHOPIFY] FECHED PRODUCT")
            //         console.log(result)
    
            //         if (result.product && result.product.variants) {
            //             const pod_variants = result.product.variants as {sku: string}[];
            //             functions.logger.info(" ❹ [SHOPIFY] - External UUID Created");
            //             line_items_product = pod_variants.filter((v) => v.sku.includes())
            //         }
            //     }
                
            // } catch (error) {
            //     functions.logger.error(error);
            // }

            // Create Shopify order to POD store
            try {
                const order = body;
                await createShopifyOrderBiglyPod(order, matchedDesignObjects, shopify_uuid)

            } catch (error) {
                functions.logger.error(error);
                
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
