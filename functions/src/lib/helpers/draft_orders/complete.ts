import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DraftOrder } from "../../types/draft_rders";
import { createDocument, deleteDocument, getDocument } from "../firestore";
import { createShopifyOrder } from "../shopify";

export const completeDraftOrder = async (
    dra_uuid: string,
    cus_uuid: string
) => {
    let status = 500,
        text = "ERROR: Likley internal problem 💩",
        draftOrder: DraftOrder | null = null;

    // Merchant UUID 
    const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

    // dra_uuid 
    // const dra_uuid = "dra_fa9019df4d";

    try {
        const result = await getDocument(MERCHAND_UUID, "draft_orders", dra_uuid);

        if (result.status < 300) {
            draftOrder = result.data as DraftOrder;

            // Delete Doc
            await deleteDocument(MERCHAND_UUID, "draft_orders", dra_uuid);
        }
    } catch (e) {
        functions.logger.info(text + " - Fetching & Deleting Doc");
    }

    try {
        await createDocument(MERCHAND_UUID, "orders", "ord_" + dra_uuid.substring(4), {
            ...draftOrder,
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now()
        })
    } catch (e) {
        functions.logger.info(text + " - creating order doc");
    }

    try {
        if (draftOrder?.store_type == "SHOPIFY") {
            await createShopifyOrder(draftOrder, cus_uuid);
        }

    } catch (e) {
        functions.logger.info(text + " - creating shoify order");
    }


    return {
        status: status,
        text: text,
        data: null
    };
}