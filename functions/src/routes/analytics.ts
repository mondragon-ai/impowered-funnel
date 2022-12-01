import * as express from 'express';
import * as admin from 'firebase-admin';
import { getToday } from '../lib/helpers/date';
import { getFunnelDocument, updateFunnelsDocument } from '../lib/helpers/firestore';
import { DailyFunnel } from '../lib/types/analytics';

export const analyticRoutes = (app: express.Router) => {
    app.get("/analytics/funnels", async (req: express.Request, res: express.Response) => {
        let status = 500, text = "ERROR: Likley internal problem 😿 ";

        let MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

        let TODAY: Date | string = new Date();  
        TODAY = TODAY.toString().substring(0,15);

        const FUNNEL_UUID = Math.floor(new Date(TODAY).getTime() / 1000);

        let result: undefined | FirebaseFirestore.DocumentData | null = null;

        console.log(String(FUNNEL_UUID));

        try {

            console.log("TRY");
            const response = await getFunnelDocument(MERCHANT_UUID, "analytics", String(FUNNEL_UUID));

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

            console.log(response);
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

                const n = result?.[pair[1]] == NaN ? 0 : result?.[pair[1]] == undefined ? 0 :  result?.[pair[1]];
                console.log(n);

                update = {
                    ...update,
                    [pair[0]]: Number(n) + 1
                }
            });

            const response = await updateFunnelsDocument(MERCHANT_UUID, "analytics", String(TODAY), update);

            console.log(response);
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