import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { updateAnalyticsOnOrderSuccess } from "../lib/helpers/analytics/update";
import { getToday } from "../lib/helpers/date";
import { createDocument, getDocument, getFunnelDocument, updateDocument } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { Order } from "../lib/types/draft_rders";
// import { SubscriptionAgreement} from "../lib/types/products";
// import { Fulfillment } from "../lib/types/fulfillments";

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
        
        await createDocument(MERCHANT_UUID, "fulfillments", "ful_", {
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            id: "ful_" + crypto?.randomBytes(10).toString("hex"),
            customer:{
                cus_uuid: customerDoc?.id,
                first_name: customerDoc?.first_name,
                last_name: customerDoc?.last_name,
                email: customerDoc?.email,
                addresses: customerDoc?.addresses,
            },
            last_order: {
                line_items: line_items && line_items.length > 0 ? line_items : [],
                id: id,
                total_price: current_total_price,
                order_number: typeof(order_number) == "string" && order_number !== "" ? order_number : "",
                payment_status: true,
            },
            return_address: {
                type: "BOTH",
                line1: "3049 North College Avenue",
                line2: "",
                city: "Fayetville",
                state: "AR",
                zip: "72704",
                country: "US",
                name: customerDoc?.first_name + " " + (customerDoc?.last_name ? customerDoc?.last_name : ""),
                title: "",
            },
            shipping_line: {
                provider: "USPS",
                rate: "STANDARD",
                packaging_type: "PACKAGE",
                weight: 0.3,
                insurance: false,
                price: 599
            },
            tracking_id: "", 
            label_url: "", 
            status: false
        });

        try {
            await createDocument(MERCHANT_UUID, "gift_cards", "gif_", {
                created_at: admin.firestore.Timestamp.now(),
                updated_at: admin.firestore.Timestamp.now(),
                id: "gif_" + crypto?.randomBytes(10).toString("hex"),
                customer: {
                    cus_uuid: customerDoc?.id,
                    first_name: customerDoc?.first_name,
                    last_name: customerDoc?.last_name,
                    email: customerDoc?.email,
                    addresses: customerDoc?.addresses,
                },
                notes: "",
                starting_balance: 4000,
                current_balance: 4000,
                code: "" + crypto?.randomBytes(5).toString("hex")
            });
        } catch (error) {
            throw new Error("PROBLEM W? GC");
            
        }


        try {

            if (line_items && line_items.length > 0) {
        
                line_items?.map(async (item) => {
                    if (item?.variant_id && String(item?.variant_id).includes("sub_")) {
                        await createDocument(MERCHANT_UUID, "subscriptions", "sub_", {
                            created_at: admin.firestore.Timestamp.now(),
                            updated_at: admin.firestore.Timestamp.now(),
                            customer:{
                                cus_uuid: customerDoc?.id,
                                first_name: customerDoc?.first_name,
                                last_name: customerDoc?.last_name,
                                email: customerDoc?.email,
                                addresses: customerDoc?.addresses,
                            },
                            schedule: {
                                interval: 1,
                                type: "MONTH",
                                total_value: item?.price
                            },
                            product: {
                                product_id: item?.product_id,
                                variant_id: item?.variant_id,
                                title: item?.title,
                                options1: item?.options1,
                                options2:  item?.options2,
                                options3:  item?.options3,
                                price:  item?.price,
                            },
                            order_number: order_number,
                            payment_method: "STRIPE" 
                        });
                    } else {
                    }
                });            
            }
        } catch (error) {
            throw new Error("PROBLEM with SUB");
            
        }
        
    }



    // TODO: check LI for sub
    // TODO: Create sub ID
    // TODO: cretea data strcutre && type
    // TODO: cretea data strcutre && type


    
});
