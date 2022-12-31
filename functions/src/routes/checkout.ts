import * as express from "express";
import * as functions from "firebase-functions";
import { getDocument, simlpeSearch } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { handleStripeCharge, updateStripeCustomer } from "../lib/helpers/stripe";
import { DraftOrder } from "../lib/types/draft_rders";
import { validateKey } from "./auth";
// import { updateFunnelCheckout } from "../lib/helpers/analytics/update";
import { Address } from "../lib/types/addresses";

export const checkoutRoutes = (app: express.Router) => {

    /**
     * Checkout route
     */
     app.post("/checkout/quick", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.info(" =====> [FUNNEL CHECKOUT]")
        let status = 500,
            text = "[ERROR]: Likey internal problems 🤷🏻‍♂️. ",
            ok = false,
            customer: Customer | null = null;

        // Items from funnel checkout page
        const {
            cus_uuid, 
            product,
            bump,
            merchant_uuid,
            funnel_uuid,
            high_risk,
            shipping
        } = req.body

        try {

            functions.logger.info(" =====> [GET DOC] - Customer")
            // fetch usr from DB to get stripe UUID
            const result = await getDocument(merchant_uuid, "customers", cus_uuid);

            if (result.status < 300) {
                customer =  result.data != undefined ? (result.data) as Customer  : null;
                status = 200;
                ok = true;
                text = "[SUCCESS]: " + result.text;
            } 
            
        } catch (e) {
            functions.logger.error(text + " - Fetching DB User")
        }

        if (customer !== null) {
            const cus = (customer as Customer);
            const addy = cus?.addresses ? cus?.addresses : []

            customer = { 
                ...cus,
                funnel_uuid: funnel_uuid,
                addresses: [
                    ...(addy as Address[]),
                    {...(shipping as Address)}
                ]
            }
        }

        let result = ""

        // Calculate bump order
        const price = bump ? (399 + product.price) : product.price;

        if (high_risk) {
            functions.logger.info(" =====> [HIGH RISK]")
            // TODO: Update sqaure

            // TODO: Charge sqaure
        } else {
            functions.logger.info(" =====> ![HIGH RISK]")
            // stripe customer 
            await updateStripeCustomer(
                customer?.first_name as string, 
                String(customer?.stripe?.UUID),
                shipping);

            // Make initial charge
            result = await handleStripeCharge(
                customer as Customer,
                price,
                product,
                shipping,
                high_risk);
        }

        functions.logger.info(" =====> [ANALYTICS UPDATE]");
        // TODO: UPDATE CHCKOUT ANALYTICS
        // ? Turn into a listner?
        // await updateFunnelCheckout(merchant_uuid, funnel_uuid, price);

        // return to client
        res.status(status).json({
            text: text,
            ok: ok,
            data: result
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