import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createDocument, deleteDocument, getCollections, getDocument, updateDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { SubscriptionAgreement } from "../lib/types/products";
import { UserSummary } from "../lib/types/merchants";
import { signInMerchant } from "../lib/helpers/merchants/signInUser";

export const usersRoutes = (app: express.Router) => {
    app.post("/users/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug("[USER]: Create User");
        let s = 200,
            t = " 🎉 [SUCCESS]: User document succesffully created",
            result = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid: string = req.body.merchant_uuid;

        // Data to push
        let user: UserSummary = req.body.user;

        try {
            const {text, status, isValid} = await signInMerchant(merchant_uuid, user);

            if (isValid) {
                // create user docuemnt 
                const response = await createDocument(merchant_uuid,"users","use_",{
                    ...user,
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                });
    
                if (response.status < 300 && response.data) {
                    result = response.data.id;
                }
            } else {
                t = text;
                s = status;
            }

            
        } catch (error) {
            s = 400;
            t = " 🚨 [ERROR]: User document couldn't be created";
            result = "";
            ok = false;
        }
        
        res.status(s).json({
            ok: ok,
            text: t,
            result: result
        })
    });

    app.post("/users/update", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug("[USER]: Updated User");
        let s = 200,
            t = " 🎉 [SUCCESS]: User document succesffully updated",
            result = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid: string = req.body.merchant_uuid;

        // Data to push
        let user: UserSummary = req.body.user;

        try {

            // create user docuemnt 
            await updateDocument(merchant_uuid,"users", user.id,{
                ...user,
                updated_at: admin.firestore.Timestamp.now(),
            });
            
        } catch (error) {
            s = 400;
            t = " 🚨 [ERROR]: User document couldn't be updated";
            result = "";
            ok = false;
        }
        
        res.status(s).json({
            ok: ok,
            text: t,
            result: result
        })
    });

    app.post("/users", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" [USER]: Fetching User(s)");
        let s = 200,
            t = " 🎉 [SUCCESS]: User document succesffully created",
            result: SubscriptionAgreement[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const user_uuid: string = req.body.user_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (user_uuid === "") {
                const response = await getCollections(merchant_uuid, "users");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "users", user_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as SubscriptionAgreement];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            t = "🚨 [ERROR]: User(s) document couldn't be fetched";
            s = 500;
            ok = false;
            functions.logger.error(t);
            throw new Error(t);
        }

        res.status(s).json({
            ok: ok,
            text: s,
            data: {
                size: size,
                users: result
            }
        })
    });

    app.post("/users/delete", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" [USER]: Deleting User");
        let s = 200,
            t = " 🎉 [SUCCESS]: User document succesffully removed",
            result: SubscriptionAgreement[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const user_uuid: string = req.body.user_uuid;

        try {

            if (user_uuid !== "") {
                await deleteDocument(merchant_uuid, "users", user_uuid);
            }

        } catch (e) {
            t = "🚨 [ERROR]: User(s) document couldn't be removed";
            s = 500;
            ok = false;
            functions.logger.error(t);
            throw new Error(t);
        }

        res.status(s).json({
            ok: ok,
            text: s,
            data: {
                size: size,
                users: result
            }
        })
    });


}