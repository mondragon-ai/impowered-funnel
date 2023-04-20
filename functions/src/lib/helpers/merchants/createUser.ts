import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { simlpeSearch, updateDocument } from "../firestore";
import {
    Merchant,
    User
} from "../../types/merchants";
import { encryptToken } from "../algorithms";

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
    let isValid = false;

    let payload = {} as User


    try {
        if (merchant_uuid !== "" && user) {

            // Get all products if product_uuid is not provided
            const response = await simlpeSearch(merchant_uuid,"users","email",user.email);
            
            // Check if email exists in merchants list of eligible users
            if (response.status < 300 && response.data) {
                const users = response.data.list;

                if (users && users?.size > 0) {
                    users.forEach(user => {
                        if (user.exists) {
                            user_uuid = user.id;
                            payload = user.data() as User;
                            isValid = true;
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

    let encrypted_merchant_id = ""

    try {
        encrypted_merchant_id = encryptToken(merchant_uuid)
    } catch (error) {
        
    }
    try {
        if (merchant_uuid !== "" && user && isValid) {
            console.log(payload);

            // Get all products if product_uuid is not provided
            const response = await updateDocument(merchant_uuid, "users", user_uuid, {
                ...payload,
                ...user,
                id: user_uuid,
                updated_at: today,
                created_at: today,
                merchant_uuid: encrypted_merchant_id
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