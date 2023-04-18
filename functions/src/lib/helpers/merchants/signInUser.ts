import * as functions from "firebase-functions";
import { simlpeSearch } from "../firestore";
import {
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
                            if (mer.data())
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

    return {status, text, isValid}

}