import * as express from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { completeDraftOrder } from "../lib/helpers/draft_orders/complete";
import { createDocument, getCollections, getDocument, getPaginatedCollections } from "../lib/helpers/firestore";
// import { Customer } from "../lib/types/customers";
import { DraftOrder, Order } from "../lib/types/draft_rders";
import { validateKey } from "./auth";

export const orderRoutes = (app: express.Router) => {
    app.post("/orders/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to sync to algolia");
        let status = 200,
            text = "SUCCESS: collection successfully synced ✅",
            result: string = "",
            ok = true;

        const merchant_uuid:string = req.body.merchant_uuid;
        const order: Order = req.body.order;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        // Fetch colletion to be synecd
        try {
            const response = await createDocument(merchant_uuid, "orders", "ord_", order);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            
        } catch (e) {
            text = "ERROR: Likely codlnt create a order document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   


        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                ord_uuid: result
            }
        })
    });


    app.post("/orders", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started ");
        let status = 200,
            text = "[SUCCESS]: Order(s) sucessfully fetched ✅",
            result: Order[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const ord_uuid: string = req.body.ord_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (ord_uuid === "") {
                const response = await getCollections(merchant_uuid, "orders");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
                if (response.status == 420) {
                    text = response.text;
                    size = 0;
                    ok = false;
                }
            } else {
                const response = await getDocument(merchant_uuid, "orders", ord_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Order];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a order";
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
                orders: result
            }
        })
    });


    app.post("/draft_orders/complete_server", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [COMPLETE_DRAFT_ORDER] - Started Route ");
        let status = 200,
            text = " 🎉 [SUCCESS]: Order sucessfully completed ✅",
            ok = true;

        const {
            merchant_uuid,
            dra_uuid,
            cus_uuid
        } = req.body;

        functions.logger.debug(" ❶[INPUT] 👇🏻");
        functions.logger.debug(merchant_uuid);
        functions.logger.debug(dra_uuid);
        functions.logger.debug(cus_uuid);

        let order: DraftOrder = {} as DraftOrder;
        if (cus_uuid || cus_uuid === "") {
            try {
              // Create Order
              const repsonse = await getDocument(merchant_uuid, "draft_orders", dra_uuid);
    
              if (repsonse.status < 300 && repsonse.data) {
                order = repsonse.data as DraftOrder;
              }
              
            } catch (e) {
                text = " 🚨 [ERROR]: Likely a problem completing a order";
                status = 500;
                ok = false;
                functions.logger.error(text);
            }
        }
        
        try {
          // Create Order
          await completeDraftOrder(merchant_uuid, dra_uuid, order.customer_id as string);
          
        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem completing a order";
            status = 500;
            ok = false;
            functions.logger.error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: " Did delete: " + ok
        })
    });

    app.post("/draft_orders", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started ");
        let status = 200,
            text = "SUCCESS: Order(s) sucessfully fetched ✅",
            result: Order[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const dra_uuid: string = req.body.dra_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (dra_uuid === "") {
                const response = await getCollections(merchant_uuid, "draft_orders");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "draft_orders", dra_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Order];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a order";
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
                orders: result
            }
        })
    });

    

    /**
     * Search & return users: 
     */
    app.post("/orders/next", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [ORDERS]: Order Paginate Next Start Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: Blogs sucessfully fetched",
            result: Order[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;
        const seconds = req.body.start | 0;
        functions.logger.debug(seconds);

        try {

            const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
            functions.logger.debug(start);

            const response = await getPaginatedCollections(merchant_uuid, "orders", start);
            if (response?.data?.collection && response.status < 300) {
                result = response?.data?.collection;
                size = response?.data?.size ? response?.data?.size : 1;
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem fetching a orders";
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
                orders: result
            }
        })
    });

    
}