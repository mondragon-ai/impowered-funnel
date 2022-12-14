import * as express from "express"
import { getDocument, getFunnelDocument, updateDocument, updateFunnelsDocument } from "../lib/helpers/firestore";
import { handleStripeCharge, handleSubscription } from "../lib/helpers/stripe";
import { Customer } from "../lib/types/customers";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { impoweredRequest } from "../lib/helpers/requests";
import * as crypto from "crypto";
import { DraftOrder } from "../lib/types/draft_rders";
import { DailyFunnel } from "../lib/types/analytics";
import { getToday } from "../lib/helpers/date";

export const paymentsRoutes = (app: express.Router) => {
    app.post("/payments/quick-buy", async (req: express.Request, res: express.Response) => {
        let status = 500,
        text = "ERROR: LIkely internal problem 👽",
        data: Customer | null = null;

        // Merchant UUID 
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        // cus_uuid 
        const cus_uuid = "cus_3bd86494a7";

        // dra_uuid 
        const dra_uuid = "dra_fa9019df4d";

        // product 
        const product = {
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
        const line_items = [
            {
                high_risk: true,
                title: "Delta 8 Strawberry Gummies",
                sku: "D8-SRA-GUM",
                price: 3700,
                compare_at_price: 0,
                handle: "delta-8-strawberry-gummies",
                options1: "2-Pack",
                options2: "",
                options3: "",
                weight: 0.1
            }
        ];

        try {

            // fetch usr from DB to get stripe UUID
            const result = await getDocument(MERCHAND_UUID, "customers", cus_uuid);

            if (result.status < 300) {
                data =  result.data != undefined ? (result.data) as Customer  : null;
                status = 200;
                text = "SUCCESS: " + result.text;
            } 
            
        } catch (e) {
            functions.logger.info(text + " - Fetching DB User")
        }

        let result = {
            STRIPE_PI: "",
            STRIPE_PM: ""
        }
        
        try {
            // Make initial charge
            result = await handleStripeCharge(
                MERCHAND_UUID,
                String(data?.stripe?.UUID),
                product.price,
                String(data?.email),
                text,
                product,
                null,
                cus_uuid);

        } catch (e) {
            functions.logger.info(text + " - Charging Stripe | square");
        }

        try {
            if (result.STRIPE_PI != "") {
                // Make initial charge
                await updateDocument(MERCHAND_UUID, "draft_orders", dra_uuid, {
                    line_items: [
                        ...line_items,
                        product
                    ],
                    updated_at: admin.firestore.Timestamp.now(),
                });
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
            t = "SUCCESS: " + text;
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

    app.post("/payments/quick-sub", async (req: express.Request, res: express.Response) => {
        let s = 500,
        t = "ERROR: LIkely internal problem 👽";

        const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

        // CUS UUID
        const cus_uuid = req.body.cus_uuid as string;

        // Customer Doc
        const customer: Customer = (await getDocument(MERCHANT_UUID, "customers", cus_uuid)).data as Customer;
        let draft_order: DraftOrder = {} as DraftOrder;

        // Logging
        functions.logger.info("\n\n\n188: ROOT - Customer ==>\n");
        console.log(customer);

        try {
            console.log(customer.draft_orders[0])
            draft_order = (await getDocument(MERCHANT_UUID, "draft_orders", customer.draft_orders[0])).data as DraftOrder;
        } catch (e) {
            t = t + " - fetching draft order";
        };

        // Set vars for subs
        const shopify_uuid = customer.shopify_uuid;
        const stripe_uuuid = customer.stripe?.UUID as string;
        const stripe_pm = customer.stripe?.PM as string;

        // Logging
        functions.logger.info("\n\n\n202: ROOT - PRE FETCH DATA ==>\n");
        functions.logger.info(shopify_uuid);
        functions.logger.info(stripe_uuuid);
        functions.logger.info(stripe_pm);
        functions.logger.info(draft_order);

        try {
            const result = await handleSubscription(MERCHANT_UUID, cus_uuid, shopify_uuid, stripe_uuuid, stripe_pm, draft_order);
            functions.logger.info(result);
            s = 200;
            t = "SUCCESS: Cutomer charged & subbed 👽 ";
            
        } catch (e) {
            t = t + " - Stripe Sub"
        }

        try {

            // Get todays date in ID string
            const today = await getToday();

            // Update FB Doc 
            const funnelDoc = (await getFunnelDocument(MERCHANT_UUID, "analytics", String(today))).data as DailyFunnel;

            // Logging
            functions.logger.info("\n\n\n240: HANDLE STRIPE CHARGE - FUNNEL (analytics) ==>\n");
            functions.logger.info(funnelDoc);

            const { 
              upsell_sales_count,
              upsell_sales_value,
              upsell_unique_page_views,
              upsell_recurring_count
            } = funnelDoc;
        
            // set unique views
            const uupv = upsell_unique_page_views > 0 ? upsell_unique_page_views : 1;
        
            // Update FB Doc 
            const funnel = await updateFunnelsDocument(MERCHANT_UUID, "analytics", String(today), {
              updated_at: admin.firestore.Timestamp.now(),
              upsell_sales_count: (upsell_sales_count + 1),
              upsell_sales_value: (upsell_sales_value + 4000),
              upsell_sales_rate: ((upsell_sales_count + 1) / (uupv)),
              upsell_recurring_count: (upsell_recurring_count + 1) ,
              upsell_recurring_value: (upsell_sales_value + 4000)
            } as DailyFunnel);

            // Logging
            functions.logger.info("\n\n\n3247: HANDLE STRIPE CHARGE - Funnel (FB doc) ==>\n");
            functions.logger.info(funnel);

            
        } catch (e) {
            t = t + " - update funnel"
        }

        res.status(s).json({
            text: t,
            data: null
        })
    });

}