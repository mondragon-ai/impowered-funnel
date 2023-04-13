import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createDocumentWthId, createMerchant} from "../firestore";
import * as ip from 'ip';
import { encrypt } from "../../../lib/helpers/algorithms";
import {
    Merchant,
    User
} from "../../types/merchants";

const today = admin.firestore.Timestamp.now();

export const createUserAndMerchant = async (
    token: string, 
    user: any,
    merchant: Merchant,
    host_name: string,
) => {

    let status = 500,text = "",result: any = null;
    const ipAddress = ip.address();
    const user_uuid = "use_" + (user.id || "");

    // Merchant ID: Encrypted & Decrypted
    let merchant_uuid = "mer_" + crypto.randomBytes(10).toString("hex");
    let merchant_uuid_enc = "mer_";

    // API Key 
    let storefront_api = token && token !== "" ? token : "ipat_" + crypto.randomBytes(10).toString('hex');

    try {
        merchant_uuid_enc =  encrypt(merchant_uuid);
        storefront_api =  encrypt(storefront_api);
    } catch (error) {
        throw new Error(" 🚨 [ERROR] Coudlnt encrypt");
    }

    try {
        const merchant_data = {
            ...merchant,
            updated_at: today,
            created_at: today,
            merchant_uuid: merchant_uuid_enc,
            host: host_name,
            ip_address: ipAddress,
            api_key: storefront_api,
            owner: {
                id: user_uuid,
                first_name: user?.first_name ? user.first_name : "",
                last_name: user.last_name ? user.last_name : "",
                email: user.email ? user.email : "",
            }
        } as Merchant;

        await createMerchant(merchant_uuid, merchant_data);

        result = {
            ...result,
            merchant_uuid_enc,
            storefront_api
        };
        
    } catch (e) {
        text = " 🚨 [ERROR]: creating merchant.";
        functions.logger.error(text);
    }

    try {
        const user_data = {
            ...user,
            auth_uuid: user_uuid,
            updated_at: today,
            created_at: today,
            api_key: storefront_api
        } as User;

        result = {
            ...result,
            user_uuid
        };

        await createDocumentWthId(merchant_uuid, "users", user_uuid, user_data);
        
        text = " 🎉 [SUCCESS]: Merchant Created Graciously.";
        status = 200;
    } catch (e) {
        text = " 🚨 [ERROR]: creating user for merchant";
        functions.logger.error(text);
    }

    return {status,text,result}

}