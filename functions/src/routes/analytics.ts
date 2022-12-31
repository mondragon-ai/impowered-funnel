import * as express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getToday } from '../lib/helpers/date';
import { getDocument, getFunnelDocument, updateFunnelsDocument } from '../lib/helpers/firestore';
import { Analytics, DailyFunnel } from '../lib/types/analytics';
import { Product } from '../lib/types/products';
import { validateKey } from './auth';

export const analyticRoutes = (app: express.Router) => {
    app.get("/analytics/funnels", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> FETCHING FUNEL ANALYTICS');
        let text = "ERROR: Likely fetching funnel alaytics 😿", status= 500, result: Analytics | any = null;

        // Merchant uuid from headers
        const merchant_uuid = req.body.merchant_uuid;

        let TODAY = await getToday();

        console.log(String(TODAY));

        try {

            console.log("TRY");
            const response = await getFunnelDocument(merchant_uuid, "analytics", String(TODAY));

            console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data;
                status = 200;
                text = "SUCCESS: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Fetching doc"
        }


        res.status(status).json({
            text: text,
            data: result
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