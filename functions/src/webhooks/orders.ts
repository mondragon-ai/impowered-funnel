import * as functions from "firebase-functions";
import { updateAnalyticsOnOrderSuccess } from "../lib/helpers/analytics/update";
import { getToday } from "../lib/helpers/date";
import { getDocument, getFunnelDocument, updateDocument } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { DraftOrder } from "../lib/types/draft_rders";

export const orderCreated = functions.firestore
.document('merchants/{merhcantId}/orders/{orderId}')
.onCreate(async (snap, context) => {

    // ? Dynamic how? 
    const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

    // Get & cast document
    const order = snap.data() as DraftOrder;

    // From Order Obj
    // const _seconds = order?.updated_at?.seconds;
    // functions.logger.info(_seconds);
    // let TODAY: Date | string = new Date(_seconds*1000);  
    // TODAY = TODAY.toString().substring(0,15);


    let TODAY = await getToday();

    // test value
    const {
        current_total_price,
        customer_id,
        id,
        line_items
    } = order;

    // get store analytics document
    const store_analytics = await getDocument(MERCHANT_UUID, "analytics", String(TODAY));

    // get store analytics document
    const funnnel_analytics = await getFunnelDocument(MERCHANT_UUID, "analytics", String(TODAY));

    // get customer document
    const customer = await getDocument(MERCHANT_UUID, "customers", customer_id as string);

    functions.logger.info(customer);
    functions.logger.info(customer_id);

    // 
    await updateAnalyticsOnOrderSuccess(
        store_analytics.status,
        funnnel_analytics.status,
        store_analytics?.data,
        funnnel_analytics?.data,
        current_total_price,
        line_items,
        String(TODAY),
        true,
        MERCHANT_UUID);

    if (customer.status < 300) {
        const customerDoc = customer?.data as Customer;
        const orderList = customerDoc?.orders ? customerDoc?.orders as string[] : [];

        functions.logger.info(customerDoc);
        functions.logger.info(orderList);

        let orders = [
            id as string
        ]

        if (orderList.length > 0) {
            orders = [
                ...orderList,
                id as string
            ]
        }

        functions.logger.info(orders);

        await updateDocument(MERCHANT_UUID, "customers", customer_id as string, {
            orders: orders
        });
    }

    

    // const funnel_analytics = {
    //     orders: 
    // }

    // const result = await updateDocument(MERCHANT_UUID, "funnel_analytics", TODAY, funnel_analytics)


});
