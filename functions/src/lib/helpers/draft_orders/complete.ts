import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DraftOrder } from "../../types/draft_rders";
import { createDocumentWthId, deleteDocument, getDocument } from "../firestore";
import { createShopifyOrder } from "../shopify";

export const completeDraftOrder = async (
    merchant_uuid: string,
    dra_uuid: string,
    cus_uuid: string
) => {
    let status = 500,
        text = "ERROR: Likley internal problem 💩",
        draftOrder: DraftOrder | null = null;

    // dra_uuid 
    // const dra_uuid = "dra_fa9019df4d";

    try {
        const result = await getDocument(merchant_uuid, "draft_orders", dra_uuid);
        functions.logger.info(" ❷ [DRAFT ORDER] - Fetched Doc");

        if (result.status < 300) {
            draftOrder = result.data as DraftOrder;

            // Delete Doc
            await deleteDocument(merchant_uuid, "draft_orders", dra_uuid);
            functions.logger.info(" ❷ [DRAFT ORDER] - Deleted Doc");
        }
    } catch (e) {
        functions.logger.error(text + " - Fetching & Deleting Doc");
    }

    let shipping_lines = [
        {
          custom  : true,
          price : "5.99",
          title : "Standard Shipping"
        }
      ];
  
      if (draftOrder?.current_total_price && draftOrder?.current_total_price > 10000) {
        shipping_lines = [
          {
            custom  : true,
            price : "0.00",
            title : "Free Shipping"
          }
        ];
      }
  
  

    try {
        await createDocumentWthId(merchant_uuid, "orders", "ord_" + dra_uuid.substring(4), {
            ...draftOrder,
            shipping_lines: shipping_lines,
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now()
        })
        functions.logger.info(" ❷ [ORDER] - Created Doc");
    } catch (e) {
        functions.logger.info(text + " - creating order doc");
    }

    try {
        if (draftOrder?.store_type == "SHOPIFY") {
            await createShopifyOrder(draftOrder, cus_uuid);
            functions.logger.info(" ❷ [SHOPIFY] - Created Order");
        }

    } catch (e) {
        functions.logger.error(text + " ❷ creating shoify order");
    }


    return {
        status: status,
        text: text,
        data: null
    };
}