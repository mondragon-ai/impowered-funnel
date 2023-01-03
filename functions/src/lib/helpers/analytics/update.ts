import { Analytics, DailyFunnel, FunnelAnalytics, TopSellers } from "../../types/analytics";
import { LineItem } from "../../types/draft_rders";

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as functions from "firebase-functions";
import { createDocumentWthId, createFunnelAnalytics, fetchFunnelAnalytics, getDocument, updateDocument, updateFunnelAnalytics } from "../firestore";
import { getToday } from "../date";
import { Funnel } from "../../types/funnels";

export const updateAnalyticsOnOrderSuccess = async (
    store_data: FirebaseFirestore.DocumentData | null,
    funnel_data: FirebaseFirestore.DocumentData | null,
    current_total_price: number,
    line_items: LineItem[],
    TODAY: string,
    funnel_uuid: string,
    MERCHANT_UUID: string,
) => {

    const funnel = await getDocument(MERCHANT_UUID, "funnels", funnel_uuid);

    if (funnel.status > 300 && !funnel.data) functions.logger.info(" > 🚨 [ERROR] Fetching Funnel Document");
    

    functions.logger.info("-------- [IDS] 👇🏻");
    functions.logger.info(MERCHANT_UUID);
    functions.logger.info(TODAY);

    if (store_data !== null) {
        functions.logger.info(" ===> [STORE UPDATE] - Analytics");

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

    } else {

        let list: TopSellers[] = [];

        line_items.forEach((li, i) => {

            list = [
                ...list,
                {
                    title: li.title,
                    total_orders: 1,
                } 
            ];

        });

        let TODAY = getToday();
    
        // data to be used to create new doc
        const data = {
          total_orders: 0,
          total_aov: 0,
          total_revenue: 0,
          total_sessions: 0,
          total_carts: 0,
          total_checkouts: 0,
          updated_at: admin.firestore.Timestamp.now(),
          created_at: admin.firestore.Timestamp.now(),
          prev_daily_sessions: 0,
          total_daily_sessions: 0,
          daily_sessions_rate: 0,
          prev_daily_new_sessions: 0,
          total_daily_new_sessions: 0,
          daily_new_sessions_rate: 0,
          prev_daily_sales: 0,
          total_daily_sales: current_total_price,
          daily_sales_rate: 0,
          prev_daily_carts: 0,
          total_daily_carts: 0,
          daily_carts_rate: 0,
          prev_daily_checkouts: 0,
          prev_daily_aov: current_total_price,
          total_daily_checkouts: 1,
          total_daily_orders: 0,
          total_funnel_sales: 0,
          total_funnel_orders: 0,
          total_online_sales: 0,
          total_online_orders: 0,
          daily_aov: 0,
          daily_order_rate: 0,
          daily_cart_rate: 0,
          daily_checkout_rate: 0,
          top_sellers: list,
          id: "dai_" + crypto.randomBytes(10),
        }
    
        // creat new analytics doc
        await createDocumentWthId(MERCHANT_UUID, "analytics", String(TODAY), data);
    }

    if (funnel_data !== null && funnel_uuid !== "") {
        functions.logger.info(" ====> [FUNNEL UPDATE!]");

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

        const f = funnel.data as Funnel


        let analytics = {
            total_funnel_orders: total,
            total_funnel_sales: total_funnel_orders + 1,
            total_funnel_aov: (total) / (total_funnel_orders + 1),
            steps: f?.steps ? f?.steps.map(step => {
                if (step.name === "OPT_IN") {
                    return (
                        {
                            name: step.name,
                            page_views: 0,
                            unique_page_views: 0,
                            opt_ins: 0,
                            opt_in_rate: 0,
                            sales_count: 0,
                            sales_rate: 0,
                            sales_value: 0,
                            recurring_count: 0,
                            recurring_value: 0,
                            earnings: (order_sales_value) / (opv),
                            earnings_unique: (order_sales_value) / (uopv),
                        }
                    )
                }
                if (step.name === " UPSELL") {
                    return (
                        {
                            name: step.name,
                            page_views: 0,
                            unique_page_views: 0,
                            opt_ins: 0,
                            opt_in_rate: 0,
                            sales_count: 0,
                            sales_rate: 0,
                            sales_value: 0,
                            recurring_count: 0,
                            recurring_value: 0,
                            earnings: (upsell_sales_value) / (opv),
                            earnings_unique: (upsell_sales_value) / (uopv),
                        }
                    )
                } 
                else  { return }
            }) : [],
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        } as any
        
        await updateFunnelAnalytics(MERCHANT_UUID, funnel_uuid, TODAY, analytics);

    }  else {

        if (funnel_uuid !== "") {

            const f = funnel.data as Funnel


            let analytics = {
                total_funnel_orders: 1,
                total_funnel_sales: current_total_price,
                total_funnel_aov: current_total_price,
                steps: f?.steps ? f?.steps.map(step => {
                    return (
                        {
                            name: step.name,
                            page_views: 0,
                            unique_page_views: 0,
                            opt_ins: 0,
                            opt_in_rate: 0,
                            sales_count: 0,
                            sales_rate: 0,
                            sales_value: 0,
                            recurring_count: 0,
                            recurring_value: 0,
                            earnings: current_total_price,
                            earnings_unique: current_total_price,
                        }
                    )
                }) : [],
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
            } as any
            
            // creat new funnnel_analytics doc
            await createFunnelAnalytics(MERCHANT_UUID, funnel_uuid, TODAY, analytics);
        }

    }
}

