import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
    CreateMerchant,
} from "../lib/types/merchants";
import { validateKey } from "./auth";
import { createUser } from "../lib/helpers/merchants/createUser";
import { createUserAndMerchant } from "../lib/helpers/merchants/createAccount";
import { fetchMerchant } from "../lib/helpers/merchants/fetchMerchants";
import { updateDocument } from "../lib/helpers/firestore";
import { getToday } from "../lib/helpers/date";

/**
 * Mercahnt Routes
 * @param app 
 */
export const merchantRoutes = (app: express.Router) => {

    app.post("/merchants/create",  async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Create Merchant');

        // Fetch Obj 
        let {
            merchant,
            user,
            token
        }: CreateMerchant = req.body;

        // Create merchant & own User 
        const {status,text,result} = await createUserAndMerchant(
            token,
            user,
            merchant,
            req.hostname || ''
        );

        // Create merchant & own User 
        res.status(status).json({
            text: text,
            data: result
        });
    });

    // Fetch products using imPowered API_KEY
    app.post("/merchants/create/user", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Create User for Merchant');

        // Destructure the required data from the request body
        const {
            merchant_uuid, 
            user,
            token
        } = req.body;

        // Create User for Merchant
        const {status,text,result} =  await createUser(
            token,
            merchant_uuid,user
        );
    
        // Return the response
        res.status(status).json({
            ok: result.length > 0,
            text,
            data: {
                size: result.length > 0 ? result.length : -1,
                api_key: result.length > 0 ? result[0].api_key : ""
            }
        });
    });
    
    // Fetch products using imPowered API_KEY
    app.post("/merchants/invite/user", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Create User for Merchant');

        // Destructure the required data from the request body
        const {
            merchant_uuid, 
            user,
            token,
            owner
        } = req.body;

        // Create User for Merchant
        let {status,text,result} =  await createUser(
            token,
            merchant_uuid,user
        );

        const today = await getToday();

        try {
            if (status < 300 && result) {
    
                // Update Merchant 
                await updateDocument(merchant_uuid, "logs", today.toString(), {
                    updated_at: admin.firestore.Timestamp.now(),
                    account: owner.email ? owner.email : "",
                    created_at: admin.firestore.Timestamp.now(),
                    description: "Merchant invited by " + (owner.first_name ? owner.first_name : "") + "."
                });
            } 
        } catch (error) {
            functions.logger.error(text);
        }

        // Return the response
        res.status(status).json({
            ok: result.length > 0,
            text,
            data: {
                size: result.length > 0 ? result.length : -1,
                api_key: result.length > 0 ? result[0].api_key : ""
            }
        });
    });

    // Fetch products using imPowered API_KEY
    app.post("/merchants", async (req: express.Request, res: express.Response) => {
        // Destructure the required data from the request body
        const { merchant_uuid, merchant_shop } = req.body as {
            merchant_uuid: string;
            merchant_shop: string;
        };
    
        // Fetch the merchants based on shop name || uid
        const { status, text, result, size } = await fetchMerchant(
            merchant_shop || "",
            merchant_uuid || ""
        );
    
        // Return the response
        res.status(status).json({
            ok: status < 300,
            text,
            data: {
                size,
                api_key: result.length > 0 ? result[0].api_key : ""
            }
        });
    });


}
