import * as functions from "firebase-functions";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { Merchant } from "../lib/types/merchants";
// import { createAlgoDB } from "../routes/db";
import { updateDocument, updateMerchant } from "../lib/helpers/firestore";
import { decryptToken } from "../lib/helpers/algorithms";
import { createStripeCustomer } from "../lib/helpers/stripe";
import { getToday } from "../lib/helpers/date";



export const merchantCreated = functions.firestore
.document("/merchants/{merchantID}")
.onCreate(async (snap) => {
    functions.logger.info(" 🏪 [MERCHANT]: Merchant On Create - Trigger");

    // Get Todays Date
    const today = await getToday();

    // Get merchant & Deconstruct
    let merchant: Merchant = snap.exists ? snap.data() as Merchant : {} as Merchant;
    const { api_key, id, owner, stripe } = merchant;

    // set vars
    let token = "";

    const merchantId = id ? id : "";

    try {
        // use algos for enctrption
        token = decryptToken((api_key ? api_key : "") as string);
    } catch (error) { };

    console.log("DECRYPTED_TOKEN: ", token);

    // Token new api key (store scope) 
    const new_ipat = "ipat_" + crypto.randomBytes(10).toString('hex');

    try {
        // Set token
        const storefront_api = token !== "" ? token : new_ipat;
        console.log("STOREFRONT_API: ", storefront_api);

        // // create new session (for owner)
        // await createAppSessions(
        //     storefront_api, 
        //     {
        //         owner: owner,
        //         merchant_uuid: merchant_uuid ? merchant_uuid : "",
        //         ip_address: ip_address ? ip_address : "",
        //     },
        //     "", 
        //     ["OWNER"]
        // );

        // Stripe Charge
        // await createMerchantAccount(merchantId, owner.email as string);

        // Log Date 
        const log_id = today.toString();

        // Create Stripe Customer && Secret for Merchant (to be charged later)
        const stripe_response = await createStripeCustomer(
            (owner.email ? owner.email : ""),
            (owner.first_name ? owner.first_name : ""),
            (owner.last_name ? owner.last_name : "")
        );
        functions.logger.info(" [STRIPE]: ", {stripe_response});


        // handle response
        if (stripe_response.status < 300 && stripe_response.data) {
            // Update Merchant 
            await updateMerchant(merchantId, {
                updated_at: admin.firestore.Timestamp.now(),
                stripe: {
                    ...stripe,
                    secret: stripe_response.data.stripe_client_secret ? stripe_response.data.stripe_client_secret : "",
                    UUID: stripe_response.data.stripe_uuid ? stripe_response.data.stripe_uuid : "",
                },
                billing: [{
                    amount: 1400,
                    usage: 0,
                    time:  Math.floor((new Date().getTime())),
                    name: "PLATFORM",
                    title: "Base Platform Services",
                    id: "bil_"+crypto.randomBytes(10).toString('hex')
                }]
            } as Merchant);


            // Create Merchant Log Entry
            await updateDocument(merchantId, "logs", log_id, {
                updated_at: admin.firestore.Timestamp.now(),
                account: owner.email ? owner.email : "",
                created_at: admin.firestore.Timestamp.now(),
                description: "Merchant store created by " + 
                    (owner.first_name ? owner.first_name : "") + 
                    ". The Merchant Account is ready to be charged."
            });
            functions.logger.info(" [MERCHANT]: Created Logs & Updated");

        } else {
            // Create Merchant Log Entry
            await updateDocument(merchantId, "logs", log_id, {
                updated_at: admin.firestore.Timestamp.now(),
                account: owner.email ? owner.email : "",
                created_at: admin.firestore.Timestamp.now(),
                description: "Merchant store created by " + 
                    (owner.first_name ? owner.first_name : "") + "." + 
                    " 🚨 The Merchant Account has a Stripe error. Check Logs. "
            });
            functions.logger.info(" [MERCHANT]: Created Logs & Updated");
        }


    } catch (error) {
        functions.logger.error(" 🚨 [ERROR]: creating sessions");
    }

});
