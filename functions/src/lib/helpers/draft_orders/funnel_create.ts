import { Address } from "../../types/addresses";
import { DraftOrder, LineItem } from "../../types/draft_rders";
import * as crypto from "crypto"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { createDocument, getDocument, updateDocument } from "../firestore";
import { sendOrder } from "./timeCompletion";
import { createShopifyCustomer, createShineOnOrder } from "../shopify";
import { Customer } from "../../types/customers";

export const handleSuccessPayment = async (
    customer: Customer,
    product: LineItem,
    STRIPE_PI: string,
    STRIPE_PM: string,
    shipping: Address | null,
    high_risk: boolean,
    bump?: boolean,
    external?: "SHOPIFY" | "BIG_COMMERCE" | "SHINEON" | ""
) => {
    let status = 500, text = " 🚨 [ERROR]: Likey internal problems 🤷🏻‍♂️. - handle success";

    // TODO: Refactor to be used as LineItem[] instead of Product
    const {
        email,
        id,
        funnel_uuid,
        merchant_uuid
    } = customer
    
    let draft_orders_uuid = "";
    let shopif_uuid = "";
    let order_uuid = "";

    // Calculate price
    const price = product.price  && Number(product.price) > 0 ? Number(product.price) : 100;
    
    setTimeout(async () => {
        if (STRIPE_PI !== "" && id !== "") {
            functions.logger.info(" ❸ [SHOPIFY] - Payment Intent was Successfull && Customer Exists");

            if (external === "SHOPIFY") {
                const shopify = await createShopifyCustomer(shipping as Address, email);
    
                if (shopify != undefined) {
                    const result = JSON.parse(JSON.stringify(shopify));
    
                    if (result.customers[0] && result.customers[0].id != "") {
                        functions.logger.info(" ❹ [SHOPIFY] - External UUID Created");
                        shopif_uuid = result.customers[0].id;
                    }
                }
            }
    
            try {
                let draft_data = {
                    payment_status: "PAID",
                    merchant_uuid: merchant_uuid,
                    funnel_uuid: funnel_uuid && funnel_uuid !== "" ? funnel_uuid : "",
                    high_risk: high_risk,
                    line_items: [
                        {
                            ...product,
                            price: Number(price)
                        }
                    ],
                    addresses: [
                        shipping as Address
                    ],
                    tags: ["CLICK_FUNNEL"],
                    order_number: "SH-" + crypto.randomBytes(5).toString("hex").toUpperCase(),
                    first_name: shipping?.name as string,
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                    transaction_id: STRIPE_PI,
                    fullfillment_status: "HOLD",
                    email: email ? email : "",
                    customer_id: id ? id : "",
                    type: funnel_uuid && funnel_uuid !== "" ? "FUNNEL" : "STORE",
                    current_total_price: bump ? Number(price) + 399 : Number(price),
                    store_type: shopif_uuid && shopif_uuid !== "" ? "SHOPIFY" : "IMPOWERED",
                    gateway: funnel_uuid && funnel_uuid !== "" ? "SQUARE" : "STRIPE",
                } as DraftOrder; 

                if (bump) {
                    draft_data = {
                        ...draft_data,
                        line_items: [
                            ...draft_data.line_items,
                            {
                                title: "Rush & Ensure",
                                price: 399,
                                compare_at_price: 0,
                                quantity: 1,
                                options1: "",
                                options2: "",
                                options3: "",
                                variant_id: "",
                                product_id: "",
                                high_risk: false,
                                sku: "",
                                handle: "",
                                weight: 0,
                                url: ""
                            }
                        ],
                    }
                }

                functions.logger.info(" ❹ [SHINEON] ", external);

                if (external === "SHINEON") {
                    // TODO: CONVER TO PRODUCT.URL

                    functions.logger.info(" ❹ [SHINEON] - Order Created Ready to start");
                    const shineon = await createShineOnOrder(draft_data, merchant_uuid, customer, "https://firebasestorage.googleapis.com/v0/b/impowered-funnel.appspot.com/o/%2Fimages%2Ftest%2F1674953183241.png?alt=media&token=bda7d1de-9dd3-4933-b79b-3fbc19a18b28");
        
                    if (shineon != undefined) {
                        const result = JSON.parse(JSON.stringify(shineon));
        
                        functions.logger.info(" ❹ [SHINEON] - Order Created", {result});
                        // if (result.customers[0] && result.customers[0].id != "") {
                        //     functions.logger.info(" ❹ [SHINEON] - Order Created");
                        // }
                    }
                }
    
                if (funnel_uuid && funnel_uuid !== "") {
                    functions.logger.info(" ❸ [DRAFT_ORDER] - Funnel UUID Exists. Creating Draft Order 📦");
                    functions.logger.info(" ❸ [funnel_uuid] - > " + funnel_uuid);
                    functions.logger.info(" ❸ [draft_orders] - > " + customer.draft_orders);
                    functions.logger.info(" ❸ [draft_orders_uuid] - > " + draft_orders_uuid);

                    if (customer.draft_orders === "") {
                        functions.logger.info(" ❸ [DRAFT_ORDER] - Create Draft Order 📦");

                        // Create Draft Order
                        const draftOrder = await createDocument(merchant_uuid, "draft_orders", "dra_", draft_data);
                        if (draftOrder.status < 300) {
                            functions.logger.info(" ❹ [DRAFT_ORDER] - Draft Order Created 📦");
                            draft_orders_uuid = draftOrder?.data?.id
                        }

                    } else {
                        functions.logger.info(" ❸ [DRAFT_ORDER] - Fetch Draft Order 📦");
                        const repsonse = await getDocument(merchant_uuid, "draft_orders",  customer.draft_orders ? customer.draft_orders : draft_orders_uuid);

                        if (repsonse.status < 300 && repsonse.data) {
                            functions.logger.info(" ❸ [DRAFT_ORDER] - Draft Order Fetched 📦");
                            const draft_order_response = repsonse.data as DraftOrder;
                            const LI = draft_order_response.line_items ? draft_order_response.line_items : [];

                            draft_data = {
                                ...draft_data,
                                line_items: [
                                    ...draft_data.line_items,
                                    ...LI
                                ],
                                updated_at: admin.firestore.Timestamp.now()
                            }
                            functions.logger.info(" ❸ [DRAFT_ORDER] - Update Draft Order 📦");
                            functions.logger.info(draft_data);
                            functions.logger.info( customer.draft_orders !== "" ? customer.draft_orders : draft_orders_uuid );

                            // Create Draft Order
                            const draftOrder = await updateDocument(merchant_uuid, "draft_orders", ( customer.draft_orders !== "" ? customer.draft_orders : draft_orders_uuid ) , draft_data);
                
                            if (draftOrder.status < 300) { 
                                functions.logger.info(" ❸ [DRAFT_ORDER] - Draft Order Updated 📦");
                                draft_orders_uuid = draft_orders_uuid && customer.draft_orders !== "" ? customer.draft_orders : draft_orders_uuid;
                            }
                        }
                    }

                } else {
                    functions.logger.info(" ❸ [ORDER] -  Order Created Ready📦");
                    // Create Order
                    const order_res = await createDocument(merchant_uuid, "orders", "ord_", draft_data);
                    if (order_res.status < 300 && order_res.data) {
                        functions.logger.info(" ❸ [ORDER] -  Order Created 📦");
                        order_uuid = order_res.data.id
                    }
                }
                    
            } catch (e) {
                functions.logger.error(text + " - Creating Cart document in primary DB");
            }

            try {
                if (funnel_uuid && funnel_uuid !== "" && draft_orders_uuid !== "") {
                    functions.logger.info(" ❸  [DRAFT_ORDER] - Set Timer");
                    sendOrder(merchant_uuid, draft_orders_uuid, id)
                };
                functions.logger.info(" ❸  [CUSTOMER] - Update Customer 📦");
                // Data to push to the primary DB
                let update_data = {
                    ...customer,
                    funnel_uuid: "",
                    updated_at: admin.firestore.Timestamp.now(),
                    draft_orders: draft_orders_uuid ? draft_orders_uuid : 0,
                    shopify_uuid: shopif_uuid,
                };

                if (high_risk) {
                    update_data = {
                        ...customer,
                        ...update_data,
                        square: {
                            ...customer?.square,
                            PM: STRIPE_PM,
                        },
                    };
                } else {
                    update_data = {
                        ...customer,
                        ...update_data,
                        funnel_uuid: "",
                        stripe: {
                            ...customer?.stripe,
                            PM: STRIPE_PM as string,
                            CLIENT_ID: ""
                        },
                    };
                }

                if (draft_orders_uuid !== "" || order_uuid !== "") {
                    // update customer document from main DB
                    const result = await updateDocument(merchant_uuid, "customers", id, update_data);
        
                    if (result.status < 300) {
                        status = 200;
                        text = " 🎉 [SUCCESS]: " + result.text
                    } 
                }
            
            } catch (e) {
                functions.logger.info(text)
            }
    
        } else {
            text = text + " PAYMENT METHOD NOT FOUND";
        }
    }, 1000);

    return {
        status: status,
        text: text,
        data: draft_orders_uuid !== "" ? draft_orders_uuid : order_uuid !== "" ? order_uuid : "[ERROR]"
    }
}