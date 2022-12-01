import { Daily, DailyFunnel, TopSellers } from "../../types/analytics";
import { LineItem } from "../../types/draft_rders";

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { updateDocument, updateFunnelsDocument } from "../firestore";

export const updateAnalyticsOnOrderSuccess = async (
    store_status: number,
    funnel_status: number,
    store_data: FirebaseFirestore.DocumentData | undefined,
    funnel_data: FirebaseFirestore.DocumentData | undefined,
    current_total_price: number,
    line_items: LineItem[],
    TODAY: string,
    is_funnel: boolean,
    MERCHANT_UUID: string,
) => {

    functions.logger.info("LINE ITEMS");
    functions.logger.info(line_items);


    functions.logger.info("IDS");
    functions.logger.info(MERCHANT_UUID);
    functions.logger.info(TODAY);

    if (store_status < 300 && store_data != undefined) {
        functions.logger.info("STORE UPDATE!");
        functions.logger.info(store_data);
        const {
            total_orders,
            total_revenue,
            top_sellers,
            total_checkouts
        } = store_data as Daily;

        const new_aov = (total_revenue + current_total_price) / (total_orders + 1);


        let list: TopSellers[] = [];

        line_items.forEach((li, i) => {

            console.log(li);

            if (top_sellers.length > 0) {
                top_sellers.forEach((item) => {
                    console.log(item);
                    if (li.title == item.title) {
                        list = [
                            ...list,
                            {
                                title: item.title,
                                count: item.count + 1,
                            } 
                        ];
                    };
                });
            } else {
                list = [
                    ...list,
                    {
                        title: li.title,
                        count: 1,
                    } 
                ];
            }

        });

        console.log("76: LIST ==> ");
        functions.logger.info(list);

        await updateDocument(MERCHANT_UUID, "analytics", TODAY, {
            ...store_data,
            total_orders: total_orders + 1,
            total_aov: new_aov,
            total_revenue: total_revenue + current_total_price as number,
            top_sellers: list,
            total_checkouts: total_checkouts + 1,
            updated_at: admin.firestore.Timestamp.now()
        });

        
        if (funnel_status < 300 && funnel_data != undefined) {
            functions.logger.info("FUNNEL UPDATE!");
            functions.logger.info(funnel_data);

            const {
                order_page_views,
                order_unique_page_views,
                total_funnel_sales,
                total_funnel_orders,
                order_sales_value,
                upsell_sales_value
            } = funnel_data as DailyFunnel;

            const opv = order_page_views > 0 ? order_page_views : 1;
            const uopv = order_unique_page_views > 0 ? order_unique_page_views : 1;

            const total = total_funnel_sales !== 0 ? (total_funnel_sales) : (order_sales_value + upsell_sales_value);

            if (is_funnel) {
                await updateFunnelsDocument(MERCHANT_UUID, "analytics", TODAY, {
                    ...funnel_data,
                    updated_at: admin.firestore.Timestamp.now(),
                    total_funnel_sales: upsell_sales_value + order_sales_value,
                    total_funnel_orders: total_funnel_orders + 1,
                    total_funnel_aov: (total) / (total_funnel_orders + 1),
                    order_earnings: (order_sales_value) / (opv),
                    order_earnings_unique: (order_sales_value) / (uopv),
                    upsell_earnings: (upsell_sales_value) / (opv),
                    upsell_earnings_unique: (upsell_sales_value) / (uopv),
                });
            }
        }    

        
    }
}