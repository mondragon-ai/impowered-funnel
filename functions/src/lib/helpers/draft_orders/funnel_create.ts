import { Address } from "../../types/addresses";
import { DraftOrder, LineItem } from "../../types/draft_rders";
import * as crypto from "crypto"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { createDocument, updateDocument } from "../firestore";
import { sendOrder } from "./timeCompletion";
import { createShopifyCustomer } from "../shopify";
import { Customer } from "../../types/customers";

export const handleSuccessPayment = async (
    customer: Customer,
    product: LineItem,
    STRIPE_PI: string,
    STRIPE_PM: string,
    shipping: Address | null,
    high_risk: boolean
) => {
    let status = 500, text = "ERROR: Likey internal problems 🤷🏻‍♂️. ";

    const {
        email,
        id,
        funnel_uuid,
        merchant_uuid
    } = customer
    
    let draft_orders_uuid = "";
    
    setTimeout( async () => {
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
                    current_total_price: product.price,
                    store_type: shopif_uuid && shopif_uuid !== "" ? "SHOPIFY" : "IMPOWERED",
                    gateway: funnel_uuid && funnel_uuid !== "" ? "SQUARE" : "STRIPE",
                } as DraftOrder; 
    
                if (funnel_uuid && funnel_uuid !== "") {
                    console.log(" ==> [FUNNEL UUID] - Create Draft Order 📦");

                    // Create Draft Order
                    const draftOrder = await createDocument(merchant_uuid, "draft_orders", "dra_", draft_data);
        
                    if (draftOrder.status < 300) { 
                        draft_orders_uuid = draftOrder?.data?.id
                    }

                } else {
                    console.log(" ==> ![FUNNEL UUID] - Create Order 📦");

                    // Create Order
                    await createDocument(merchant_uuid, "orders", "ord_", draft_data);

                    // TODO: Logic layer to check if Merchant has a "access" for merchant
        
                    // if (order.status < 300) { 
                    //     order_uuid = order?.data?.id
                    // }
                }
                    
    
            } catch (e) {
                functions.logger.info(text + " - Creating Cart document in primary DB")
            }

            const total_spent = (customer?.total_spent ? Number(customer?.total_spent) : 0);
            const total_orders = (customer?.total_orders ? Number(customer?.total_orders) : 0);

            try {
                
                functions.logger.info(" ==> [CUSTOMER] - Update");
                // Data to push to the primary DB
                let update_data = {
                    ...customer,
                    updated_at: admin.firestore.Timestamp.now(),
                    draft_orders: draft_orders_uuid,
                    shopify_uuid: shopif_uuid,
                    stripe: {
                        ...customer?.stripe,
                        PM: STRIPE_PM,
                        CLIENT_ID: ""
                    },
                    total_spent: total_spent + product.price,
                    total_orders: total_orders + 1,
                    total_aov: (total_spent + product.price) / (total_orders + 1)
                }
                console.log(update_data);

                // update customer document from main DB
                const result = await updateDocument(merchant_uuid, "customers", id, update_data);
                console.log(result);
    
                if (result.status < 300) {
                    status = 200;
                    text = "[SUCCESS]: " + result.text
                    console.log(" ===> [FUNNEL UUID] - Start Timer ");
                    if (funnel_uuid && funnel_uuid !== "") sendOrder(merchant_uuid, draft_orders_uuid, id);
                } 
            
            } catch (e) {
                functions.logger.info(text)
            }
    
        } else {
            text = text + " PAYMENT METHOD NOT FOUND";
        }
    }, 2000);

    return {
        status: status,
        text: text,
        data: draft_orders_uuid
    }
}