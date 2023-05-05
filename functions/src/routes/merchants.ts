import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
    CreateMerchant, UserSummary,
} from "../lib/types/merchants";
import { validateKey } from "./auth";
import { createUser } from "../lib/helpers/merchants/createUser";
import { createUserAndMerchant } from "../lib/helpers/merchants/createAccount";
import { fetchMerchant } from "../lib/helpers/merchants/fetchMerchants";
import { updateDocument } from "../lib/helpers/firestore";
import { getToday } from "../lib/helpers/date";
import { signInMerchant } from "../lib/helpers/merchants/signInUser";
// import { fetchApps } from "../lib/helpers/merchants/fetchApps";
import { subscribeApp } from "../lib/helpers/merchants/apps";

/**
 * Mercahnt Routes
 * @param app 
 */
export const merchantRoutes = (app: express.Router) => {

    app.post("/merchants/sign_in", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [MERCHANTS] - Sign In Merchant Account.');

        // Fetch Obj 
        let {
            user,
            merchant_uuid,
        }: CreateMerchant = req.body;

        console.log(user)
        console.log(merchant_uuid)

        // 
        const {status,text,isValid,api_key} = await signInMerchant(
            merchant_uuid as string,
            user as UserSummary,
        );

        // Create merchant & own User 
        res.status(status).json({
            text: text,
            ok: isValid,
            data: isValid ? api_key : ""
        });
    });

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
        const today = await getToday();

        // Destructure the required data from the request body
        const {
            merchant_uuid, 
            token,
            user
        } = req.body;

        console.log(merchant_uuid)
        console.log(token)
        console.log(user)

        // Create User for Merchant
        let {status,text,result} =  await createUser(
            token,
            merchant_uuid,
            user
        );

        try {
            if (status < 300 && result) {
    
                // Update Merchant 
                await updateDocument(merchant_uuid, "logs", today.toString(), {
                    updated_at: admin.firestore.Timestamp.now(),
                    account: user.email ? user.email : "",
                    created_at: admin.firestore.Timestamp.now(),
                    description: "Merchant invited by " + (user.first_name ? user.first_name : "") + "."
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



    // // Fetch products using imPowered API_KEY
    // app.post("/merchants/apps", async (req: express.Request, res: express.Response) => {

    //     // Destructure the required data from the request body
    //     const { merchant_uuid, micro_service } = req.body as {
    //         merchant_uuid: string;
    //         micro_service: string;
    //     };
    
    //     // Fetch the merchants based on shop name || uid
    //     const { status, text, result, size } = await fetchApps(
    //         micro_service || "",
    //         merchant_uuid || ""
    //     );
    
    //     // Return the response
    //     res.status(status).json({
    //         ok: status < 300,
    //         text,
    //         data: {
    //             size,
    //             api_key: result.length > 0 ? result[0].api_key : ""
    //         }
    //     });
    // });


    // Fetch products using imPowered API_KEY
    app.post("/merchants/apps/subscribe", async (req: express.Request, res: express.Response) => {

        // Destructure the required data from the request body
        const { merchant_uuid, micro_service } = req.body as {
            merchant_uuid: string;
            micro_service: string;
        };
    
        // Fetch the merchants based on shop name || uid
        const { status, text, result } = await subscribeApp(
            micro_service || "",
            merchant_uuid || ""
        );
    
        // Return the response
        res.status(status).json({
            ok: status < 300,
            text,
            data: result
        });
    });


}
