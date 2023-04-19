import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { simlpeSearch, updateDocument } from "../firestore";
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
    let text = " 🚨 [ERROR]: Customer does not have access to this Merchant Account";
    let status = 403;
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
                            user_uuid = user_uuid;
                            isValid = false;
                            text = ' 🎉 [SUCCESS]: User already exists for Merchant Account';
                            status = 422;
                        } 
                    });
                } 
            } else {
                isValid = true;
                text = ' 🎉 [SUCCESS]: User created Merchant Account';
                status = 200;
            };;
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
            const response = await updateDocument(merchant_uuid, "users", user_uuid, {
                ...user,
                id: user_uuid,
                updated_at: today,
                created_at: today,
                api_key: storefront_api
            } as User);
            
            console.log(response);
            if (response.status < 300 && response.data) {
                const search_result = response.data;
                console.log(search_result)
            };
        } 
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not update merchant account" ;
        functions.logger.error(text);
        result = [];
    }

    return {status, text, result}

}