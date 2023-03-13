import * as express from "express";
import * as xssFilters from "xss-filters";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateAPIKey } from "../lib/helpers/auth/auth";
import { createAppSessions, getSessionAccount, updateSessions } from "../lib/helpers/firestore";
import { AppSession } from "../lib/types/Sessions";

export const authRoutes = (app: express.Router) => {

    app.post("/sessions/create", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [SESSIONS] - Start Session Validation Route');
        let text = "ERROR: Likely internal prolem 🔥", status= 500, result: AppSession | any = null;

        const merchant_uuid = "50rAgweT9PoQKs5u5o7t"

        const API_KEY = generateAPIKey();

        // let today = new Date().toISOString().split('T')[0];
        let sessions = {
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            api_key: API_KEY,
            merchant_uuid: merchant_uuid,
            host: req.hostname,
            usage: { time: Math.floor((new Date().getTime())), count: 0 },
            dev_api_key: "string",
            production: false,
            roles: ["ALL", "STOREFRONT"]
        };

        try {
            const response = await createAppSessions(API_KEY as string, sessions);

            if (response.status < 300) {
                status = 200
                text = "SUCCESS: Document app session created"
                functions.logger.debug(" 🎉 [SUCCESS]: Document app session created");
            }

        } catch (e) {
            text = text + " -- updated document"
            functions.logger.error(text + " -- updated document");
        }
        
        res.status(status).json({
            text: text,
            data: result
        })

    });

    app.post("/sessions/validate", validateKey, async (req: express.Request, res: express.Response,) => {
        let text = "ERROR: Likely internal prolem 🔥", status= 500;

        // const merchant_uuid = req.body.merchant_uuid;

        res.status(status).json({
            text: text,
            data: req.body
        })
    });

}

export const validateKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    functions.logger.debug(" ✅ [SESSIONS] - Start Validation Route");
    let text = " 🚨 [ERROR]: Likely oAuth problem problems. ", status= 401, account: AppSession | null = null;
    let api_key = req.header('impowered-api-key') as string; 
    functions.logger.debug(" ❶ [API KEY] " + api_key);

    try {
        const key = xssFilters.inHTMLData(api_key)
        const response = await getSessionAccount(key);

        if (response.status < 300) {
            functions.logger.debug(" 🏦 [SESSIONS FOUND]");
            account = response.data;
        } else {
            text = text + response.text;
            status = response.status;
        }

    } catch (e) {
        status = 404;
        text = text + " - cant find session document. Check API KEYS";
    }

    let update_session = {
        ...account,
    } as AppSession

    let VALID = true;

    if (account !== null) {


            // Validate dev ? LOCALHOST && dev_key ? serve :: err
            if (account.api_key.includes("test_") && api_key !==  account.dev_api_key) {
                functions.logger.debug(" ❶ Dev host & dev key dont match");
                VALID = false;
                text = text + " - dev host & dev key dont match"
                status = 400;
            }

            // Validate Host w/ Key ? LOCALHOST || {{ host }} 
            // if (host === "localhost" && !account.api_key.includes("test_")) {
            //     functions.logger.debug(" => Dev host & live key");
            //     VALID = false
            //     text = text + " - dev host & live key."
            //     status = 400;
                
            // } else {
            //     if (host !== account.host || api_key !==  account.api_key) {
            //         functions.logger.debug(" =>  wrong key / host match");
            //         VALID = false
            //         text = text + " - host & key match"
            //         status = 400;
            //     } 
            // }


            if (api_key !==  account.api_key) {
                functions.logger.debug(" ❶ wrong key / host match");
                VALID = false
                text = text + `${text} - host & key do not match`
                status = 400;
            } 

            const session_range = (account.usage.time) + 5000;

            // Validate Usage w/ max of 999 / min
            if (Math.floor((new Date().getTime())) < session_range) {

                if (account.usage.count >= 999) {
                    functions.logger.debug(" ❶ rate limit hit");
                    text = text + " - rate limit hit.";
                    VALID = false;
                    status = 400;
                }
            } else {

                update_session =  {
                    ...update_session,
                    updated_at: admin.firestore.Timestamp.now(),
                    usage: {
                        count: 0,
                        time:  Math.floor((new Date().getTime()))
                    }
                };
                VALID = true;
                status = 200;
            }

            if (VALID){
                text = " 🎉 [SUCCESS]: Session validated 🔑. "
                status = 200;
                await updateSessions(api_key, {
                    ...update_session,
                    updated_at: admin.firestore.Timestamp.now(),
                    usage: {
                        count: (update_session.usage?.count as number) + 1,
                        time: update_session.usage?.time
                    }
                });
                req.body = {
                    ...req.body,
                    merchant_uuid: account.merchant_uuid,
                    roles: account.roles
                };
                functions.logger.debug(text);
                return next();
            }

    } else {
        functions.logger.debug("175: " + text);
        status = 403;
        text = text ;
    }


    return res.status(status).send({
        text: text,
        data: VALID ? account : null
    })
}
