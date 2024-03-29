import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, getCollections, getDocument, getPaginatedCollections } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { SubscriptionAgreement } from "../lib/types/products";
import { giveGiftCard } from "../lib/helpers/shopify";

export const giftCardRoutes = (app: express.Router) => {
    app.post("/gift_cards/test", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create gift card");
        let status = 200,
            text = "SUCCESS: Gift Card document succesffully created 👽",
            result: any = null,
            ok = true;

        // Merchant uuid 
        // const merchant_uuid:string = req.body.merchant_uuid;
        const shopify_uuid:string = req.body.shopify_uuid;


        // Create gift card document 
        try {
            const response = await giveGiftCard(shopify_uuid)


            if (response) {
                result = response;
            }

            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "ERROR: Likely couldnt create a gift card document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok,
            text,
            result
        })
    });
    app.post("/gift_cards/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create gift card");
        let status = 200,
            text = "SUCCESS: Gift Card document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        let gift_cards: SubscriptionAgreement = req.body.gift_cards;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        gift_cards = {
            ...gift_cards,
            updated_at: admin?.firestore?.Timestamp?.now(),
            created_at: admin?.firestore?.Timestamp?.now(),
        } 


        // Create gift card document 
        try {
            const response = await createDocument(merchant_uuid, "gift_cards", "gif_", gift_cards);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "ERROR: Likely couldnt create a gift card document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                gif_uuid: result
            }
        })
    });

    app.post("/gift_cards", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Gift Card(s) being fetched ");
        let status = 200,
            text = "SUCCESS: Gift Card(s) sucessfully fetched ✅",
            result: SubscriptionAgreement[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const gif_uuid: string = req.body.gif_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (gif_uuid === "") {
                const response = await getCollections(merchant_uuid, "gift_cards");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "gift_cards", gif_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as SubscriptionAgreement];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a gift card(s)";
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
                gift_cards: result
            }
        })
    });

    /**
     * Search & return users: 
     */
    app.post("/gift_cards/next", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [ORDERS]: gift_cards Paginate Next Start Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: gift_cards sucessfully fetched",
            result: SubscriptionAgreement[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;
        const seconds = req.body.start | 0;
        functions.logger.debug(seconds);

        try {

            const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
            functions.logger.debug(start);

            const response = await getPaginatedCollections(merchant_uuid, "gift_cards", start);
            if (response?.data?.collection && response.status < 300) {
                result = response?.data?.collection;
                size = response?.data?.size ? response?.data?.size : 1;
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem fetching a gift_cards";
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
                gift_cards: result
            }
        })
    });
}