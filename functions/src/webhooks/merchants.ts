import * as functions from "firebase-functions";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { Merchant } from "../lib/types/merchants";
// import { createAlgoDB } from "../routes/db";
import { createAppSessions, updateDocument } from "../lib/helpers/firestore";
import { decrypt, encrypt } from "../lib/helpers/algorithms";
import { createMerchantAccount } from "../lib/helpers/stripe";
import { getToday } from "../lib/helpers/date";



export const merchantCreated = functions.firestore
.document("/merchants/{merchantID}")
.onCreate(async (snap) => {
    functions.logger.info(" 🏪 [MERCHANT]: Merchant On Create - Trigger");

    // Get Todays Date
    const today = await getToday();

    // Get merchant & Deconstruct
    let merchant: Merchant = snap.exists ? snap.data() as Merchant : {} as Merchant;
    const { api_key, id, ip_address, owner } = merchant;

    // set vars
    let token = "";
    let merchant_uuid = "";

    const merchantId = id ? id : "";

    try {
        // use algos for enctrption
        token = decrypt(api_key ? api_key : "");
        merchant_uuid = encrypt(merchantId ? merchantId : "");
    } catch (error) { };

    // Token new api key (store scope) 
    const new_ipat = "ipat_" + crypto.randomBytes(10).toString('hex');

    try {
        // Set token
        const storefront_api = token !== "" ? token : new_ipat;

        // create new session (for owner)
        await createAppSessions(
            storefront_api, 
            {
                owner: owner,
                merchant_uuid: merchant_uuid ? merchant_uuid : "",
                ip_address: ip_address ? ip_address : "",
            },
            "", 
            ["OWNER"]
        );

        // Stripe Charge
        await createMerchantAccount(merchantId, owner.email as string);

        const log_id = today.toString();

        // Update Merchant 
        await updateDocument(merchantId, "logs", log_id, {
            updated_at: admin.firestore.Timestamp.now(),
            account: owner.email ? owner.email : "",
            created_at: admin.firestore.Timestamp.now(),
            description: "Merchant store created by " + (owner.first_name ? owner.first_name : "") + ""
        });
        functions.logger.info(" [MERCHANT]: UPDATED MERCHANT ACCOUT");

    } catch (error) {
        functions.logger.error(" 🚨 [ERROR]: creating sessions");
    }

});
