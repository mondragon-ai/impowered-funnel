import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getDocument, getFunnelDocument, simlpeSearch, updateFunnelsDocument } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { handleStripeCharge, updateStripeCustomer } from "../lib/helpers/stripe";
import { Analytics } from "../lib/types/analytics";
import { getToday } from "../lib/helpers/date";
import { DraftOrder } from "../lib/types/draft_rders";

export const checkoutRoutes = (app: express.Router) => {

    /**
     * STEP #3 - Make initial purchase -> starting order
     */
     app.post("/checkout/quick", async (req: express.Request, res: express.Response) => {
        let status = 500,
            text = "ERROR: Likey internal problems 🤷🏻‍♂️. ",
            data: Customer | null = null;

        // Merchant ID
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        // customer uuid &  shipping, product, bump info 
        const {cus_uuid, shipping, product, bump} = req.body

        console.log(cus_uuid);

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

        // square customer 
        // await updateSquareCustomer(
        //     data?.first_name as string, 
        //     data?.email as string, 
        //     String(data?.stripe?.UUID),
        //     shipping);

        // stripe customer 
        await updateStripeCustomer(
            data?.first_name as string, 
            data?.email as string, 
            String(data?.stripe?.UUID),
            shipping);

        // Calculate bump order
        const price = bump ? (399 + product.price) : product.price;

        // Make initial charge
        handleStripeCharge(
            MERCHAND_UUID,
            String(data?.stripe?.UUID),
            price,
            String(data?.email),
            text,
            product,
            shipping,
            cus_uuid);

        try {
        
            let TODAY = await getToday();

            const result = await getFunnelDocument(MERCHAND_UUID, "analytics", String(TODAY))

            const analytics: Analytics = result.data as Analytics;

            const uopv = analytics.order_page_views ? analytics.order_page_views : 1;

            const update = {
                ...analytics,
                order_sales_count: (analytics.order_sales_count + 1),
                order_sales_rate: ((analytics.order_sales_count + 1) / (uopv)),
                order_sales_value: (analytics.order_sales_value + Number(product.price)),
                updated_at: admin.firestore.Timestamp.now()
            }

            await updateFunnelsDocument(MERCHAND_UUID, "analytics", String(TODAY), update);

        } catch (e) {
            functions.logger.info("66: " + text + " - Updating analytics ");
        }
    

        // return to client
        res.status(status).json({
            text: text,
            data: {
                draft_order_uuid: "draftOrder.data,"
            }
        });
     });

    app.post("/checkout/success", async (req: express.Request, res: express.Response) => {
        let status = 500,
            text = "ERROR: Likey internal problems 🤷🏻‍♂️. ",
            data: Customer | null = null;

        // Merchant ID
        const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

        // customer uuid &  shipping, product, bump info
        const cus_uuid = req.body.cus_uuid as string;

        let order: DraftOrder = {} as DraftOrder;

        try {

            const orderList = await simlpeSearch(MERCHAND_UUID, "orders", "customer_id", cus_uuid);

            if (orderList.data.list) {
                orderList.data.list?.forEach(o => {
                    order = o.data() as DraftOrder;
                })
            }
            console.log(order)
        } catch (e) {
            text = text + " - Fetching order"
        }

        res.status(status).json({
            text: text,
            data: data
        })
    })
}