import { Address } from "../../types/addresses";
import { DraftOrder, LineItem } from "../../types/draft_rders";
import * as crypto from "crypto"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { createDocument, getDocument, updateDocument } from "../firestore";
import { sendOrder } from "./timeCompletion";
import { createShopifyCustomer } from "../shopify";
import { Customer } from "../../types/customers";

export const handleSuccessPayment = async (
    customer: Customer,
    product: LineItem,
    STRIPE_PI: string,
    STRIPE_PM: string,
    shipping: Address | null,
    high_risk: boolean,
    bump?: boolean
) => {
    let status = 500, text = "ERROR: Likey internal problems 🤷🏻‍♂️. ";

    // TODO: Refactor to be used as LineItem[] instead of Product
    const {
        email,
        id,
        funnel_uuid,
        merchant_uuid
    } = customer
    
    let draft_orders_uuid = "";
    
    setTimeout(async () => {
        if (STRIPE_PI !== "") {
            functions.logger.info(" ==> [STRIPE_PI] - Exists");

            const shopify = await createShopifyCustomer(shipping as Address, email);
            let shopif_uuid = ""

            if (shopify != undefined) {
                const result = JSON.parse(JSON.stringify(shopify));

                if (result.customers[0] && result.customers[0].id != "") {
                    shopif_uuid = result.customers[0].id;
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
                            price: Number(product.price)
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
                    email: email,
                    customer_id: id,
                    type: funnel_uuid && funnel_uuid !== "" ? "FUNNEL" : "STORE",
                    current_total_price: bump ? Number(product.price) + 399 : Number(product.price),
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
                                weight: 0
                            }
                        ],
                    }
                }
    
                if (funnel_uuid && funnel_uuid !== "") {
                    console.log(" ==> [FUNNEL UUID] - Create Draft Order 📦");

                    if (customer.draft_orders === "") {

                        // Create Draft Order
                        const draftOrder = await createDocument(merchant_uuid, "draft_orders", "dra_", draft_data);
            
                        if (draftOrder.status < 300) { 
                            draft_orders_uuid = draftOrder?.data?.id
                        }

                    } else {

                        const repsonse = await getDocument(merchant_uuid, "draft_orders",  customer.draft_orders);

                        if (repsonse.status < 300 && repsonse.data) {
                            const customer = repsonse.data as Customer;
                            const LI = customer.line_items ? customer.line_items : [];

                            draft_data = {
                                ...draft_data,
                                line_items: [
                                    ...draft_data.line_items,
                                    ...LI
                                ],
                                updated_at: admin.firestore.Timestamp.now()
                            }

                            // Create Draft Order
                            const draftOrder = await updateDocument(merchant_uuid, "draft_orders", customer.draft_orders , draft_data);
                
                            if (draftOrder.status < 300) { 
                                draft_orders_uuid = customer.draft_orders;
                            }
                        }
                    }

                } else {
                    console.log(" ==> ![FUNNEL UUID] - Create Order 📦");

                    // Create Order
                    await createDocument(merchant_uuid, "orders", "ord_", draft_data);

                }
                    
    
            } catch (e) {
                functions.logger.info(text + " - Creating Cart document in primary DB")
            }

            try {
                functions.logger.info(" ==> [CUSTOMER] - Update");
                // Data to push to the primary DB
                let update_data = {
                    ...customer,
                    funnel_uuid: "",
                    updated_at: admin.firestore.Timestamp.now(),
                    draft_orders: draft_orders_uuid,
                    shopify_uuid: shopif_uuid,
                };

                if (high_risk) {
                    update_data = {
                        ...customer,
                        funnel_uuid: "",
                        updated_at: admin.firestore.Timestamp.now(),
                        draft_orders: draft_orders_uuid,
                        shopify_uuid: shopif_uuid,
                        square: {
                            ...customer?.square,
                            UUID: "",
                            PM: STRIPE_PM,
                        },
                    };
                } else {
                    update_data = {
                        ...customer,
                        funnel_uuid: "",
                        updated_at: admin.firestore.Timestamp.now(),
                        draft_orders: draft_orders_uuid,
                        shopify_uuid: shopif_uuid,
                        stripe: {
                            ...customer?.stripe,
                            PM: STRIPE_PM as string,
                            CLIENT_ID: ""
                        },
                    };
                }
                console.log(update_data);

                if (draft_orders_uuid !== "") {
                    // update customer document from main DB
                    const result = await updateDocument(merchant_uuid, "customers", id, update_data);
                    console.log(result);
        
                    if (result.status < 300) {
                        status = 200;
                        text = "[SUCCESS]: " + result.text
                        console.log(" ===> [FUNNEL UUID] - Start Timer ");
                        if (funnel_uuid && funnel_uuid !== "") sendOrder(merchant_uuid, draft_orders_uuid, id);
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
        data: draft_orders_uuid
    }
}