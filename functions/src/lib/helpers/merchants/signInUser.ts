import * as functions from "firebase-functions";
import { simlpeSearch } from "../firestore";
import {
    User,
    UserSummary
} from "../../types/merchants";

export const signInMerchant = async (
    merchant_uuid: string, 
    user: UserSummary,
) => {
    // Vars 
    let text = " 🚨 [ERROR]: Customer does not have access to this Merchant Account";
    let status = 403;
    let isValid = false;

    let api_key = ""
    try {
        if (merchant_uuid !== "" && user) {
            // Get all products if product_uuid is not provided
            const response = await simlpeSearch(merchant_uuid,"users","email",user.email);
            
            // Check if email exists in merchants list of eligible users
            if (response.status < 300 && response.data) {
                const users = response.data.list;

                if (users && users?.size > 0) {
                    users.forEach(u => {
                        if (u.exists) {
                            const new_user = u.data() as User;
                            api_key = new_user.api_key;
                            isValid = true;
                            text = ' 🎉 [SUCCESS]: User signed into Merchant Account';
                            status = 200;
                        }
                    });
                } 
            };
        } 
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not fetch merchant";
        functions.logger.error(text);
        isValid = false;
    }

    return {status, text, isValid, api_key}

}