import * as express from "express";
import * as functions from "firebase-functions";
import { getDocument, simlpeSearch } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { handleStripeCharge, updateStripeCustomer } from "../lib/helpers/stripe";
import { DraftOrder } from "../lib/types/draft_rders";
import { validateKey } from "./auth";
import { updateFunnelCheckout } from "../lib/helpers/analytics/update";
// import { Address } from "../lib/types/addresses";
import { compareAddresses } from "../lib/helpers/filtering";
import { handleSquareCharge } from "../lib/helpers/square";
import { squareRequest } from "../lib/helpers/requests";
import { Address } from "../lib/types/addresses";

export const checkoutRoutes = (app: express.Router) => {

    /**
     * Checkout route
     */
     app.post("/checkout/quick/square", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.info(" =====> [FUNNEL CHECKOUT] - Started ✅")
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

            const new_addy_list = compareAddresses(addy, shipping)

            customer = { 
                ...cus,
                funnel_uuid: funnel_uuid || "",
                addresses: [
                    ...new_addy_list
                ]
            }
        }

        let result = ""

        // Calculate bump order
        const price = product.price ? Number(product.price) : 0;
        const bump_price = bump ? (399 + price) : price;

        if (high_risk) {
            functions.logger.info(" =====> [HIGH RISK]")
            // Update sqaure
            // await squareRequest(`/v2/customers/${customer_id}`, "POST", {

            // });

            // Make initial charge
            result = await handleSquareCharge(
                customer as Customer,
                price,
                product,
                shipping,
                high_risk,
                bump);

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
                high_risk,
                bump);
        }

        functions.logger.debug("[BUMP] =>");
        functions.logger.debug(bump_price);


        if (result !== "") {
            functions.logger.info(" =====> [ANALYTICS UPDATE] - Checkout");
            await updateFunnelCheckout(merchant_uuid, funnel_uuid, bump_price);
            status = 200;
            ok = true;
            text = "[SUCCESS]: Transaction ID -> " + result;
        } else {
            status = 400;
            ok = false;
            text = "[ERROR]: " + " - Likley due to charging customer.";
        }

        // return to client
        res.status(status).json({
            text: text,
            ok: ok,
            data: result
        });
    });

    /**
     * Checkout route
     */
    app.post("/checkout/quick", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.info(" =====> [FUNNEL CHECKOUT] - Started ✅")
        let status = 500,
            text = "[ERROR]: Likey internal problems 🤷🏻‍♂️. ",
            ok = false,
            customer: Customer | null = null;

        // Items from funnel checkout page
        let {
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

            const new_addy_list = compareAddresses(addy, shipping)

            customer = { 
                ...cus,
                funnel_uuid: funnel_uuid,
                addresses: [
                    ...new_addy_list
                ]
            }
        }

        let result = ""

        // Calculate bump order
        const price = product.price ? Number(product.price) : 0;
        const bump_price = bump ? (399 + price) : price;

        if (high_risk) {
            functions.logger.info(" =====> [HIGH RISK]")

            shipping = shipping as Address

            // Update sqaure
            const sqr_updated = await squareRequest(`/v2/customers/${customer?.square?.UUID}`, "POST", {
                address: {
                  address_line_1: (shipping as Address).line1 ? (shipping as Address).line1 : "420 Bigly Ln",
                  address_line_2:  (shipping as Address).line2 ? (shipping as Address).line2 : "",
                  locality: (shipping as Address).city ? (shipping as Address).city : "South Park",
                  administrative_district_level_1: (shipping as Address).state ? (shipping as Address).state : "NM",
                  postal_code: (shipping as Address).zip ? (shipping as Address).zip : "1003",
                  country: (shipping as Address).country ? (shipping as Address).country : "US"
                },
                reference_id: merchant_uuid
            });

            if (sqr_updated.status < 300 && sqr_updated.data) {
                // Charge sqaure
                handleSquareCharge(
                    customer as Customer,
                    bump_price,
                    product,
                    shipping,
                    high_risk,
                    bump
                );

                status = 200;
                ok = true;
                text = " ✅ [SUCCESS]:  " + " ";

            }
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
                high_risk,
                bump);
        }

        functions.logger.debug("[BUMP] =>");
        functions.logger.debug(bump_price);


        if (result !== "") {
            functions.logger.info(" =====> [ANALYTICS UPDATE] - Checkout");
            await updateFunnelCheckout(merchant_uuid, funnel_uuid, bump_price);
            status = 200;
            ok = true;
            text = "[SUCCESS]: Transaction ID -> " + result;
        } else {
            status = 400;
            ok = false;
            text = "[ERROR]: " + " - Likley due to charging customer.";
        }

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