export const updateFunnelCheckout = async (
    merchant_uuid: string,
    funnel_uuid: string,
    price: number
) => {

    let funnel: Funnel = {} as Funnel
    try {

        const response = await getDocument(merchant_uuid, "funnels", funnel_uuid);

        if (response.status < 300 && response.data) {
            funnel = response.data as Funnel;
        }
        
    } catch (error) {
        
    }

    try {

        if (funnel_uuid && funnel_uuid !== "") {
        
            let TODAY = await getToday();

            const result = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY))

            const analytics: FunnelAnalytics = result.data as FunnelAnalytics;
    
            if (analytics !== null) {
                const update = {
                    ...analytics,
                    steps: analytics.steps ? analytics?.steps.map(step => {
                        if (step.name === "OPT_IN") {
                            return {
                                sales_count: (step.sales_count ? step.sales_count + 1 : 1),
                                sales_rate: ((step.sales_count ? step.sales_count + 1 : 1) / (step.page_views ? step.page_views : 1)),
                                sales_value: (step.sales_value ? step.sales_count + price : price),
                            }
                        } 
                        return step
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now()
                } as FunnelAnalytics;

                await updateFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), update);
            } else {


                let analytics = {
                    total_funnel_orders: 1,
                    total_funnel_sales: price,
                    total_funnel_aov: price,
                    steps: funnel?.steps ? funnel?.steps.map((step, i) => {
                        return (
                            {
                                name: step.name,
                                page_views: 0,
                                unique_page_views: 0,
                                opt_ins: 0,
                                opt_in_rate: 0,
                                sales_count: 1,
                                sales_rate: 1,
                                sales_value: price,
                                recurring_count: 0,
                                recurring_value: 0,
                                earnings: price,
                                earnings_unique: price,
                                painted: false,
                                order: i ? (i + 1) : 1,
                            }
                        )
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as any
                
                // creat new funnnel_analytics doc
                await createFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), analytics);
                
            }
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

    let funnel: Funnel = {} as Funnel
    try {

        const response = await getDocument(merchant_uuid, "funnels", funnel_uuid);

        if (response.status < 300 && response.data) {
            funnel = response.data as Funnel;
        }
        
    } catch (error) {
        
    }

    try {

        if (funnel_uuid && funnel_uuid !== "") {

            // Get todays date in ID string
            const TODAY = await getToday();
    
            // Fetch Funnel Data
            const result = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY))

            const analytics: FunnelAnalytics = result.data as FunnelAnalytics;
    
            if (analytics !== null) {
                const update = {
                    ...analytics,
                    steps: analytics.steps ? analytics?.steps.map(step => {
                        if (step.name === " UPSELL") {
                            return {
                                sales_count: (step.sales_count ? step.sales_count + 1 : 1),
                                sales_rate: ((step.sales_count ? step.sales_count + 1 : 1) / (step.unique_page_views ? step.unique_page_views : 1)),
                                sales_value: (step.sales_value ? step.sales_count + price : price),
                                recurring_count: (step.recurring_count ? step.recurring_count + 1 : 1),
                                recurring_value: (step.recurring_value ? step.recurring_value + price : price),
                            }
                        } 
                        return step
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now()
                } as FunnelAnalytics;

                await updateFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), update);
            } else {


                let analytics = {
                    total_funnel_orders: 1,
                    total_funnel_sales: price,
                    total_funnel_aov: price,
                    steps: funnel?.steps ? funnel?.steps.map((step, i) => {
                        return (
                            {
                                name: step.name,
                                page_views: 0,
                                unique_page_views: 0,
                                opt_ins: 0,
                                opt_in_rate: 0,
                                sales_count: 0,
                                sales_rate: 0,
                                sales_value: 0,
                                recurring_count: 0,
                                recurring_value: 0,
                                earnings: price,
                                earnings_unique: price,
                                painted: false,
                                order: i ? (i + 1) : 1,
                            }
                        )
                    }) : [],
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as any
                
                // creat new funnnel_analytics doc
                await createFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), analytics);
                
            }
     
        } else { 
            // TODO: Update store analytics? 
        }

    } catch (e) {
        throw new Error("[ERROR]: Likely due to updating analytics");
        
    }
}