import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocumentWthId, updateFunnelsDocument } from "../lib/helpers/firestore";

export const dailyCronJob = functions
  .pubsub
  .schedule("0 0 * * *")
  .onRun( async (context) => {

    // ? Dynamic ?
    const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

    let TODAY: Date | string = new Date();  
    TODAY = TODAY.toString().substring(0,15);

    const FUNNEL_UUID = Math.floor(new Date(TODAY).getTime() / 1000);

    // data to be used to create new doc
    const data = {
      total_orders: 0,
      total_aov: 0,
      total_revenue: 0,
      top_sellers: [],
      total_sessions: 0,
      total_carts: 0,
      total_checkouts: 0,
      updated_at: admin.firestore.Timestamp.now(),
      created_at: admin.firestore.Timestamp.now()
    }

    // creat new analytics doc
    await createDocumentWthId(MERCHANT_UUID, "analytics", String(FUNNEL_UUID), data);

    let has_funnel = true;

    if (has_funnel) {
      // creat new funnnel_analytics doc
      await updateFunnelsDocument(MERCHANT_UUID, "analytics", String(FUNNEL_UUID), {
        order_page_views: 0,
        order_unique_page_views: 0,
        order_opt_ins: 0,
        order_opt_in_rate: 0,
        order_sales_count: 0,
        order_sales_rate: 0,
        order_sales_value: 0,
        order_recurring_count: 0,
        order_recurring_value: 0,
        order_earnings: 0,
        order_earnings_unique: 0,
        upsell_page_views: 0,
        upsell_unique_page_views: 0,
        upsell_opt_ins: 0,
        upsell_opt_in_rate: 0,
        upsell_sales_count: 0,
        upsell_sales_rate: 0,
        upsell_sales_value: 0,
        upsell_recurring_count: 0,
        upsell_recurring_value: 0,
        upsell_earnings: 0,
        upsell_earnings_unique: 0,
        total_funnel_orders: 0,
        total_funnel_sales: 0,
        total_funnel_aov: 0,
        confirm_page_view: 0,
        confirm_unique_page_view: 0,
        updated_at: admin.firestore.Timestamp.now(),
        created_at: admin.firestore.Timestamp.now()
      });
    }

    functions.logger.info('Created new analytics ', TODAY);
    return null;
  });