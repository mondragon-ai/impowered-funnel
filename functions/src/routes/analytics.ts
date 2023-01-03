import * as express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getToday } from '../lib/helpers/date';
import { createFunnelAnalytics, fetchFunnelAnalytics, getDocument, getFunnelDocument, updateFunnelsDocument } from '../lib/helpers/firestore';
import { Analytics, DailyFunnel } from '../lib/types/analytics';
import { Funnel } from '../lib/types/funnels';
import { Product } from '../lib/types/products';
import { validateKey } from './auth';

export const analyticRoutes = (app: express.Router) => {
    app.post("/analytics/funnels", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> [FETCHING] - Funnel Analytics Start ✅');
        let text = "[ERROR]: Likely fetching funnel alaytics 😿", status= 500, ok = false, analytics: Analytics | any = null;

        // Merchant uuid from headers
        const merchant_uuid = req.body.merchant_uuid;
        const funnel_uuid = req.body.fun_uuid;
        functions.logger.debug(merchant_uuid);
        functions.logger.debug(funnel_uuid);
        

        let TODAY = await getToday();

        try {

            console.log("[GET] - Funnel Analytics Document");
            const response = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY));
            if (response.status < 300 && response.data !== null) {
                analytics = response.data;
                status = 200;
                text = "[SUCCESS]: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Fetching doc"
        }

        let funnel: Funnel = {} as Funnel;
        

        if (analytics === null) {
            try {
    
                console.log("[GET] - Funnel Document");
                const response = await getDocument(merchant_uuid, "funnnels", funnel_uuid);
    
                console.log(response);
                if (response.status < 300 && response.data !== null) {
                    funnel = response.data as Funnel;
                    status = 200;
                    text = "[SUCCESS]: Created Successfullly"
                }
                
            } catch (e) {
                text = text + " - Fetching Funnel doc"
            }
    
    
            if (funnel?.steps && funnel?.steps?.length <= 0) {
                text = " 🚨 [ERROR]: Steps necessary to create a funnel";
                status = 400;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            } else {
                functions.logger.debug(" => Steps exist");
    
                analytics = {
                    total_funnel_orders: 0,
                    total_funnel_sales: 0,
                    total_funnel_aov: 0,
                    steps: funnel?.steps ? funnel?.steps.map(step => {
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
                            }
                        )
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as any
    
    
            }
    
            // Create funnel analytics document 
            try {
    
                if (funnel_uuid === "") {
                    text = "ERROR: Likely couldnt create a funnel document. Cant create analytics without Funnel ID";
                    status = 500;
                    ok = false;
                    functions.logger.error(text);
                    throw new Error(text);
                }
                const TODAY = await getToday();
    
                functions.logger.debug(" => Ready to push data");
                functions.logger.debug(" => result (id) - " + funnel_uuid);
                functions.logger.debug(" => analytics (to create) -  ");
                functions.logger.debug(analytics);
    
                const response = await createFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), analytics);
    
                // data check && set
                if (response?.status > 300 && !response?.data) console.error(" 🚨 [ERROR]: Likley creating analytics ")
                
            } catch (e) {
                text = "ERROR: Likely couldnt create a funnel document";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }   
        }

        res.status(status).json({
            text: text,
            ok: ok, 
            data: analytics
        })
    });

    app.get("/analytics/daily", validateKey,  async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> FETCHING STORE ANALYTICS');
        let text = "ERROR: Likely product fetching prolem 🔍", status= 500, result: Product[] | any = null;

        // Merchant uuid from headers
        const merchant_uuid = req.body.merchant_uuid;

        
        const TODAY = await getToday();

        console.log(String(TODAY));
        console.log(String(merchant_uuid));

        try {

            console.log("TRY");
            const response = await getDocument(merchant_uuid, "analytics", String(TODAY));

            console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data;
                status = 200;
                text = "SUCCESS: Data Fetched Successfully 🔍" 
            }
            
        } catch (e) {
            text = text + " - Fetching doc"
        }


        res.status(status).json({
            text: text,
            data: result
        })
    })

    app.post("/analytics/page_views", async (req: express.Request, res: express.Response) => {
        let status = 500, text = "ERROR: Likley internal problem 😿 ";

        let MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

        const TODAY = await getToday();

        let result: undefined | FirebaseFirestore.DocumentData | any | DailyFunnel = null;

        console.log(String(TODAY));

        try {

            console.log("TRY");
            const response = await getFunnelDocument(MERCHANT_UUID, "analytics", String(TODAY));

            // console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data as DailyFunnel;
                status = 200;
                text = "SUCCESS: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Fetching doc.";
        }

        const pv: string[][] = req.body.page_view;

        try {

            let update = {
                ...result,
                updated_at: admin.firestore.Timestamp.now()
            }

            pv.forEach(pair => {

                const n = Number.isNaN(result?.[pair[1]]) ? 0 : result?.[pair[1]] == undefined ? 0 :  result?.[pair[1]];
                console.log(n);

                update = {
                    ...update,
                    [pair[0]]: Number(n) + 1
                }
            });

            const response = await updateFunnelsDocument(MERCHANT_UUID, "analytics", String(TODAY), update);

            // console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data;
                status = 200;
                text = "SUCCESS: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Updating funnels analytics doc"
        }


        res.status(status).json({
            text: text,
            data: result
        })

    })
}