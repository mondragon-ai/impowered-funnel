import { Analytics, DailyFunnel, TopSellers } from "../../types/analytics";
import { LineItem } from "../../types/draft_rders";

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getFunnelAnalytics, updateDocument, updateFunnelsDocument } from "../firestore";
import { getToday } from "../date";

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
            total_daily_orders,
            total_daily_sales,
            top_sellers,
            total_daily_checkouts
        } = store_data as Analytics;

        const new_aov = ((total_daily_sales ? total_daily_sales : 0) + current_total_price) / ((total_daily_orders ? total_daily_orders : 0) + 1);


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
                                total_orders: item.total_orders + 1,
                            } 
                        ];
                    };
                });
            } else {
                list = [
                    ...list,
                    {
                        title: li.title,
                        total_orders: 1,
                    } 
                ];
            }

        });

        console.log("76: LIST ==> ");
        functions.logger.info(list);

        await updateDocument(MERCHANT_UUID, "analytics", TODAY, {
            ...store_data,
            total_daily_orders: total_daily_orders + 1,
            daily_aov: new_aov,
            total_daily_sales: total_daily_sales + current_total_price as number,
            top_sellers: list,
            total_daily_checkouts: total_daily_checkouts + 1,
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

export const updateFunnelCheckout = async (
    merchant_uuid: string,
    funnel_uuid: string,
    price: number
) => {

    try {

        if (funnel_uuid && funnel_uuid !== "") {
        
            let TODAY = await getToday();

            const result = await getFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY))

            const analytics: DailyFunnel = result.data as DailyFunnel;

            const uopv = analytics.order_page_views ? analytics.order_page_views : 1;

            const update = {
                ...analytics,
                order_sales_count: (analytics.order_sales_count + 1),
                order_sales_rate: ((analytics.order_sales_count + 1) / (uopv)),
                order_sales_value: (analytics.order_sales_value + price),
                updated_at: admin.firestore.Timestamp.now()
            }

            await updateFunnelsDocument(merchant_uuid, "analytics", String(TODAY), update);
        } 

    } catch (e) {
        functions.logger.info("154: [ERROR] - Updating analytics ");
    }
}

export const updateFunnelSubPurchase = async (
    merchant_uuid: string,
    funnel_uuid: string,
    price: number
) => {

    try {

        if (funnel_uuid && funnel_uuid !== "") {

            // Get todays date in ID string
            const TODAY = await getToday();
    
            // Fetch Funnel Data
            const result = await getFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY))
    
            // Set data
            const analytics: DailyFunnel = result.data ? result.data  as DailyFunnel : {}  as DailyFunnel;
     
            // Logging
            functions.logger.info(" => [ANALYTICS] - Quick Sub");
    
            const { 
              upsell_sales_count,
              upsell_sales_value,
              upsell_unique_page_views,
              upsell_recurring_count
            } = analytics;
        
            // set unique views
            const uupv = upsell_unique_page_views > 0 ? upsell_unique_page_views : 1;
        
            // Update FB Doc 
            await updateFunnelsDocument(merchant_uuid, "analytics", String(TODAY), {
              updated_at: admin.firestore.Timestamp.now(),
              upsell_sales_count: (upsell_sales_count + 1),
              upsell_sales_value: (upsell_sales_value + price),
              upsell_sales_rate: ((upsell_sales_count + 1) / (uupv)),
              upsell_recurring_count: (upsell_recurring_count + 1) ,
              upsell_recurring_value: (upsell_sales_value + price)
            } as DailyFunnel);
        } else { 
            // TODO: Update store analytics? 
        }
    } catch (e) {
        throw new Error("[ERROR]: Likely due to updating analytics");
        
    }
}