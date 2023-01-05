import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getToday } from "../lib/helpers/date";
import { createDocument, createFunnelAnalytics, fetchFunnelAnalytics, getCollections, getDocument, } from "../lib/helpers/firestore";
import { FunnelAnalytics } from "../lib/types/analytics";
import { Funnel } from "../lib/types/funnels";
import { validateKey } from "./auth";

export const funnelRoutes = (app: express.Router) => {
    app.post("/funnels/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [FUNNEL] - Started ✅");
        let status = 200,
            text = "[SUCCESS]: Funnel document succesffully created 👽",
            size = 0,
            result: string = "",
            ok = true;


        const TODAY = await getToday();

        // Merchant uuid
        const merchant_uuid:string = req.body.merchant_uuid;

        // Data to push
        let funnel: Funnel = req.body.funnel;

        funnel = {
            ...funnel,
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        } as any


        // TODO: SPECIAL SCOPE ACCESS CHECK

        // Create funnel document 
        try {
            const response = await createDocument(merchant_uuid, "funnels", "fun_", funnel);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = " 🚨 [ERROR]: Likely couldnt create a funnel document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }
        let analytics: FunnelAnalytics = {} as FunnelAnalytics

        if (funnel?.steps && funnel?.steps?.length <= 0) {
            text = " 🚨 [ERROR]:  Steps necessary to create a funnel";
            status = 400;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        } else {
            functions.logger.debug(" => Steps exist");

            analytics = {
                ...analytics,
                total_funnel_orders: 0,
                total_funnel_sales: 0,
                total_funnel_aov: 0,
                steps: funnel?.steps ? funnel?.steps.map((step, i) => {
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
                            order: (i ? i + 1 : 1)
                        }
                    )
                }) : [],
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
            } as FunnelAnalytics

        }

        // Create funnel analytics document 
        try {

            if (result === "") {
                text = " 🚨 [ERROR]: Likely couldnt create a funnel document. Cant create analytics without Funnel ID";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }

            functions.logger.debug(" => Ready to push data");
            functions.logger.debug(" => result (id) - " + result);
            functions.logger.debug(" => analytics (to create) -  ");

            const response = await createFunnelAnalytics(merchant_uuid, result, String(TODAY), analytics);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            
        } catch (e) {
            text = " 🚨 [ERROR]: Likely couldnt create a funnel document";
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
                fun_uuid: result
            }
        })
    });


    app.post("/funnels", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Fetching the funnel(s) ");
        let status = 200,
            text = "SUCCESS: Order(s) sucessfully fetched ✅",
            result: any[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const fun_uuid: string = req.body.fun_uuid;

        // TODO: Sanatize scopes && data
        const TODAY = await getToday();

        try {

            if (fun_uuid === "") {
                const response = await getCollections(merchant_uuid, "funnels");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "funnels", fun_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Funnel];
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

        // Data to push
        let funnel: Funnel = {} as Funnel;

        funnel = {
            ...funnel,
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        } as any


        // TODO: SPECIAL SCOPE ACCESS CHECK

        if (result.length <= 0) {

            // Create funnel document 
            try {
                const response = await fetchFunnelAnalytics(merchant_uuid, fun_uuid, String(TODAY),);
    
                // data check && set
                if (response?.status < 300 && response?.data) {
                    funnel = response?.data as Funnel;
                }
                functions.logger.debug(" => FUNNEL Fetched");
                
            } catch (e) {
                text = " 🚨 [ERROR]: Likely couldnt create a funnel document";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }
            let analytics: FunnelAnalytics = {} as FunnelAnalytics;
    
            if (funnel?.steps && funnel?.steps?.length <= 0) {
                text = " 🚨 [ERROR]:  Steps necessary to create a funnel";
                status = 400;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            } else {
                functions.logger.debug(" => Steps exist");
    
                analytics = {
                    ...analytics,
                    total_funnel_orders: 0,
                    total_funnel_sales: 0,
                    total_funnel_aov: 0,
                    steps: funnel?.steps ? funnel?.steps.map((step, i) => {
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
                                order: (i ? i + 1 : 1)
                            }
                        )
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as FunnelAnalytics
    
            }
    
             // Create funnel analytics document 
            try {
    
                functions.logger.debug(" => Ready to push data");
                functions.logger.debug(" => result (id) - " + result);
                functions.logger.debug(" => analytics (to create) -  ");
    
                const response = await createFunnelAnalytics(merchant_uuid, fun_uuid, String(TODAY), analytics);
    
                // data check && set
                if (response?.status < 300 && response?.data) {
                    result = [];
                }
            } catch (e) {
                text = " 🚨 [ERROR]: Likely couldnt create a funnel document";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }    
            
        } else {
            text = text + " - NOT INVOKED";
            functions.logger.info(text);
            throw new Error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                funnels: result
            }
        })
    });
}