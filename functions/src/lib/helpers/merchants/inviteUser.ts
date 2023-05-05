import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createAppSessions, createMerchantUser, updateSubcollection } from "../firestore";
import {
    Merchant,
    User
} from "../../types/merchants";
import { getToday } from "../date";

const today = admin.firestore.Timestamp.now();

export const inviteUser = async (
    merchant_uuid: string, 
    user: User,
    ip_address: string
) => {

    let text = ' 🎉 [SUCCESS]: User Invited to Merchant Account';
    let status = 200;
    let result: Merchant[] = [];

    let user_uuid = "use_" + crypto.randomBytes(10).toString("hex");
    let storefront_api = "ipat_" + crypto.randomBytes(10).toString("hex");
    let log_uid = await getToday();
    let isValid = false;

    try {
        if (merchant_uuid !== "" && user && isValid) {

            // Get all products if product_uuid is not provided
            const response = await createMerchantUser(merchant_uuid, user_uuid, {
                ...user,
                updated_at: today,
                created_at: today,
                api_key: storefront_api
            } as User);

            if (response.status < 300 && response.data) {
                await createAppSessions(
                    storefront_api, 
                    {
                        merchant_uuid: merchant_uuid ? merchant_uuid : "",
                        host: ip_address ? ip_address : "",
                    },
                    "", 
                    ["STORE_GUEST"],
                    "PLATFORM"
                );
            };

            // Get all products if product_uuid is not provided
            await updateSubcollection(merchant_uuid,
                "users",
                user_uuid,
                "logs",
                log_uid.toString(),{
                ...user,
                updated_at: today,
                created_at: today,
                api_key: storefront_api
            } as User);
        } 
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not create user merchant" ;
        functions.logger.error(text);
        result = [];
    }


    return {status, text, result}

}