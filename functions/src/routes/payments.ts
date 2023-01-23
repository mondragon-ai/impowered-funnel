import * as express from "express"
import { getDocument, updateDocument } from "../lib/helpers/firestore";
import { handleStripeCharge, handleSubscription } from "../lib/helpers/stripe";
import { Customer } from "../lib/types/customers";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { squareRequest } from "../lib/helpers/requests";
import * as crypto from "crypto";
import { DraftOrder, LineItem, Order } from "../lib/types/draft_rders";
import { updateFunnelSubPurchase } from "../lib/helpers/analytics/update";
import { validateKey } from "./auth";
import { Address } from "../lib/types/addresses";

export type SquareBody = {
    sourceId: string, 
    cus_uuid: string,
    billing: Address,
    merchant_uuid: string,
    name: {
        first_name: string,
        last_name: string,
    }
}

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

        let result = '';
        
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

    app.post("/payments/quick-buy/square", async (req: express.Request, res: express.Response) => {
        let s = 500,
        t = "ERROR: LIkely internal problem 👽";

        const { sourceId, locationId} = req?.body
        functions.logger.info('Storing card');
        functions.logger.info(" TOKEN => " + sourceId);
        functions.logger.info(" LOCATION => " + locationId);

        // TODO: Fetch customer data for Square 


        try {
            functions.logger.debug('Storing card');
    
            const idempotencyKey = crypto.randomBytes(16).toString('hex');
            const cardReq = {
                idempotency_key: "" + idempotencyKey,
                amount_money: {
                  amount: 100,
                  currency: "USD"
                },
                source_id: "" + sourceId,
                autocomplete: true,
                customer_id: "N1TH0YGN3HH8GF9BWH7BVXG9CC",
                location_id: "" + locationId,
                reference_id: "123456",
                note: "TEST",
                app_fee_money: {
                  amount: 10,
                  currency: "USD"
                }
              };
    
            const test = await squareRequest("/customers", "", null);

            // Logging
            functions.logger.info('Store Card succeeded!', test);
            
            // Logging
            const {text, status, data} = await squareRequest("/payments", "POST", cardReq);
    
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

    app.post("/payments/square", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [STARTED] -> Square Payment');
        let s = 500,
            t = " 🚨 [ERROR]: LIkely internal problem 👽",
            ok = false;

        const {
            sourceId,
            cus_uuid,
            billing,
            merchant_uuid,
        } = req?.body as SquareBody;

        let customer = {} as Customer;

        let SQURE_PM = "";
        let SQURE_PI = "";
        functions.logger.info('Storing card');
        functions.logger.info(" TOKEN => " + sourceId);
        functions.logger.info(" CUS_UUID => " + cus_uuid);

        // TODO: Fetch customer data for Square 
        try {

            const response = await getDocument(merchant_uuid, "customers", cus_uuid)

            if (response.status < 300 && response.data) {
                customer = response.data as Customer
            }
            
        } catch (e) {
            functions.logger.debug('Storing card');
        }


        try {
    
            const idempotencyKey = crypto.randomBytes(16).toString('hex');
            // const cardReq = {
            //     idempotency_key: "" + idempotencyKey,
            //     amount_money: {
            //       amount: 100,
            //       currency: "USD"
            //     },
            //     source_id: "" + sourceId,
            //     autocomplete: true,
            //     customer_id: "N1TH0YGN3HH8GF9BWH7BVXG9CC",
            //     location_id: "" + locationId,
            //     reference_id: "123456",
            //     note: "TEST",
            //     app_fee_money: {
            //       amount: 10,
            //       currency: "USD"
            //     }
            //   };

            const cardReq = {
                idempotency_key: "" + idempotencyKey,
                source_id: "" + sourceId,
                card: {
                    billing_address: {
                        address_line_1: billing.line1 ?  billing.line1 : "",
                        address_line_2: billing.line2 ?  billing.line2 : "",
                        locality: billing.city ?  billing.city : "",
                        administrative_district_level_1: billing.state ?  billing.state : "",
                        postal_code: billing.zip ?  billing.zip : "",
                        country: billing.country ?  billing.country : "",
                    },
                    cardholder_name: (customer.first_name ? customer.first_name : "") + " " + (customer.last_name ? customer.last_name : ""),
                    customer_id: customer.square?.UUID,
                    reference_id: merchant_uuid
                }
            };
            

            if (customer.square?.UUID !== "") {
                // Store user card POSTing to /cards -> new source_id
                const {text, status, data} = await squareRequest("/cards", "POST", cardReq);
    
                // Logging
                functions.logger.info('Store Card succeeded!', { text, status });

                SQURE_PM = data?.card?.id ? data.card.id : ""

            }
            
        } catch (ex) {
            functions.logger.error(t);
        }

        try {

            if (customer.square?.UUID !== "") {
                const new_key = crypto.randomBytes(16).toString('hex');
                // const {text, status, data} = await squareRequest("/payments", "POST", cardReq);
                const payment_response = await squareRequest("/payments", "POST", {
                    idempotency_key: "" + new_key,
                    amount_money: {
                        amount: 200,
                        currency: "USD"
                    },
                    source_id: SQURE_PM,
                    autocomplete: true,
                    customer_id: customer.square?.UUID,
                    location_id: customer.square?.location,
                    reference_id: merchant_uuid,
                });
                functions.logger.info('Payment Success!', payment_response);
                SQURE_PI = payment_response.data?.payment?.id ? payment_response.data.payment.id : ""
            }
        } catch (e) {
            
        }

        customer = {
            ...customer,
            square: {
                ...customer.square,
                PM: SQURE_PM
            },
            orders: [
                ...customer.orders,
                SQURE_PI
            ]
        }

        try {
            if (SQURE_PM !== "" && customer.id !== "") {
                const response = await updateDocument(merchant_uuid, "customers", cus_uuid, customer);

                if (response.status < 300 && response.data) {
                    t = " 👍🏻 [SUCCESS]: " + " Card stored && updated graciously!";
                    s = 200
                    ok = true
                }
            }
        } catch (e) {
            functions.logger.error(t);
        }
        res.status(s).json({
            text: t,
            data: null,
            ok: ok
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