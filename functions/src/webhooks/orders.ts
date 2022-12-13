import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { updateAnalyticsOnOrderSuccess } from "../lib/helpers/analytics/update";
import { getToday } from "../lib/helpers/date";
import { createDocument, getDocument, getFunnelDocument, updateDocument } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { Order } from "../lib/types/draft_rders";
import { SubscriptionAgreement } from "../lib/types/products";

export const orderCreated = functions.firestore
.document('merchants/{merhcantId}/orders/{orderId}')
.onCreate(async (snap) => {

    // ? Dynamic how? 
    const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

    // Get & cast document
    const order = snap.data() as Order;

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
        line_items,
        order_number
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
            ...customerDoc,
            orders: orders,
            total_orders: customerDoc?.total_orders && customerDoc?.total_orders > 0 ? customerDoc?.total_orders + 1 : 1,
            total_spent: customerDoc?.total_spent && customerDoc?.total_spent > 0 ? customerDoc?.total_spent + current_total_price : current_total_price,
            last_order: {
                line_items: line_items && line_items.length > 0 ? line_items : [],
                id: id,
                total_price: current_total_price,
                order_number: typeof(order_number) == "string" && order_number !== "" ? order_number : "",
                payment_status: true,
            }
        } as Customer);
    }



    // TODO: check LI for sub
    // TODO: Create sub ID
    // TODO: cretea data strcutre && type
    // TODO: cretea data strcutre && type
    if (order?.line_items && order?.line_items.length > 0) {

        order?.line_items?.map(async (item) => {
            if (item?.is_recurring) {
                await createDocument(MERCHANT_UUID, "subscriptions", "sub_", {
                    created_at: admin.firestore.Timestamp.now(),
                    updated_at: admin.firestore.Timestamp.now(),
                    customer:{
                        cus_uuid: order?.customer_id,
                        first_name: order?.customer_id,
                        last_name: order?.last_name,
                        email: order?.email,
                        addresses: order?.addresses,
                    },
                    schedule: {
                        interval: 1,
                        type: "MONTH",
                    },
                    product: {
                        product_id: item?.product_id,
                        variant_id: item?.variant_id,
                        title: item?.title,
                        options1: item?.option1,
                        options2:  item?.option2,
                        options3:  item?.option3,
                        price:  item?.price,
                    },
                    order_number: order?.order_number,
                    payment_method: "STRIPE" 
                } as SubscriptionAgreement);
            } else {

                await createDocument(MERCHANT_UUID, "subscriptions", "sub_", {
                    created_at: admin.firestore.Timestamp.now(),
                    updated_at: admin.firestore.Timestamp.now(),
                    customer:{
                        cus_uuid: order?.customer_id,
                        first_name: order?.customer_id,
                        last_name: order?.last_name,
                        email: order?.email,
                        addresses: order?.addresses,
                    },
                    schedule: {
                        interval: 1,
                        type: "MONTH",
                    },
                    product: {
                        product_id: item?.product_id,
                        variant_id: item?.variant_id,
                        title: item?.title,
                        options1: item?.option1,
                        options2:  item?.option2,
                        options3:  item?.option3,
                        price:  item?.price,
                    },
                    order_number: order?.order_number,
                    payment_method: "STRIPE" 
                } as SubscriptionAgreement);
            }
        })
    }
});
