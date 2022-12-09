import { Address } from "../../types/addresses";
import { DraftOrder, LineItem } from "../../types/draft_rders";
import * as crypto from "crypto"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { createDocument, updateDocument } from "../firestore";
import { sendOrder } from "./timeCompletion";
import { createShopifyCustomer } from "../shopify";

export const createFunnelDraftOrder = async (
    MERCHAND_UUID: string,
    STRIPE_PI: string,
    STRIPE_PM: string,
    product: LineItem,
    shipping: Address | null,
    cus_uuid: string,
    email: string
) => {
    let status = 500,
        text = "ERROR: Likey internal problems 🤷🏻‍♂️. ";
    
    let draft_orders_uuid = "";

    setTimeout( async () => {
        if (STRIPE_PI != "") {
            try {
    
                let draft_data = {
                    high_risk: true,
                    line_items: [
                        product
                    ],
                    addresses: [
                        shipping as Address
                    ],
                    tags: ["CLICK_FUNNEL"],
                    order_name: "SH-" + crypto.randomBytes(10).toString("hex"),
                    first_name: shipping?.name as string,
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                    transaction_id: STRIPE_PI,
                    fullfillment_status: "HOLD",
                    email: email,
                    customer_id: cus_uuid,
                    type: "FUNNEL",
                    current_total_price: product.price,
                    store_type: "SHOPIFY"
                } as DraftOrder;
    
                // Create Draft Order
                const draftOrder = await createDocument(MERCHAND_UUID, "draft_orders", "dra_", draft_data);
    
                if (draftOrder.status < 300) { 
                    draft_orders_uuid = draftOrder?.data?.id
                }
    
            } catch (e) {
                functions.logger.info(text + " - Creating Cart document in primary DB")
            }

            const shopify = await createShopifyCustomer(shipping as Address, email);
            let shopif_uuid = ""

            if (shopify != undefined) {
                const result = JSON.parse(JSON.stringify(shopify));

                if (result.customers[0] && result.customers[0].id != "") {
                    shopif_uuid = result.customers[0].id;
                }

            }
    
    
            try {
                // Data to push to the primary DB
                let update_data = {
                    addresses: [
                        shipping
                    ],
                    updated_at: admin.firestore.Timestamp.now(),
                    id: cus_uuid,
                    draft_orders: [
                        draft_orders_uuid
                    ],
                    stripe: {
                        PM: STRIPE_PM
                    },
                    shopify_uuid: shopif_uuid
                }
    
                // update customer document from main DB
                const result = await updateDocument(MERCHAND_UUID, "customers", cus_uuid, update_data);
    
                if (result.status < 300) {
                    status = 200;
                    text = "SUCCESS: " + result.text
                    sendOrder(draft_orders_uuid, cus_uuid);
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