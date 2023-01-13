import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin"; 
import { createCustomerPayment } from "../lib/helpers/customers/create";
import { createDocument, createFunnelAnalytics, fetchFunnelAnalytics, getCollections, getDocument, updateFunnelAnalytics } from "../lib/helpers/firestore";
import { FunnelAnalytics } from "../lib/types/analytics";
import { getToday } from "../lib/helpers/date";
import { validateKey } from "./auth";
import { Customer } from "../lib/types/customers";
import { Funnel } from "../lib/types/funnels";
import { Address } from "../lib/types/addresses";
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
        let status = 500, text = "[ERROR]: Likley internal issue 🤡. ";
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
    //  app.post("/customers/create/quick", async (req: express.Request, res: express.Response) => {
    //     let status = 500, text = "";

    //     // Merchant ID
    //     const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

    //     const funnel_uuid = req.body.funnel_uuid;
    //     const high_risk = req.body.high_risk;
    //     // new customer data
    //     const newSession = req.body.NEW_SESSION;

    //     // Create customer
    //     let data: {
    //         id?: string,
    //         STRIPE_UUID?: string,
    //         STRIPE_PI_UID?: string, 
    //         STRIPE_CLIENT_ID?: string
    //     } | null  = null;

    //     // Create customer
    //     await createCustomerPayment(MERCHAND_UUID, newSession, funnel_uuid, high_risk);

    //     // return to client
    //     res.status(status).json({
    //         text: text,
    //         data: data,
    //     });
    // });

    /**
     * Create customer & stripe account, then return client secret
     */
    app.post("/customers/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" =====> [CREATE CUSTOMER] - ✅ Started"); 
        let status = 200,
            text = "[SUCCESS]: Customer succesffully created",
            ok = true;

        // if valid
        const {
            merchant_uuid,
            funnel_uuid,
            high_risk
        } = req.body;
        
        // Create customer
        let result: {
            id?: string,
            STRIPE_UUID?: string,
            STRIPE_PI_UID?: string, 
            STRIPE_CLIENT_ID?: string,
            shipping?: Address[],
            payment_exists?: boolean
        } = {};

        // Customer Data
        let customer: Customer = req.body.customer;

        // TODO: Sanatize scopes && data
        try {

            // Create customer
            const response = await createCustomerPayment(merchant_uuid, funnel_uuid, customer, high_risk);
            functions.logger.debug(" ====> [CREATE RESPONSE] - Payment");
            console.log(response?.customers)

            if (response?.status < 300 && response?.customers) {
                result = {
                    ...result,
                    id: response?.customers?.cus_uuid ? response.customers.cus_uuid : response.customers.id ? response.customers.id : "",
                    STRIPE_UUID: response?.customers?.stripe?.UUID ? response?.customers?.stripe?.UUID  : "",
                    STRIPE_PI_UID: response?.customers?.stripe?.PI_UUID ? response?.customers?.stripe?.PI_UUID  : "", 
                    STRIPE_CLIENT_ID: response?.customers?.stripe?.CLIENT_ID ? response?.customers?.stripe?.CLIENT_ID : "",
                    shipping: response?.customers ? response?.customers?.addresses : [],
                    payment_exists: response?.customers?.stripe?.PM ? false : true
                };

                customer = {
                    ...customer,
                    ...response.customers,
                    merchant_uuid: merchant_uuid,
                    funnel_uuid: funnel_uuid
                }
            }
            
        } catch (e) {
            text = "[ERROR]: Likely a problem creating a customer.";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }
        
        if (funnel_uuid && funnel_uuid !== "") {
            try {
            
                let TODAY = await getToday();
    
                const result = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY))
    
                const analytics: FunnelAnalytics | null =  result.data ? result.data as FunnelAnalytics : null;
    
                if (analytics !== null && customer && result) {
                    functions.logger.debug(" ====> [FUNNEL ID] - Update Analytics");
                    const update = {
                        ...analytics,
                        steps: analytics.steps ? analytics?.steps.map(step => {
                            if (step.name === "OPT_IN") {
                                return {
                                    ...step,
                                    opt_ins: (step.opt_ins + 1),
                                    opt_in_rate: ((step.opt_ins ? step.opt_ins + 1 : 1) / (step.page_views ? step.page_views : 1)),
                                }
                            } 
                            return step
                        }) : [],
                        updated_at: admin.firestore.Timestamp.now()
                    } as FunnelAnalytics;

                    await updateFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), update);
        
                } else {

                    if (customer && result) {
                        functions.logger.debug(" ====> [FUNNEL ID] - Create Analytics");

                        let funnel: Funnel = {} as Funnel
                    
                        const response = await getDocument(merchant_uuid, "funnels", funnel_uuid);
                
                        if (response.status < 300 && response.data) {
                            funnel = response.data as Funnel;
                        }
    
                        let update = {
                            total_orders: 0,
                            total_sales: 0,
                            total_aov: 0,
                            steps: funnel?.steps ? funnel?.steps.map((step, i) => {
                                if (step.name === "OPT_IN") {
                                    return (
                                    {
                                        name: step.name,
                                        page_views: 0,
                                        unique_page_views: 0,
                                        opt_ins: 1,
                                        opt_in_rate: 1,
                                        sales_count: 0,
                                        sales_rate: 0,
                                        sales_value: 0,
                                        recurring_count: 0,
                                        recurring_value: 0,
                                        earnings: 0,
                                        earnings_unique: 0,
                                        painted: false,
                                    }
                                    )
                                } else {
                                    return (
                                    {
                                        name: step.name,
                                        page_views: 0,
                                        unique_page_views: 0,
                                        opt_ins: 0,
                                        opt_in_rate: 0,
                                        sales_count: 0,
                                        sales_rate: 0,
                                        sales_value: 0,
                                        recurring_count: 0,
                                        recurring_value: 0,
                                        earnings: 0,
                                        earnings_unique: 0,
                                        painted: false,
                                    }
                                    )
                                }
                            }) : [],
                            updated_at: admin.firestore.Timestamp.now(),
                            created_at: admin.firestore.Timestamp.now(),
                        } as any
                        
                        // creat new funnnel_analytics doc
                        const new_fun = await createFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), update);  
    
                        console.log(new_fun)
                    }
                }

            } catch (e) {
                functions.logger.info("168: [ERROR] - Updating analytics ");
            }
        } else {
            // TODO: Update store analytics
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: result
        })
    });

    /**
     * Search & return users: 
     */
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
     *  Update user infomration (opting in with email)
     */
    //  app.post("/customers/opt-in", async (req: express.Request, res: express.Response) => {
    //     let status = 500, text = "ERROR: Likey internal problems 🤷🏻‍♂️. ", data = false;

    //     // Merchant ID
    //     const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

    //     // customer uuid
    //     const cus_uuid = req.body.cus_uuid;

    //     // new customer data
    //     const new_data = req.body.new_data;

    //     functions.logger.info(new_data);
    //     functions.logger.info(cus_uuid);
    //     try {

    //         // update customer document from main DB
    //         const result = await updateDocument(MERCHAND_UUID, "customers", cus_uuid, {
    //             ...new_data,
    //             updated_at: admin.firestore.Timestamp.now()
    //         });

    //         if (result.status < 300) {
    //             data = true;
    //             status = 200;
    //             text = "SUCCESS: " + result.text
    //         } 
            
    //     } catch (e) {
    //         functions.logger.error(text)
    //     }


    //     try {
            
    //         let TODAY = await getToday();

    //         const result = await getFunnelDocument(MERCHAND_UUID, "analytics", String(TODAY))

    //         const analytics: DailyFunnel = result.data as DailyFunnel;

    //         const update = {
    //             ...result.data,
    //             order_opt_ins: (analytics.order_opt_ins + 1),
    //             order_opt_in_rate: ((analytics.order_opt_ins + 1) / (analytics.order_page_views)),
    //             updated_at: admin.firestore.Timestamp.now()
    //         }

    //         await updateFunnelsDocument(MERCHAND_UUID, "analytics", String(TODAY), update);


    //     } catch (e) {
    //         functions.logger.info("66: " + text + " - Updating analytics ");
    //     }


    //     // return to client
    //     res.status(status).json({
    //         text: text,
    //         data: data,
    //     });
    // });

}