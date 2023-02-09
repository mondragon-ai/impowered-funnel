import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as cheerio from "cheerio";
// import { createDocumentWthId, updateFunnelsDocument } from "../lib/helpers/firestore";
import { getToday } from "../lib/helpers/date";
import fetch from "node-fetch";
import { createDocumentWthId, getDocument } from "../lib/helpers/firestore";

export const dailyCronJob = functions
  .pubsub
  .schedule("0 0 * * *")
  .onRun( async (context) => {

    // ? Dynamic ?
    const merchant_uuid = "50rAgweT9PoQKs5u5o7t";

    let TODAY = getToday();

    // data to be used to create new doc
    // const data = {
    //   total_orders: 0,
    //   total_aov: 0,
    //   total_revenue: 0,
    //   total_sessions: 0,
    //   total_carts: 0,
    //   total_checkouts: 0,
    //   updated_at: admin.firestore.Timestamp.now(),
    //   created_at: admin.firestore.Timestamp.now(),
    //   prev_daily_sessions: 0,
    //   total_daily_sessions: 0,
    //   daily_sessions_rate: 0,
    //   prev_daily_new_sessions: 0,
    //   total_daily_new_sessions: 0,
    //   daily_new_sessions_rate: 0,
    //   prev_daily_sales: 0,
    //   total_daily_sales: 0,
    //   daily_sales_rate: 0,
    //   prev_daily_carts: 0,
    //   total_daily_carts: 0,
    //   daily_carts_rate: 0,
    //   prev_daily_checkouts: 0,
    //   prev_daily_aov: 0,
    //   total_daily_checkouts: 0,
    //   total_daily_orders: 0,
    //   total_funnel_sales: 0,
    //   total_funnel_orders: 0,
    //   total_online_sales: 0,
    //   total_online_orders: 0,
    //   daily_aov: 0,
    //   daily_order_rate: 0,
    //   daily_cart_rate: 0,
    //   daily_checkout_rate: 0,
    //   top_sellers: [],
    //   id: "dai_" + crypto.randomBytes(10),
    // }

    // creat new analytics doc
    // await createDocumentWthId(MERCHANT_UUID, "analytics", String(TODAY), data);

    // let has_funnel = true;

    // if (has_funnel) {
    //   // creat new funnnel_analytics doc
    //   await updateFunnelsDocument(MERCHANT_UUID, "analytics", String(TODAY), {
    //     order_page_views: 0,
    //     order_unique_page_views: 0,
    //     order_opt_ins: 0,
    //     order_opt_in_rate: 0,
    //     order_sales_count: 0,
    //     order_sales_rate: 0,
    //     order_sales_value: 0,
    //     order_recurring_count: 0,
    //     order_recurring_value: 0,
    //     order_earnings: 0,
    //     order_earnings_unique: 0,
    //     upsell_page_views: 0,
    //     upsell_unique_page_views: 0,
    //     upsell_opt_ins: 0,
    //     upsell_opt_in_rate: 0,
    //     upsell_sales_count: 0,
    //     upsell_sales_rate: 0,
    //     upsell_sales_value: 0,
    //     upsell_recurring_count: 0,
    //     upsell_recurring_value: 0,
    //     upsell_earnings: 0,
    //     upsell_earnings_unique: 0,
    //     total_funnel_orders: 0,
    //     total_funnel_sales: 0,
    //     total_funnel_aov: 0,
    //     confirm_page_view: 0,
    //     confirm_unique_page_view: 0,
    //     updated_at: admin.firestore.Timestamp.now(),
    //     created_at: admin.firestore.Timestamp.now()
    //   });
    // }

    console.log(String(TODAY));
    console.log(String(merchant_uuid));

    try {
        const response = await getDocument(merchant_uuid, "analytics", String(TODAY));

        console.log(response);
        if (response.status < 300 && response.data != undefined) {
            functions.logger.error("[SUCCESS]: Data Fetched Successfully 🔍"  );
        } else {
            console.log(" => [CREATE] - ");
        
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
              orders: [],
              id: "dai_" + crypto.randomBytes(10).toString("hex"),
            }
        
            // creat new analytics doc
            const resp = await createDocumentWthId(merchant_uuid, "analytics", String(TODAY), data);

            if (resp.status < 300 && resp.data != undefined) {
                functions.logger.error("[SUCCESS]: Data created Successfully 🔍" );
            }
        }
        
    } catch (e) {
      functions.logger.error(" 🚨 [ERROR]: Could not create Store Analytics")
    }

    let original_text: string[] = [];
    let url = "http://rss.cnn.com/rss/cnn_topstories.rss";
    // let links: string[] = [];

    try {

      functions.logger.debug(" ❶ [URL] -> ", {url});
      if (url !== "") {

          const article_response = await fetch(url);

          if (!article_response.ok) {
              throw new Error(`Failed to fetch article: ${article_response.statusText}`);
          }

          const xml = await article_response.text();

          const $ = cheerio.load(xml, { xmlMode: true });
      
          $('link').each(function(i, el) {
            original_text.push($((el)).text());
          });
      }
      
  } catch (e) {
      functions.logger.debug(" 🚨 [URL]: Article doesnt exist");
  }

  if (original_text.length > 0) {
    original_text.forEach( async (uri) => {
      try {
  
        functions.logger.debug(" 👍🏻 [URL] -> " + uri);
        if (uri !== "" && uri.includes('index.html')) {
          const response = await fetch("https://us-central1-impowered-funnel.cloudfunctions.net/funnel/blogs/generate/url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "impowered-api-key": "19uq99myrxd6jmp19k5mygo5d461l0"
            },
            body: JSON.stringify({
              url: uri
            })
          })
          functions.logger.debug(" 🥸 [REPSONSE] - > ", {response});
          if (response.ok) {
            functions.logger.debug(" 🎉 [SUCCESS] - Blog created from this URL > ", {uri});
          }
        }
          
      } catch (e) {
          functions.logger.debug(" 🚨 [URL]: Blog Coudl not Save ");
      }
    })
  }



  functions.logger.info('Created new analytics ', TODAY);
  return null;
});
