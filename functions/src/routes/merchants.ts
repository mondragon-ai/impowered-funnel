import * as crypto from "crypto";
import * as express from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createDocumentWthId, createMerchant, createMerchantUser, getMerchant, searchMerchants } from "../lib/helpers/firestore";
import {
    Merchant,
    CreateMerchant,
    User
} from "../lib/types/merchants";
import * as ip from 'ip';
import { encrypt } from "../lib/helpers/algorithms";
import { validateKey } from "./auth";

const today = admin.firestore.Timestamp.now();

/**
 * Mercahnt Routes
 * @param app 
 */
export const merchantRoutes = (app: express.Router) => {

    app.post("/merchants/create",  async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Create Merchant');
        let text = "", status= 500, result: any = null;

        let {
            merchant,
            user,
            token
        }: CreateMerchant = req.body;

        console.log(req.headers)
        console.log(req.url)
        const ipAddress = ip.address();


        let merchant_uuid = "mer_" + crypto.randomBytes(10).toString("hex");
        let storefront_api = token && token !== "" ? token : "ipat_" + crypto.randomBytes(10).toString('hex');

        try {
            merchant_uuid =  encrypt(merchant_uuid);
            storefront_api =  encrypt(storefront_api);
        } catch (error) {
            throw new Error(" 🚨 [ERROR] Coudlnt encrypt");
            
        }

        try {
            const merchant_data = {
                ...merchant,
                updated_at: today,
                created_at: today,
                merchant_uuid: merchant_uuid,
                host: req.hostname || "",
                ip_address: ipAddress,
                api_key: storefront_api
            } as Merchant;

            await createMerchant(merchant_uuid, merchant_data);

            result = {
                ...result,
                merchant_uuid,
                storefront_api
            }
            
        } catch (e) {
            text = " 🚨 [ERROR]: creating merchant.";
            functions.logger.error(text)
        }

        try {
            const user_uuid = "use_" + (user.id || "");
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
            }

            await createDocumentWthId(merchant_uuid, "users", user_uuid, user_data);
            
            text = " 🎉 [SUCCESS]: Merchant Created Graciously.";
            status = 200;
        } catch (e) {
            text = " 🚨 [ERROR]: creating user for merchant";
            functions.logger.error(text);
        }
        res.status(status).json({
            text: text,
            data: result
        });
    });




    // Fetch products using imPowered API_KEY
    app.post("/merchants/create/user", validateKey, async (req: express.Request, res: express.Response) => {
        // Destructure the required data from the request body

        let text = ' 🎉 [SUCCESS]: User created for Merchant';
        let status = 200;
        let result: Merchant[] = [];
        let size = 0;
        let ok = true;

        const {
            merchant_uuid, 
            user,
            token
        } = req.body;
    

        let user_uuid = "use_" + crypto.randomBytes(10).toString("hex");
        let storefront_api = token && token !== "" ? token : "ipat_" + crypto.randomBytes(10).toString("hex");

        try {
            if (merchant_uuid !== "") {
                console.log(merchant_uuid);
                // Get all products if product_uuid is not provided
                const response = await createMerchantUser(merchant_uuid, user_uuid, {
                        ...user,
                        auth_uuid: user_uuid,
                        updated_at: today,
                        created_at: today,
                        api_key: storefront_api
                    } as User);
                console.log(response)
            
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

        // Return the response
        res.status(status).json({
            ok,
            text,
            data: {
                size,
                api_key: result.length > 0 ? result[0].api_key : ""
            }
        });
    });

    // Fetch products using imPowered API_KEY
    app.post("/merchants", async (req: express.Request, res: express.Response) => {
        // Destructure the required data from the request body
        const { merchant_uuid, merchant_shop } = req.body as  {merchant_uuid: string, merchant_shop: string };
    
        let text = ' 🎉 [SUCCESS]: Merchant(s) fetched',
        status = 200,
        result: Merchant[] = [],
        size = 0,
        ok = true;

        console.log(merchant_shop);
        console.log(merchant_uuid);

        try {
            if (merchant_shop !== '' && merchant_uuid == "") {
                // Get all products if product_uuid is not provided
                const response = await searchMerchants("shop", merchant_shop.toLocaleLowerCase());
                console.log(response)
            
                if (response.status < 300 && response.data) {
                    const search_result = response.data.list;

                    search_result?.forEach(v => {
                        if (v.exists) {
                            const merchant = v.data();
                            console.log(merchant);
                            result?.push(merchant as Merchant);
                        }
                    })
                    size = response.data?.list?.size || 0;
                };
                if (response.status == 420) {
                    // Return the response
                    status = 201;
                    text = response.text;
                    size = 0;
                    result = [];
                }
            } 
            
            if (merchant_shop === '' && merchant_uuid !== "") {
                // Get a single product if product_uuid is provided
                const response = await getMerchant(merchant_uuid);
            
                if (response.status < 300 && response.data !== undefined) {
                    result = [response.data as Merchant];
                    status = 201;
                }
            }
        } catch (error) {
            // Log the error and return a server error response
            status = 500;
            text = " 🚨 [ERROR]: Could not fetch merchant" ;
            functions.logger.error(text);
            result = [];
        }

        // Return the response
        res.status(status).json({
            ok,
            text,
            data: {
                size,
                api_key: result.length > 0 ? result[0].api_key : ""
            }
        });
    });


}