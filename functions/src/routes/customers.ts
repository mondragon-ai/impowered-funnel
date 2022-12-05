import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createCustomer } from "../lib/helpers/customers/create";
import { createDocument, getCollections, getDocument, getFunnelDocument, updateDocument, updateFunnelsDocument } from "../lib/helpers/firestore";
import { DailyFunnel } from "../lib/types/analytics";
import { getToday } from "../lib/helpers/date";
import { validateKey } from "./auth";
import { Customer } from "../lib/types/customers";
// import * as crypto from "crypto";

export const customerRoute = (
    app: express.Router,
    db: FirebaseFirestore.Firestore
) => {

    /**
     * Test route for customers
     * 
     */
    app.get("/customers/test", async (req: express.Request, res: express.Response) => {
        let status = 500, text = "ERROR: Likley internal issue 🤡. ";
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        const data = {
            first_name: "Obi",
            notes: "CUSTOM_CLICK_FUNNEL"
        }
        const result = await createDocument(MERCHAND_UUID, "customers", "cus_", data)

        if (result.status < 300) status = result.status, text = result.text; 

        res.status(status).json(text);
    });


    /**
     * Create customer & stripe account, then return client secret
     */
     app.post("/customers/create/quick", async (req: express.Request, res: express.Response) => {
        let status = 500, text = "";

        // Merchant ID
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        // new customer data
        const newSession = req.body.NEW_SESSION;

        // Create customer
        let data: {
            id?: string,
            STRIPE_UUID?: string,
            STRIPE_PI_UID?: string, 
            STRIPE_CLIENT_ID?: string
        } | null  = null;

        // Create customer
        const result = await createCustomer(MERCHAND_UUID, newSession);

        // check results 
        if (result.status >= 300) {
            data = null
        } else {
            data = {
                id: result?.data?.id,
                STRIPE_UUID: result?.data?.stripe?.UUID,
                STRIPE_PI_UID: result?.data?.stripe?.PI_UUID, 
                STRIPE_CLIENT_ID: result?.data?.stripe?.CLIENT_ID
            }

            // Responses back to the client
            text = "SUCCESS: Document created & stripe client created.";
            status = 200;

            try {
                    
                let TODAY: Date | string = new Date();  
                TODAY = TODAY.toString().substring(0,15);

                const FUNNEL_UUID = Math.floor(new Date(TODAY).getTime() / 1000);

                const result = await getFunnelDocument(MERCHAND_UUID, "analytics", String(FUNNEL_UUID))

                const analytics: DailyFunnel = result.data as DailyFunnel;


                const opv = analytics.order_page_views > 0 ? analytics.order_page_views : 1;
                const uopv = analytics.order_unique_page_views > 0 ? analytics.order_unique_page_views : 1;

                const update = {
                    ...result.data,
                    order_opt_in_rate: ((analytics.order_opt_ins) / (uopv)),
                    order_sales_rate: ((analytics.order_sales_count) / (uopv)),
                    order_earnings: (analytics.order_sales_value) / (opv),
                    order_earnings_unique: (analytics.order_sales_value) / (uopv),
                    upsell_earnings: (analytics.upsell_sales_value) / (opv),
                    upsell_earnings_unique: (analytics.upsell_sales_value) / (uopv),
                    updated_at: admin.firestore.Timestamp.now()
                }

                await updateFunnelsDocument(MERCHAND_UUID, "analytics", String(FUNNEL_UUID), update);


            } catch (e) {
                functions.logger.info("139: " + text + " - Updating analytics ");
            }
        }

        // return to client
        res.status(status).json({
            text: text,
            data: data,
        });
    });

    app.post("/customers/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started");
        let status = 200,
            text = "SUCCESS: Customer succesffully created",
            result: string = "",
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const customer: Customer = req.body.customer;

        // TODO: Sanatize scopes && data

        try {

            const response = await createDocument(merchant_uuid, "customers", "cus_", customer);

            if (response.status < 300 && response.data) {
                result = response.data.id;
            }
            
        } catch (e) {
            text = "ERROR: Likely a problem creating a customer";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: result
        })
    });

    app.post("/customers", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Customer Created Route Started");
        let status = 200,
            text = "SUCCESS: Customer(s) sucessfully fetched",
            result: Customer[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const cus_uuid: string = req.body.cus_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (cus_uuid === "") {
                const response = await getCollections(merchant_uuid, "customers");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "customers", cus_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Customer];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a customer";
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
                customers: result
            }
        })
    });

    /**
     * Update user infomration (opting in with email)
     */
     app.post("/customers/opt-in", async (req: express.Request, res: express.Response) => {
        let status = 500, text = "ERROR: Likey internal problems 🤷🏻‍♂️. ", data = false;

        // Merchant ID
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        // customer uuid
        const cus_uuid = req.body.cus_uuid;

        // new customer data
        const new_data = req.body.new_data;

        functions.logger.info(new_data);
        functions.logger.info(cus_uuid);
        try {

            // update customer document from main DB
            const result = await updateDocument(MERCHAND_UUID, "customers", cus_uuid, {
                ...new_data,
                updated_at: admin.firestore.Timestamp.now()
            });

            if (result.status < 300) {
                data = true;
                status = 200;
                text = "SUCCESS: " + result.text
            } 
            
        } catch (e) {
            functions.logger.error(text)
        }


        try {
            
            let TODAY = await getToday();

            const result = await getFunnelDocument(MERCHAND_UUID, "analytics", String(TODAY))

            const analytics: DailyFunnel = result.data as DailyFunnel;

            const update = {
                ...result.data,
                order_opt_ins: (analytics.order_opt_ins + 1),
                order_opt_in_rate: ((analytics.order_opt_ins + 1) / (analytics.order_page_views)),
                updated_at: admin.firestore.Timestamp.now()
            }

            await updateFunnelsDocument(MERCHAND_UUID, "analytics", String(TODAY), update);


        } catch (e) {
            functions.logger.info("66: " + text + " - Updating analytics ");
        }


        // return to client
        res.status(status).json({
            text: text,
            data: data,
        });
    });

}