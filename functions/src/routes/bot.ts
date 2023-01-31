import * as express from "express";
import * as functions from "firebase-functions";
import { simlpeSearch } from "../lib/helpers/firestore";
import { divinciRequests } from "../lib/helpers/requests";
import { Customer } from "../lib/types/customers";
import { Order } from "../lib/types/draft_rders";
// import { sendWelcomeEmail } from "../lib/helpers/twillio";
// import { Blog } from "../lib/types/blogs";
// import * as admin from "firebase-admin";
// import * as sharp from "sharp";
// import { createDocument, getCollections, getDocument, simlpeSearch, updateDocument} from "../lib/helpers/firestore"; //, getCollections, getDocument, simlpeSearch
import { validateKey } from "./auth";
// import { divinciRequests } from "../lib/helpers/requests";
// import { fetchOrders } from "../lib/helpers/shopify";
// import { storage } from "../firebase";
// import fetch from "node-fetch";


// type Blog = {
//     id: string,
//     title: string,
//     sub_title: string,
//     collection: string,
//     original_text: string,
//     new_text: string,
//     sections: [
//         {
//             id: string,
//             type: "TEXT" | "VIDEO" | "IMAGE",
//             text: string, 
//             video: string,
//             image: string,
//             [key_name:string]: any
//         }
//     ],
//     default_media_url: string,
//     updated_at: FirebaseFirestore.Timestamp,
//     created_at: FirebaseFirestore.Timestamp,
// }

export const botRoutes = (app: express.Router) => {
    app.post("/bot/customer_service/pre_flight", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BOT] - Initial fetch");
        let status = 400,
            text =  " 🚨 [ERROR]: Could not fetch necessary data.",
            ok = false;

        let result = {} as {
            customer: Customer,
            order: Order
        };

        const {
            merchant_uuid,
            email,
            order_number,
            problem
        } = req.body

        try {

            if (email !== "") {
                functions.logger.debug(" 🔎 [SEARCH] - Search customer with this email -> " + email);
                const resp_customer = await simlpeSearch(merchant_uuid, "customers", "email", email);
    
                if (resp_customer.status <300 && resp_customer.data) {
                    
                    resp_customer.data.list?.forEach(c => {
                        if (c.exists) {
                            result.customer =  c.data() as Customer;
                        }
                    })
                }
            }
            
        } catch (e) {
            functions.logger.error(' ❶ Could not fetch Customer');
        }

        try {

            functions.logger.debug(" 🔎 [SEARCH] - customer ID Results -> " + result.customer.id ?  result.customer.id : " COULDNT FIND");
            if (result.customer.id !== "") {

                if (order_number === "") {
                    status = 200;
                    text =  " 🎉 [SUCCESS]: Fetched customer but order not require.";
                    ok = true;

                } else {

                    if (result.customer.last_order.order_number === order_number && problem !== "LATE") {
                        functions.logger.debug(" 👍🏻 [ORDER_NUMBER] - Exists on Customer -> " + result.customer.last_order.order_number);
                        result.order =  result.customer.last_order as unknown as Order;

                        status = 201;
                        text =  " 🎉 [SUCCESS]: Fetched customer & order set.";
                        ok = true;
                    } else {
                        functions.logger.debug(" 🔎 [SEARCH] - Search Orders with Order Number -> " +  order_number);
                        const order_response = await simlpeSearch(merchant_uuid, "orders", "order_number", order_number);

                        if (order_response.status < 300 && order_response.data) {

                            status = 202;
                            text =  " 🎉 [SUCCESS]: Fetched customer & order fetched/set.";
                            ok = true;
                            
                            order_response.data.list?.forEach(c => {
                                if (c.exists) {
                                    result.order =  c.data() as Order;
                                }
                            })
                        }
                    }
                }
            }
            
        } catch (error) {
            functions.logger.error(' ❶ Could not fetch Order document');
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: result
        });
    });

    app.post("/bot/customer_service/chat", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BOT] - Chat response received from customer");
        let status = 400,
            t =  " 🚨 [ERROR]: Could not respond to customer.",
            ok = false;


        const {
            text,
            history,
            problem,
            customer,
        } = req.body as {
            merchant_uuid: string,
            text: string,
            history: string,
            problem: string,
            customer: Customer,
        }

        let new_text = "";

        try {

            if (text !== "" && customer.id !== "") {
                functions.logger.debug(" 🎨 [OPENAI] - Create customer chat response with customer -> " + customer.id);
                functions.logger.debug(" 1 [PROBLEM] -> " + problem);
                functions.logger.debug(" 1 [TEXT] -> " + text);
                functions.logger.debug(" 1 [HISTORY] -> " + history);

                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "You are a customer service agent named Priscila, and you work for the Hodge Twins eCommerce store solving a  " + (problem ? problem + "realted ": "store related") + "  problems. the Hodge Twins are political and fitness influecners. You must resolve the chat and deescelate angry customers, at times.\n\n It is extremely important to convert the '_seconds' key of 'created_at' object in the customer and order information from a Epoch & Unix Timestamp and convert the number into to human-readable date as a string.\n\n" + " Here is the customer information: \n\n" + (customer ? JSON.stringify(customer) : "") + ".\n\n  Here is the previous history, if any: \n\n" + (history ? history  : "") + "\n\nFinally, with all that information, you can anwer this question: " + (text ? text : "") + "\n\nAgent:",
                    temperature: 0.1,
                    max_tokens: 500,
                }); 

                if (gpt_response.status < 300 && gpt_response.data) {
                    new_text = gpt_response?.data?.choices[0]?.text;
                    status = 201;
                    t = " 🎉 [SUCCESS]: Chat bot agent responded ";
                    ok = true;
                }
            }
            
        } catch (e) {
            functions.logger.error(' ❶ Could not reply to the Customer');
        }

        res.status(status).json({
            ok: ok,
            text: t, 
            result: new_text
        });
    });
}