import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createMerchantUser, simlpeSearch } from "../firestore";
import {
    Merchant,
    User
} from "../../types/merchants";

const today = admin.firestore.Timestamp.now();

export const createUser = async (
    token: string, 
    merchant_uuid: string, 
    user: User,
) => {
    // 
    let text = ' 🎉 [SUCCESS]: User created for Merchant';
    let status = 200;
    let result: Merchant[] = [];

    let user_uuid = "use_" + crypto.randomBytes(10).toString("hex");
    let storefront_api = token && token !== "" ? token : "ipat_" + crypto.randomBytes(10).toString("hex");
    let isValid = false;

    try {
        if (merchant_uuid !== "" && user) {

            // Get all products if product_uuid is not provided
            const response = await simlpeSearch(merchant_uuid,"users","email",user.email);
            
            // Check if email exists in merchants list of eligible users
            if (response.status < 300 && response.data) {
                const merchants = response.data.list;

                if (merchants && merchants?.size > 0) {
                    merchants.forEach(mer => {
                        if (mer.exists) {
                            isValid = true;
                        }
                    })
                }
            };
        } 
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not fetch merchant";
        functions.logger.error(text);
        result = [];
    }

    try {
        if (merchant_uuid !== "" && user && isValid) {
            console.log(merchant_uuid);
            // Get all products if product_uuid is not provided
            const response = await createMerchantUser(merchant_uuid, user_uuid, {
                ...user,
                auth_uuid: user_uuid,
                updated_at: today,
                created_at: today,
                api_key: storefront_api
            } as User);
            
            console.log(response);
            if (response.status < 300 && response.data) {
                const search_result = response.data.merchant;
                console.log(search_result)
            };
        } 
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not fetch merchant" ;
        functions.logger.error(text);
        result = [];
    }

    return {status, text, result}

}