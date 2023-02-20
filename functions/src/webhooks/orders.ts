import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { updateAnalyticsOnOrderSuccess } from "../lib/helpers/analytics/update";
import { getToday } from "../lib/helpers/date";
import { createDocument, fetchFunnelAnalytics, getDocument, updateDocument } from "../lib/helpers/firestore";
import { Customer } from "../lib/types/customers";
import { Order } from "../lib/types/draft_rders";
import { FunnelAnalytics, Analytics } from "../lib/types/analytics";
// import { sendThankYouEmail } from "../lib/helpers/twillio";
import { klavyioAPIRequests } from "../lib/helpers/requests";
// import { SubscriptionAgreement} from "../lib/types/products";
// import { Fulfillment } from "../lib/types/fulfillments";

export const orderCreated = functions.firestore
.document('merchants/{merhcantId}/orders/{orderId}')
.onCreate(async (snap) => {

    functions.logger.info(" ✅ [ORDER] - on Create (trigger_fn)");
    // Get & cast document
    const order = snap.data() as Order;


    let TODAY = await getToday();

    // test value
    const {
        current_total_price,
        customer_id,
        id,
        line_items,
        order_number,
        merchant_uuid,
        addresses,
        funnel_uuid
    } = order;

    let customer: Customer = {} as Customer;

    // get store analytics document
    const store_analytics_res = await getDocument(merchant_uuid, "analytics", String(TODAY));

    let store_analytics = null;

    if (store_analytics_res.status < 300  && store_analytics_res.data) {
        store_analytics = store_analytics_res.data
    }

    // get store analytics document
    const funnnel_analytics_res = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY));

    let funnnel_analytics = null;

    if (funnnel_analytics_res.status < 300  && funnnel_analytics_res.data) {
        funnnel_analytics = funnnel_analytics_res.data
    }

    try {
        // get customer document
        const customer_resposen = await getDocument(merchant_uuid, "customers", customer_id as string);

        if (customer_resposen.status < 300 && customer_resposen?.data) {
            customer = customer_resposen?.data as Customer;
            functions.logger.info(" ❶ [CUSTOMER] - Fetched 👍🏻");
        }

    } catch (e) {
        
    }

    try {

        if (customer) {
            const orderList = customer?.orders ? customer?.orders as string[] : [];

            let orders = [
                id as string
            ]
    
            if (orderList.length > 0) {
                orders = [
                    ...orderList,
                    id as string
                ]
            }
            await updateDocument(merchant_uuid, "customers", customer_id as string, {
                ...customer,
                orders: orders,
                draft_orders: "",
                total_orders: customer?.total_orders && customer?.total_orders > 0 ? customer?.total_orders + 1 : 1,
                total_spent: customer?.total_spent && customer?.total_spent > 0 ? customer?.total_spent + current_total_price : current_total_price,
                last_order: {
                    line_items: line_items && line_items.length > 0 ? line_items : [],
                    id: id,
                    total_price: current_total_price ? current_total_price : 0,
                    order_number: typeof(order_number) == "string" && order_number !== "" ? order_number : "",
                    payment_status: true,
                }
            } as Customer);
            functions.logger.info("❶ [CUSTOMER] - Updated 👍🏻");
        }

    } catch (e) {
        
    }

    try {

        if (customer) {
            functions.logger.info(" ❶ [FULFILLMENT] - Creating fullfillment document ");

            const first = customer?.first_name ? customer?.first_name : ""
            const last = customer?.last_name ? customer?.last_name : ""

            await createDocument(merchant_uuid, "fulfillments", "ful_", {
                created_at: admin.firestore.Timestamp.now(),
                updated_at: admin.firestore.Timestamp.now(),
                id: "ful_" + crypto?.randomBytes(10).toString("hex"),
                customer:{
                    cus_uuid: customer?.id ? customer?.id : "",
                    first_name: first,
                    last_name: last,
                    email: customer?.email ? customer?.email : "",
                    addresses: addresses && addresses.filter((addy) => {return addy.type == "SHIPPING" || addy.type == "BOTH"})
                },
                last_order: {
                    line_items: line_items && line_items.length > 0 ? line_items : [],
                    id: id,
                    total_price: current_total_price && Number(current_total_price) >= 0 ? current_total_price : 0,
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
                    name: first + " " + last,
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
        }

    } catch (e) {
        functions.logger.error(" 🚨 [ERROR] - creating fullfilment");
    }

    try {
    
        if (customer) {    
            const first = customer?.first_name ? customer?.first_name : ""
            const last = customer?.last_name ? customer?.last_name : ""

            functions.logger.info("❶ [GIFT CARD] - Creating Gift Card 💳");
            await createDocument(merchant_uuid, "gift_cards", "gif_", {
                created_at: admin.firestore.Timestamp.now(),
                updated_at: admin.firestore.Timestamp.now(),
                id: "gif_" + crypto?.randomBytes(10).toString("hex"),
                customer: {
                    cus_uuid: customer?.id,
                    first_name: first,
                    last_name: last,
                    email: customer?.email ? customer?.email : "",
                    addresses:  addresses && addresses.filter((addy) => {return addy.type == "SHIPPING" || addy.type == "BOTH"}),
                },
                notes: "",
                starting_balance: 4000,
                current_balance: 4000,
                code: "" + crypto?.randomBytes(5).toString("hex")
            });
        }
    } catch (error) {
        functions.logger.error(" 🚨 [ERROR] - Problem with creating a Gift Card D0cument");
        
    }

    try {
    
        if (customer) {    
            const first = customer?.first_name ? customer?.first_name : ""
            const last = customer?.last_name ? customer?.last_name : ""
            functions.logger.info("❶ [SUBSSCRIPTION] - Creating Subscription Document ⏪️ ");

            if (line_items && line_items.length > 0) {
                functions.logger.info("❶ [SUBSSCRIPTION] - LineItem Exists ⏪️ ");
        
                line_items?.map(async (item) => {
                    if (item?.variant_id && String(item?.variant_id).includes("sub_")) {
                        functions.logger.info("❶ [SUBSSCRIPTION] - Creating Subscription Document with Item from Order ⏪️ ");
                        await createDocument(merchant_uuid, "subscriptions", "sub_", {
                            created_at: admin.firestore.Timestamp.now(),
                            updated_at: admin.firestore.Timestamp.now(),
                            customer:{
                                cus_uuid: customer?.id ? customer?.id : "",
                                first_name: first,
                                last_name: last,
                                email: customer?.email ? customer?.email : "",
                                addresses: customer?.addresses,
                            },
                            schedule: {
                                interval: 1,
                                type: "MONTH",
                                total_value: item?.price ? item?.price : 0
                            },
                            product: {
                                product_id: item?.product_id,
                                variant_id: item?.variant_id,
                                title: item?.title,
                                options1: item?.options1 ? item?.options1 : "",
                                options2:  item?.options2 ? item?.options2 : "",
                                options3:  item?.options3 ? item?.options3 : "",
                                price:  item?.price ? item?.price : 0,
                            },
                            order_number: order_number ? order_number : "",
                            payment_method: "STRIPE" 
                        });
                    } else {
                    }
                });            
            }
        }
    } catch (error) {
        functions.logger.error(" 🚨 [ERROR] - PROBLEM w/ Creating a subscription document");
        
    }

    // 
    await updateAnalyticsOnOrderSuccess(
        store_analytics as Analytics,
        funnnel_analytics as FunnelAnalytics,
        current_total_price,
        line_items,
        String(TODAY),
        funnel_uuid, 
        merchant_uuid);

    if (customer && customer.email) {
        // await sendThankYouEmail(customer.email, line_items);

        try {

            const klav_resposnse = await klavyioAPIRequests("/profiles/", "POST", {
                data: {
                    type: "profile",
                    attributes: {
                        email: customer.email,
                        first_name: (customer.first_name ? customer.first_name : ""),
                        last_name: (customer.last_name ? customer.last_name : "")
                    }
                }
            });

            console.log(klav_resposnse);


            if (klav_resposnse.status < 300 && klav_resposnse.data && klav_resposnse.data.id) {
    
                const final = await klavyioAPIRequests("/lists/YdgzFq/relationships/profiles/", "POST", {
                    data: [
                        {
                            type: "profile",
                            id: klav_resposnse.data.id
                        }
                    ]
                });
    
                console.log(final);
           }
           
           if (klav_resposnse.status == 409 && klav_resposnse.data.errors[0].meta.duplicate_profile_id) {
    
                console.log(klav_resposnse.data.errors[0].meta.duplicate_profile_id);
                const final = await klavyioAPIRequests("/lists/YdgzFq/relationships/profiles/", "POST", {
                    data: [
                        {
                            type: "profile",
                            id: klav_resposnse.data.errors[0].meta.duplicate_profile_id
                        }
                    ]
                });
    
                console.log(final);
            }
            
        } catch (error) {
            functions.logger.error(' ❶ Coould not send email.');
            
        }

    }




});
