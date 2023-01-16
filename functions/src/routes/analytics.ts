import * as express from 'express';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getToday } from '../lib/helpers/date';
import { createDocumentWthId, createFunnelAnalytics, fetchFunnelAnalytics, getDocument, searchAnalytics, searchFunnelAnalytics, updateFunnelAnalytics } from '../lib/helpers/firestore';
import { Analytics, FunnelAnalytics, TopSellers } from '../lib/types/analytics';
import { Funnel } from '../lib/types/funnels';
import { Product } from '../lib/types/products';
import { validateKey } from './auth';

export const analyticRoutes = (app: express.Router) => {
    app.post("/analytics/funnels", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> [FETCHING] - Funnel Analytics Start ✅');
        let text = "[ERROR]: Likely fetching funnel alaytics 😿", status= 500, ok = false, analytics: Analytics | any = null;

        // Merchant uuid from headers
        const merchant_uuid = req.body.merchant_uuid;
        const funnel_uuid = req.body.fun_uuid;
        functions.logger.debug(merchant_uuid);
        functions.logger.debug(funnel_uuid);
        

        let TODAY = await getToday();

        try {

            console.log("[GET] - Funnel Analytics Document");
            const response = await fetchFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY));
            if (response.status < 300 && response.data !== null) {
                analytics = response.data;
                status = 200;
                text = "[SUCCESS]: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Fetching doc"
        }

        let funnel: Funnel = {} as Funnel;
        

        if (analytics === null) {
            try {
    
                console.log("[GET] - Funnel Document");
                const response = await getDocument(merchant_uuid,"funnels",funnel_uuid);
    
                console.log(response);
                if (response.status < 300 && response.data !== null) {
                    funnel = response.data as Funnel;
                    status = 200;
                    text = "[SUCCESS]: Created Successfullly"
                }
                
            } catch (e) {
                text = text + " - Fetching Funnel doc"
            }
    
    
            if (funnel?.steps && funnel?.steps?.length <= 0) {
                text = " 🚨 [ERROR]: Steps necessary to create a funnel";
                status = 400;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            } else {
                functions.logger.debug(" => Steps exist");
                functions.logger.debug(funnel?.steps.length);
    
                analytics = {
                    total_orders: 0,
                    total_sales: 0,
                    total_aov: 0,
                    steps: funnel.steps.map((step, i) => {
                        return {
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
                            earnings: 0,
                            earnings_unique: 0,
                            painted: false,
                            order: i + 1
                        }
                    }),
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as any
    
            }
    
            // Create funnel analytics document 
            try {
    
                if (funnel_uuid === "") {
                    text = "ERROR: Likely couldnt create a funnel document. Cant create analytics without Funnel ID";
                    status = 500;
                    ok = false;
                    functions.logger.error(text);
                    throw new Error(text);
                }
                const TODAY = await getToday();
    
                functions.logger.debug(" => Ready to push data");
                functions.logger.debug(" => result (id) - " + funnel_uuid);
                functions.logger.debug(" => analytics (to create) -  ");
                functions.logger.debug(analytics);
    
                const response = await createFunnelAnalytics(merchant_uuid, funnel_uuid, String(TODAY), analytics);
    
                // data check && set
                if (response?.status > 300 && !response?.data) {
                    console.error(" 🚨 [ERROR]: Likley creating analytics ")
                } else {
                    analytics = analytics
                }
                
            } catch (e) {
                text = "ERROR: Likely couldnt create a funnel document";
                status = 500;
                ok = false;
                functions.logger.error(text);
                throw new Error(text);
            }   
        }

        res.status(status).json({
            text: text,
            ok: ok, 
            data: analytics
        })
    });

    app.get("/analytics/daily", validateKey,  async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ====> FETCHING STORE ANALYTICS');
        let text = " 🚨 [ERROR]: Likely product fetching prolem 🔍", status= 500, result: Product[] | any = null;

        // Merchant uuid from headers
        const merchant_uuid = req.body.merchant_uuid;

        const TODAY = await getToday();

        console.log(String(TODAY));
        console.log(String(merchant_uuid));

        try {
            const response = await getDocument(merchant_uuid, "analytics", String(TODAY));

            console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data;
                status = 200;
                text = "[SUCCESS]: Data Fetched Successfully 🔍" 
            } else {
                console.log(" => [UPDATE] - ");
            
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
                  total_daily_sales: 0,
                  daily_sales_rate: 0,
                  prev_daily_carts: 0,
                  total_daily_carts: 0,
                  daily_carts_rate: 0,
                  prev_daily_checkouts: 0,
                  prev_daily_aov: 0,
                  total_daily_checkouts: 0,
                  total_daily_orders: 0,
                  total_funnel_sales: 0,
                  total_funnel_orders: 0,
                  total_online_sales: 0,
                  total_online_orders: 0,
                  daily_aov: 0,
                  daily_order_rate: 0,
                  daily_cart_rate: 0,
                  daily_checkout_rate: 0,
                  top_sellers: [],
                  id: "dai_" + crypto.randomBytes(10).toString("hex"),
                }
            
                // creat new analytics doc
                const resp = await createDocumentWthId(merchant_uuid, "analytics", String(TODAY), data);

                console.log(resp);

                if (resp.status < 300 && resp.data != undefined) {
                    result = data;
                    status = 200;
                    text = "[SUCCESS]: Data created Successfully 🔍" 
                }
            }
            
        } catch (e) {
            text = text + " - Fetching doc"
        }


        res.status(status).json({
            text: text,
            data: result
        })
    })

    app.post("/analytics/page_views", validateKey ,async (req: express.Request, res: express.Response) => {
        console.log("[ANALYTICS] - Page Views Started ✅");
        let status = 500, text = " 🚨 [ERROR]: Likley internal problem 😿 ";

        let MERCHANT_UUID = req.body.merchant_uuid;
        let fun_uuid = req.body.fun_uuid;

        const TODAY = await getToday();

        let result: FunnelAnalytics | any = null;

        try {
            console.log("[FUNNEL] - Fetch Analytics");
            const response = await fetchFunnelAnalytics(MERCHANT_UUID, fun_uuid, String(TODAY));

            // console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data as FunnelAnalytics;
                status = 200;
                text = "[SUCCESS]: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Fetching doc.";
        }
        const pv: string[][] = req.body.page_view;
        console.log("[FUNNEL] - Data");
        functions.logger.debug(result);

        try {
            let update: FunnelAnalytics = {
                ...result,
                updated_at: admin.firestore.Timestamp.now()
            }
            // [pair[0]]: Number(n) + 1;

            pv.forEach(pair => {
                // const n = Number.isNaN(result?.[pair[1]]) ? 0 : result?.[pair[1]] == undefined ? 0 :  result?.[pair[1]];

                update = {
                    ...update,
                    steps: update.steps && update.steps.map(s => {
                        if (s.name === pair[0]) {
                            if ("page_views" === pair[1]) {
                                return {
                                    ...s,
                                    page_views: s.page_views ?  s.page_views + 1 : 1,
                                    earnings: (s.earnings ? s.earnings : 0) / (s.page_views ? ( s.page_views + 1 ): 1),
                                }
                            }
                            if ("unique_page_views" === pair[1]) {
                                return {
                                    ...s,
                                    unique_page_views:  (s.unique_page_views ?  s.unique_page_views + 1 : 1),
                                    earnings_unique: (s.earnings_unique ? s.earnings_unique : 0 )/ (s.unique_page_views ?  s.unique_page_views + 1 : 1),
                                }
                            }
                        }
                        return s
                    })
                }
            });
            console.log("[FUNNEL] - Update Data");
            functions.logger.debug(update);

            console.log("[MERCHANT_UUID] - ");
            functions.logger.debug(MERCHANT_UUID);

            console.log("[FUN_UUID] - ");
            functions.logger.debug(fun_uuid);

            console.log("[FUNNEL] - Update Analytics");
            const response = await updateFunnelAnalytics(MERCHANT_UUID, fun_uuid, String(TODAY), update);

            // console.log(response);
            if (response.status < 300 && response.data != undefined) {
                result = response.data;
                status = 200;
                text = "[SUCCESS]: Created Successfullly"
            }
            
        } catch (e) {
            text = text + " - Updating funnels analytics doc"
        }

        res.status(status).json({
            text: text,
            data: result
        })

    });
    
    app.post("/analytics/search", validateKey ,async (req: express.Request, res: express.Response) => {
        console.log("[FUNNEL] - Start Routes ✅");
        let status = 500, text = " 🚨 [ERROR]: Likley internal problem 😿 ",  analytics: Analytics | any = null;

        let merchant_uuid = req.body.merchant_uuid;
        let search_data: {start: number, end: number} = req.body.search_data || null;

        try {
            functions.logger.info("[PRE_FLIGHT] - Vars");
            const response = await searchAnalytics(merchant_uuid, search_data);
            
            functions.logger.info("[POST_FLIGHT] - Response");
            console.log(response);
            if (response.status < 300 && response.data.list && !response.data.list.empty) {
                functions.logger.info("[FOUND] - List Fetched & Starting calculations ✅");

                analytics = {
                    ...analytics,
                    total_orders: 0,
                    total_aov: 0,
                    total_revenue: 0,
                    total_sessions: 0,
                    total_carts: 0,
                    total_checkouts: 0,
                    prev_daily_sessions: 0,
                    total_daily_sessions: 0,
                    daily_sessions_rate: 0,
                    prev_daily_new_sessions: 0,
                    total_daily_new_sessions: 0,
                    daily_new_sessions_rate: 0,
                    prev_daily_sales: 0,
                    total_daily_sales: 0,
                    daily_sales_rate: 0,
                    prev_daily_carts: 0,
                    total_daily_carts: 0,
                    daily_carts_rate: 0,
                    prev_daily_checkouts: 0,
                    prev_daily_aov: 0,
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
                    top_sellers: [],
                } as Analytics;

                // let top_sellers: {title: string, total_orders: number}[] = []
                let top_sellers: TopSellers[] = [];
                let searched_orders: {
                    date: string,
                    value: number, 
                }[] = []

                response.data.list.forEach(date => {
                    const analytic_date = date.data() as Analytics;
                    const id = date.id;
                    console.log(id);

                    if (Number(id) >= search_data.start && Number(id) <= search_data.end ) {
                        functions.logger.info("[FOUND] - Inside SINGLE DAY ✅");

                        analytics = {
                            ...analytics,
                            total_orders: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_aov: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_revenue: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_sessions: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_carts: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_checkouts: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            prev_daily_sessions: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_daily_sessions: analytics.total_daily_sessions ?  analytics.total_daily_sessions +  analytic_date.total_daily_sessions :  analytic_date.total_daily_sessions,
                            daily_sessions_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            prev_daily_new_sessions: analytics.prev_daily_new_sessions ?  analytics.prev_daily_new_sessions +  analytic_date.prev_daily_new_sessions :  analytic_date.prev_daily_new_sessions,
                            total_daily_new_sessions: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            daily_new_sessions_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            prev_daily_sales: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_daily_sales: analytics.total_daily_sales ?  analytics.total_daily_sales +  analytic_date.total_daily_sales :  analytic_date.total_daily_sales,
                            daily_sales_rate: analytics.daily_sales_rate ?  analytics.daily_sales_rate +  analytic_date.daily_sales_rate :  analytic_date.daily_sales_rate,
                            prev_daily_carts: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            total_daily_carts: analytics.total_daily_carts ?  analytics.total_daily_carts +  analytic_date.total_daily_carts :  analytic_date.total_daily_carts,
                            daily_carts_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            prev_daily_checkouts: analytics.prev_daily_checkouts ?  analytics.prev_daily_checkouts +  analytic_date.prev_daily_checkouts :  analytic_date.prev_daily_checkouts,
                            prev_daily_aov: analytics.prev_daily_aov ?  analytics.prev_daily_aov +  analytic_date.prev_daily_aov :  analytic_date.prev_daily_aov,
                            total_daily_checkouts: analytics.total_daily_checkouts ?  analytics.total_daily_checkouts +  analytic_date.total_daily_checkouts :  analytic_date.total_daily_checkouts,
                            total_daily_orders: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytic_date.total_daily_orders,
                            total_funnel_sales: analytics.total_funnel_sales ?  analytics.total_funnel_sales +  analytic_date.total_funnel_sales :  analytic_date.total_funnel_sales,
                            total_funnel_orders: analytics.total_funnel_orders ?  analytics.total_funnel_orders +  analytic_date.total_funnel_orders :  analytic_date.total_funnel_orders,
                            total_online_sales: analytics.total_online_sales ?  analytics.total_online_sales +  analytic_date.total_online_sales :  analytic_date.total_online_sales,
                            total_online_orders: analytics.total_online_orders ?  analytics.total_online_orders +  analytic_date.total_online_orders :  analytic_date.total_online_orders,
                            daily_aov: analytics.daily_aov ?  analytics.daily_aov +  analytic_date.daily_aov :  analytic_date.daily_aov,
                            daily_order_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            daily_cart_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                            daily_checkout_rate: analytics.total_daily_orders ?  analytics.total_daily_orders +  analytic_date.total_daily_orders :  analytics.total_daily_orders,
                        } as Analytics;


                        analytic_date.top_sellers.forEach((li) => {
                            let isNew = true;

                            top_sellers.forEach((item) => {
                                functions.logger.info(" ===> [LINE_ITEM]: " + li.title + "_" + item.title);
                                if (li.title == item.title) {
                                    item.total_orders = Number(item.total_orders) + Number(li.total_orders);
                                    isNew = false;
                                }
                            });

                            if (isNew) {
                                top_sellers.push({
                                    title: li.title,
                                    total_orders: Number(li.total_orders),
                                });
                            }

                        });

                        searched_orders.push({
                            date: analytic_date.created_at.toDate().toDateString(),
                            value: analytic_date.total_daily_sales, 
                        })

                        // analytic_date.top_sellers.forEach((li, i) => {
                        //     let isNew = true;


                        //     if (list.length > 0) {
                        //         list.forEach((item) => {
                        //             functions.logger.info(" ===> [LINE_ITEM]: " + li.title + "_" + item.title);
                        //             if (li.title == item.title) {
                        //                 list = [
                        //                     ...list,
                        //                     {
                        //                         title: item.title,
                        //                         total_orders: Number(item.total_orders) + li.total_orders,
                        //                     } 
                        //                 ];
                        //                 isNew = false;
                        //             }
                        //         });
                        //     } else {
                        //         list = [
                        //             ...list,
                        //             {
                        //                 title: li.title,
                        //                 total_orders: li.total_orders,
                        //             } 
                        //         ];
                        //         isNew = false;
                        //     };

                        //     if (isNew) {
                        //         list = [
                        //             ...list,
                        //             {
                        //                 title: li.title,
                        //                 total_orders: li.total_orders,
                        //             } 
                        //         ];
                        //     }

                        // });

                        // analytic_date.top_sellers.forEach(top => {
                        //     let isNew = true;
                        //     functions.logger.debug(` 💵 [TOP_SELLERS] -  [${top.title}]`);

                        //     if (top_sellers.length > 0) {
                        //         top_sellers.forEach(t => {
                        //             functions.logger.debug(` 💵 [TOP_SELLERS] -  [${top.title}] === [${t.title}]`)
                        //             if (t.title === top.title) {
                        //                 top_sellers = [
                        //                     ...top_sellers,
                        //                     {
                        //                         title: top.title,
                        //                         total_orders: t.total_orders && top.total_orders ? t.total_orders + top.total_orders : 1
                        //                     }
                        //                 ]
                        //                 isNew = false;
                        //             } 
                        //         })
                        //     } else {
                        //         functions.logger.debug(` 💵 [TOP_SELLERS] -  [DOESNT EXIST]`)
                        //         top_sellers = [
                        //             {
                        //                 title: top.title,
                        //                 total_orders: top.total_orders
                        //             }
                        //         ]
                        //     }

                        //     if (isNew) {
                        //         top_sellers = [
                        //             ...top_sellers,
                        //             {
                        //                 title: top.title,
                        //                 total_orders: top.total_orders
                        //             }
                        //         ]
                        //     };
                        // })
                    }
                })

                analytics = {
                    ...analytics,
                    top_sellers: top_sellers,
                    orders: searched_orders,
                }

                status = 200;
                text = " ==> [SUCCESS]: Analytics fetched and calculated -> ";
            }
        } catch (e) {
            text =  text + "Pobably incorrect search data -- needs to be in seconds as a number"
        }
        console.log("[ANALYTICS] ✅");
        console.log(analytics);
        

        res.status(status).json({
            text: text,
            data: analytics
        })

    })
    
    app.post("/analytics/search/funnels", validateKey ,async (req: express.Request, res: express.Response) => {
        console.log("[FUNNEL] - Start Routes ✅");
        let status = 500, text = " 🚨 [ERROR]: Likley internal problem 😿 ",  analytics: FunnelAnalytics | any = null;

        let merchant_uuid = req.body.merchant_uuid;
        let fun_uuid = req.body.fun_uuid;
        let search_data: {start: number, end: number} = req.body.search_data || null;

        try {
            functions.logger.info("[PRE_FLIGHT] - Vars");
            const response = await searchFunnelAnalytics(merchant_uuid, fun_uuid, search_data);
            
            functions.logger.info("[POST_FLIGHT] - Response");
            console.log(response);
            if (response.status < 300 && response.data.list && !response.data.list.empty) {
                functions.logger.info("[FOUND] - List Fetched & Starting calculations ✅");
                let steps: any[] = [];

                let opt_in = {
                    name: "OPT_IN",
                    page_views: 0,
                    unique_page_views:0,
                    opt_ins:0,
                    opt_in_rate:0,
                    sales_count:0,
                    sales_rate:0,
                    sales_value:0,
                    recurring_count:0,
                    recurring_value:0,
                    earnings:0,
                    earnings_unique:0
                };
                let downsell = {
                    name: "DOWNSELL",
                    page_views: 0,
                    unique_page_views:0,
                    opt_ins:0,
                    opt_in_rate:0,
                    sales_count:0,
                    sales_rate:0,
                    sales_value:0,
                    recurring_count:0,
                    recurring_value:0,
                    earnings:0,
                    earnings_unique:0
                };
                let upsell = {
                    name: "UPSELL",
                    page_views: 0,
                    unique_page_views:0,
                    opt_ins:0,
                    opt_in_rate:0,
                    sales_count:0,
                    sales_rate:0,
                    sales_value:0,
                    recurring_count:0,
                    recurring_value:0,
                    earnings:0,
                    earnings_unique:0
                };
                let confirmed = {
                    name: "CONFIRMED",
                    page_views: 0,
                    unique_page_views:0,
                    opt_ins:0,
                    opt_in_rate:0,
                    sales_count:0,
                    sales_rate:0,
                    sales_value:0,
                    recurring_count:0,
                    recurring_value:0,
                    earnings:0,
                    earnings_unique:0
                };

                analytics = {
                    total_sales: 0,
                    total_aov: 0,
                    total_orders: 0,
                    total_earnings: 0,
                    steps: steps
                } as FunnelAnalytics

                response.data.list.forEach(date => {
                    const analytic_date = date.data() as FunnelAnalytics;
                    const id = date.id;
                    console.log(id);
                    

                    if (Number(id) >= search_data.start && Number(id) <= search_data.end ) {
                        functions.logger.info("[FOUND] - Inside SINGLE DAY ✅");

                        const total =  analytics.total_sales ?  Number(analytics.total_sales) + Number(analytic_date.total_sales) : Number(analytic_date.total_sales);
                        const orders = analytics.total_orders ?  Number(analytics.total_orders) + Number(analytic_date.total_orders) : Number(analytic_date.total_orders)
    
    
                        // let steps: any[] = [];
    
                        // analytic_date.steps.forEach(step => {
                        //     if (step.name === "OPT_IN") {
                        //         steps = steps.map(s => {
                        //             if (s.name === "OPT_IN") {
                        //                 steps = [
                        //                     ...steps,
                        //                     {
                        //                         ...step,
                        //                         page_views: step.page_views + s.page_view,
                        //                         unique_page_views: step.unique_page_views + s.unique_page_views,
                        //                         opt_ins: step.opt_ins + s.opt_ins,
                        //                         opt_in_rate: step.opt_in_rate + s.opt_in_rate,
                        //                         sales_count: step.sales_count + s.sales_count,
                        //                         sales_rate: step.sales_rate + s.sales_rate,
                        //                         sales_value: step.sales_value + s.sales_value,
                        //                         recurring_count: step.recurring_count + s.recurring_count,
                        //                         recurring_value: step.recurring_value + s.recurring_value,
                        //                         earnings: step.earnings + s.earnings,
                        //                         earnings_unique: step.earnings_unique + s.earnings_unique,
                        //                     }
                        //                 ]
                        //             }
                        //         })
                        //     }
                        //     if (step.name === "UPSELL") {
                        //         steps = steps.map(s => {
                        //             if (s.name === "UPSELL") {
                        //                 steps = [
                        //                     ...steps,
                        //                     {
                        //                         ...step,
                        //                         page_views: step.page_views + s.page_view,
                        //                         unique_page_views: step.unique_page_views + s.unique_page_views,
                        //                         opt_ins: step.opt_ins + s.opt_ins,
                        //                         opt_in_rate: step.opt_in_rate + s.opt_in_rate,
                        //                         sales_count: step.sales_count + s.sales_count,
                        //                         sales_rate: step.sales_rate + s.sales_rate,
                        //                         sales_value: step.sales_value + s.sales_value,
                        //                         recurring_count: step.recurring_count + s.recurring_count,
                        //                         recurring_value: step.recurring_value + s.recurring_value,
                        //                         earnings: step.earnings + s.earnings,
                        //                         earnings_unique: step.earnings_unique + s.earnings_unique,
                        //                     }
                        //                 ]
                        //             }
                        //         })
                        //     }
                        //     if (step.name === "DOWNSELL") {
                        //         steps = steps.map(s => {
                        //             if (s.name === "DOWNSELL") {
                        //                 steps = [
                        //                     ...steps,
                        //                     {
                        //                         ...step,
                        //                         page_views: step.page_views + s.page_view,
                        //                         unique_page_views: step.unique_page_views + s.unique_page_views,
                        //                         opt_ins: step.opt_ins + s.opt_ins,
                        //                         opt_in_rate: step.opt_in_rate + s.opt_in_rate,
                        //                         sales_count: step.sales_count + s.sales_count,
                        //                         sales_rate: step.sales_rate + s.sales_rate,
                        //                         sales_value: step.sales_value + s.sales_value,
                        //                         recurring_count: step.recurring_count + s.recurring_count,
                        //                         recurring_value: step.recurring_value + s.recurring_value,
                        //                         earnings: step.earnings + s.earnings,
                        //                         earnings_unique: step.earnings_unique + s.earnings_unique,
                        //                     }
                        //                 ]
                        //             }
                        //         })
                        //     }
                        //     if (step.name === "CONFIRMED") {
                        //         steps = steps.map(s => {
                        //             if (s.name === "CONFIRMED") {
                        //                 steps = [
                        //                     ...steps,
                        //                     {
                        //                         ...step,
                        //                         page_views: step.page_views + s.page_view,
                        //                         unique_page_views: step.unique_page_views + s.unique_page_views,
                        //                         opt_ins: step.opt_ins + s.opt_ins,
                        //                         opt_in_rate: step.opt_in_rate + s.opt_in_rate,
                        //                         sales_count: step.sales_count + s.sales_count,
                        //                         sales_rate: step.sales_rate + s.sales_rate,
                        //                         sales_value: step.sales_value + s.sales_value,
                        //                         recurring_count: step.recurring_count + s.recurring_count,
                        //                         recurring_value: step.recurring_value + s.recurring_value,
                        //                         earnings: step.earnings + s.earnings,
                        //                         earnings_unique: step.earnings_unique + s.earnings_unique,
                        //                     }
                        //                 ]
                        //             }
                        //         })
                        //     }
                        // })
    
                        analytic_date.steps.forEach(step => {
                            if (step.name === "OPT_IN") {
                                opt_in = {
                                    ...step,
                                    ...opt_in,
                                    name: step.name || "OPT_IN",
                                    page_views: opt_in.page_views ? (opt_in.page_views + step.page_views) : step.page_views,
                                    unique_page_views: opt_in.unique_page_views ? (opt_in.unique_page_views + step.unique_page_views) : step.unique_page_views,
                                    opt_ins: opt_in.opt_ins ? (opt_in.opt_ins + step.opt_ins) : step.opt_ins,
                                    opt_in_rate: opt_in.opt_in_rate ? (opt_in.opt_in_rate + step.opt_in_rate) : step.opt_in_rate,
                                    sales_count: opt_in.sales_count ? (opt_in.sales_count + step.sales_count) : step.sales_count,
                                    sales_rate: opt_in.sales_rate ? (opt_in.sales_rate + step.sales_rate) : step.sales_rate,
                                    sales_value: opt_in.sales_value ? (opt_in.sales_value + step.sales_value) : step.sales_value,
                                    recurring_count: opt_in.recurring_count ? (opt_in.recurring_count + step.recurring_count) : step.recurring_count,
                                    recurring_value: opt_in.recurring_value ? (opt_in.recurring_value + step.recurring_value) : step.recurring_value,
                                    earnings: opt_in.earnings ? (opt_in.earnings + step.earnings) : step.earnings,
                                    earnings_unique: opt_in.earnings_unique ? (opt_in.earnings_unique + step.earnings_unique) : step.earnings_unique,
                                }
                            }
                            if (step.name === "UPSELL") {
                                upsell = {
                                    ...step,
                                    ...upsell,
                                    name: step.name || "UPSELL",
                                    page_views: upsell.page_views ? (upsell.page_views + step.page_views) : step.page_views,
                                    unique_page_views: upsell.unique_page_views ? (upsell.unique_page_views + step.unique_page_views) : step.unique_page_views,
                                    opt_ins: upsell.opt_ins ? (upsell.opt_ins + step.opt_ins) : step.opt_ins,
                                    opt_in_rate: upsell.opt_in_rate ? (upsell.opt_in_rate + step.opt_in_rate) : step.opt_in_rate,
                                    sales_count: upsell.sales_count ? (upsell.sales_count + step.sales_count) : step.sales_count,
                                    sales_rate: upsell.sales_rate ? (upsell.sales_rate + step.sales_rate) : step.sales_rate,
                                    sales_value: upsell.sales_value ? (upsell.sales_value + step.sales_value) : step.sales_value,
                                    recurring_count: upsell.recurring_count ? (upsell.recurring_count + step.recurring_count) : step.recurring_count,
                                    recurring_value: upsell.recurring_value ? (upsell.recurring_value + step.recurring_value) : step.recurring_value,
                                    earnings: upsell.earnings ? (upsell.earnings + step.earnings) : step.earnings,
                                    earnings_unique: upsell.earnings_unique ? (upsell.earnings_unique + step.earnings_unique) : step.earnings_unique,
                                }
                            }
                            if (step.name === "DOWNSELL") {
                                downsell = {
                                    ...step,
                                    ...downsell,
                                    name: step.name || "DOWNSELL",
                                    page_views: downsell.page_views ? (downsell.page_views + step.page_views) : step.page_views,
                                    unique_page_views: upsell.unique_page_views ? (downsell.unique_page_views + step.unique_page_views) : step.unique_page_views,
                                    opt_ins: downsell.opt_ins ? (downsell.opt_ins + step.opt_ins) : step.opt_ins,
                                    opt_in_rate: downsell.opt_in_rate ? (downsell.opt_in_rate + step.opt_in_rate) : step.opt_in_rate,
                                    sales_count: downsell.sales_count ? (downsell.sales_count + step.sales_count) : step.sales_count,
                                    sales_rate: downsell.sales_rate ? (downsell.sales_rate + step.sales_rate) : step.sales_rate,
                                    sales_value: downsell.sales_value ? (downsell.sales_value + step.sales_value) : step.sales_value,
                                    recurring_count: downsell.recurring_count ? (downsell.recurring_count + step.recurring_count) : step.recurring_count,
                                    recurring_value: downsell.recurring_value ? (downsell.recurring_value + step.recurring_value) : step.recurring_value,
                                    earnings: downsell.earnings ? (downsell.earnings + step.earnings) : step.earnings,
                                    earnings_unique: downsell.earnings_unique ? (downsell.earnings_unique + step.earnings_unique) : step.earnings_unique,
                                }
                            }
                            if (step.name === "CONFIRMED") {
                                confirmed = {
                                    ...step,
                                    ...confirmed,
                                    name: step.name || "CONFIRMED",
                                    page_views: confirmed.page_views ? (confirmed.page_views + step.page_views) : step.page_views,
                                    unique_page_views: confirmed.unique_page_views ? (confirmed.unique_page_views + step.unique_page_views) : step.unique_page_views,
                                    opt_ins: confirmed.opt_ins ? (confirmed.opt_ins + step.opt_ins) : step.opt_ins,
                                    opt_in_rate: confirmed.opt_in_rate ? (confirmed.opt_in_rate + step.opt_in_rate) : step.opt_in_rate,
                                    sales_count: confirmed.sales_count ? (confirmed.sales_count + step.sales_count) : step.sales_count,
                                    sales_rate: confirmed.sales_rate ? (confirmed.sales_rate + step.sales_rate) : step.sales_rate,
                                    sales_value: confirmed.sales_value ? (confirmed.sales_value + step.sales_value) : step.sales_value,
                                    recurring_count: confirmed.recurring_count ? (confirmed.recurring_count + step.recurring_count) : step.recurring_count,
                                    recurring_value: confirmed.recurring_value ? (confirmed.recurring_value + step.recurring_value) : step.recurring_value,
                                    earnings: confirmed.earnings ? (confirmed.earnings + step.earnings) : step.earnings,
                                    earnings_unique: confirmed.earnings_unique ? (confirmed.earnings_unique + step.earnings_unique) : step.earnings_unique,
                                }
                            }
                        })
    
                        analytics = {
                            ...analytics,
                            total_sales: total,
                            total_aov: total / orders,
                            total_orders: orders,
                            total_earnings: total ? (total / Number(opt_in.page_views)) : 0,
                        } as FunnelAnalytics

                    }
                });


                if (opt_in.page_views > 0) {
                    steps = [
                        ...steps,
                        opt_in
                    ];
                }

                if (upsell.page_views > 0) {
                    steps = [
                        ...steps,
                        upsell
                    ];
                }

                if (downsell.page_views > 0) {
                    steps = [
                        ...steps,
                        downsell
                    ];
                }

                if (confirmed.page_views > 0) {
                    steps = [
                        ...steps,
                        confirmed
                    ];
                }

                analytics = {
                    ...analytics,
                    steps: steps
                } as FunnelAnalytics

                status = 200;
                text = " ==> [SUCCESS]: Analytics fetched and calculated -> ";
            }
        } catch (e) {
            text =  text + "Pobably incorrect search data -- needs to be in seconds as a number"
        }
        console.log("[ANALYTICS] ✅");
        console.log(analytics);

        let funnel: Funnel = {} as Funnel;

        if (analytics === null) {
            try {
    
                console.log("[GET] - Funnel Document");
                const response = await getDocument(merchant_uuid,"funnels",fun_uuid);
    
                console.log(response);
                if (response.status < 300 && response.data !== null) {
                    funnel = response.data as Funnel;
                    status = 200;
                    text = "[SUCCESS]: Created Successfullly"
                }
                
            } catch (e) {
                text = text + " - Fetching Funnel doc"
            }
    
    
            if (funnel?.steps && funnel?.steps?.length <= 0) {
                text = " 🚨 [ERROR]: Steps necessary to create a funnel";
                status = 400;
                functions.logger.error(text);
                throw new Error(text);
            } else {
                functions.logger.debug(" => Steps exist");
                functions.logger.debug(funnel?.steps.length);
    
                analytics = {
                    total_orders: 0,
                    total_sales: 0,
                    total_aov: 0,
                    steps: funnel.steps.map((step, i) => {
                        return {
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
                            earnings: 0,
                            earnings_unique: 0,
                            painted: false,
                            order: i + 1
                        }
                    }),
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                } as any
    
            }
        }
        

        res.status(status).json({
            text: text,
            data: analytics
        })

    })
}