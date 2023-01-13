import * as express from "express"
import { getDocument, updateDocument } from "../lib/helpers/firestore";
import { handleStripeCharge, handleSubscription } from "../lib/helpers/stripe";
import { Customer } from "../lib/types/customers";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { impoweredRequest } from "../lib/helpers/requests";
import * as crypto from "crypto";
import { DraftOrder, LineItem, Order } from "../lib/types/draft_rders";
import { updateFunnelSubPurchase } from "../lib/helpers/analytics/update";
import { validateKey } from "./auth";

export const paymentsRoutes = (app: express.Router) => {
    app.post("/payments/quick-buy", async (req: express.Request, res: express.Response) => {
        let status = 500,
        text = " =====> [ERROR]: LIkely internal problem 👽",
        customer: Customer | null = null;

        const {
            merchant_uuid,
            cus_uuid,
            dra_uuid,
            high_risk
        } = req.body


        // product 
        const product: LineItem = req.body.product || {
            high_risk: true,
            title: "Delta 8 Kush Berry Gummies",
            sku: "D8-KB-GUM",
            price: 7500,
            compare_at_price: 0,
            handle: "delta-8-kush-berry-gummies",
            options1: "4-Pack",
            options2: "",
            options3: "",
            weight: 0.1
        };

        // product 
        const line_items: LineItem[] = [product];

        try {

            // fetch usr from DB to get stripe UUID
            const repsonse = await getDocument(merchant_uuid, "customers", cus_uuid);

            if (repsonse.status < 300) {
                customer =  repsonse.data != undefined ? (repsonse.data) as Customer  : null;
                status = 200;
                text = " => [SUCCESS]: " + repsonse.text;
            } 
            
        } catch (e) {
            functions.logger.info(text + " - Fetching DB User")
        }

        let result = ''
        
        try {
            // Make initial charge
            result = await handleStripeCharge(
                customer as Customer,
                product?.price,
                product,
                null,
                high_risk,
                false);

        } catch (e) {
            functions.logger.info(text + " - Charging Stripe | square");
        }

        try {
            if (result && result !== "") {
                // Make initial charge
                await updateDocument(merchant_uuid, "draft_orders", dra_uuid, {
                    order_number: "",
                    line_items: [
                        ...line_items,
                        product
                    ],
                    updated_at: admin.firestore.Timestamp.now(),
                    transaction_id: result
                } as Order);
            }
            
        } catch (e) {
            functions.logger.info(text + " - Updating draft order document");
        }

        res.status(status).json({
            text: text,
            data: null
        })
    });

    app.post("/payments/square", async (req: express.Request, res: express.Response) => {
        let s = 500,
        t = "ERROR: LIkely internal problem 👽";

        const { sourceId, locationId} = req?.body
        functions.logger.info('Storing card');
        functions.logger.info(" TOKEN => " + sourceId);
        functions.logger.info(" LOCATION => " + locationId);

        try {
            functions.logger.debug('Storing card');
    
            const idempotencyKey = crypto.randomBytes(16);
            const cardReq = {
                idempotency_key: "" + idempotencyKey,
                amount_money: {
                  amount: 100,
                  currency: "USD"
                },
                source_id: "" + sourceId,
                autocomplete: true,
                customer_id: "PG2DN7DBJ55YBY7YX2P4NQAHV4",
                location_id: "" + locationId,
                reference_id: "123456",
                note: "TEST",
                app_fee_money: {
                  amount: 10,
                  currency: "USD"
                }
              };
    
            const test = await impoweredRequest("/customers", "", null);

            // Logging
            functions.logger.info('Store Card succeeded!', test);
            
    
            // Logging
            const {text, status, data} = await impoweredRequest("/payments", "POST", cardReq);
    
            // Logging
            functions.logger.info('Store Card succeeded!', { text, status });
            
            // Logging
            t = "[SUCCESS]: " + text;
            s = status

            console.log(data)
            
        } catch (ex) {
            if (ex) {
            // likely an error in the request. don't retry
            functions.logger.error(ex);
            } else {
            // IDEA: send to error reporting service
            functions.logger.error(
                `Error creating card-on-file on attempt: ${ex}`
            );
            }
        }

        res.status(s).json({
            text: t,
            data: null
        })
    })

    app.post("/payments/quick-sub", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.info(" ====> [PAYMENTS] - Started Quick Sub ✅")
        let status = 500,
            text = " 🚨 [ERROR]: Likey internal problems 🤷🏻‍♂️. ",
            ok = false;

        // Items from funnel checkout page
        const {
            cus_uuid, 
            merchant_uuid,
            funnel_uuid,
            product
        } = req.body

        let customer: Customer = {} as Customer;

        // Customer Doc
        const res_customer = await getDocument(merchant_uuid, "customers", cus_uuid);

        if (res_customer.status < 300 && res_customer.data) {
            customer = res_customer.data as Customer;
            status = 200;
            text = "[SUCCESS]: Customer Fetched";
            ok = true;
        }

        let draft_order: DraftOrder = {} as DraftOrder;

        // Logging
        functions.logger.info("[CUSTOMER] - Fetched:");

        try {
            console.log(customer.draft_orders)
            const res_draft_order = await getDocument(merchant_uuid, "draft_orders", customer.draft_orders);

            if (res_draft_order.status < 300 && res_draft_order.data) {
                draft_order = res_draft_order.data as DraftOrder;
                status = 200;
                text = text + " - Draft Order Fetched";
                ok = true;
            }
        } catch (e) {
            text = text + " - fetching draft order";
        };

        // Logging
        functions.logger.info("[PRICE]");

        const price = (product as LineItem) ? (product as LineItem).price : 0;
        functions.logger.info(price);

        if (draft_order) {
            try {
                const result = await handleSubscription(customer, merchant_uuid, draft_order, price);
                console.log(result);
                status = 200;
                text = "[SUCCESS]: Cutomer charged & subbed 👽 ";
                ok = true;
                console.log(text);
                
            } catch (e) {
                text = text + " - Stripe Sub doesnt exist"
                functions.logger.info(text);
            }

            // Update  analytics
            await updateFunnelSubPurchase(merchant_uuid, funnel_uuid, price);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            data: null
        })
    });

}