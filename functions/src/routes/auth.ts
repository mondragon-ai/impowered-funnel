import * as express from "express";
import * as xssFilters from "xss-filters";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateAPIKey } from "../lib/helpers/auth/auth";
import { createAppSessions, getSessionAccount, updateSessions } from "../lib/helpers/firestore";
import { AppSession } from "../lib/types/Sessions";
import { decrypt } from "../lib/helpers/algorithms";
import { chargeMerchant } from "../lib/helpers/stripe";

export const authRoutes = (app: express.Router) => {

    app.post("/sessions/create", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [SESSIONS] - Start Session Validation Route');
        let text = "ERROR: Likely internal prolem 🔥", status= 500, result: AppSession | any = null;

        const merchant_uuid = req.body.merchant_uuid || "50rAgweT9PoQKs5u5o7t";

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
            is_charging: true,
            is_valid: true,
            billing: {
                charge_monthly: 1400,
                charge_rate: 0,
                time: Math.floor(new Date().getTime())
            },
            roles: ["STOREFRONT"]
        } as AppSession;

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
    let text = " 🚨 [ERROR]: Likely oAuth problem problems. ",
        status= 401;

    let cyrpted = req.header('impowered-api-key') as string; 
    functions.logger.debug(" ✅ [SESSIONS] - Start Validation Route: " + cyrpted);

    // let api_key = "";
    // let account: AppSession | null = null;
    
    const {account, api_key} = await getSessionAndAPI(cyrpted, text, status)

    let VALID = true;

    let update_session = {
        ...account
    } as AppSession;

    if (account !== null) {
        
            // Validate dev ? LOCALHOST && dev_key ? serve :: err
            if (account.api_key.includes("test_") && api_key !==  account.dev_api_key) {
                functions.logger.warn(" ❶ Dev host & dev key dont match");
                VALID = false;
                text = text + " - dev host & dev key dont match"
                status = 400;
            }

            const billing_range = (account.billing.time) + (1000 * 60 * 60 * 24 * 30);

            // Validate Usage w/ max of 999 / min
            if (Math.floor((new Date().getTime())) >= billing_range) {
                VALID = false;
                text = text + " - Billing Is not Valid"
                functions.logger.warn(text);

                update_session =  {
                    ...update_session,
                    is_charging: true,
                    updated_at: admin.firestore.Timestamp.now(),
                    usage: {
                        count: (update_session.usage?.count as number) + 1,
                        time: update_session.usage?.time
                    }
                };

                updateSessions(api_key,{
                    ...update_session,
                    is_charging: true,
                    updated_at: admin.firestore.Timestamp.now(),
                    usage: {
                        count: (update_session.usage?.count as number) + 1,
                        time: update_session.usage?.time
                    }
                });

                if (!account.is_charging) {
                    const response = await chargeMerchant(
                        account.merchant_uuid,
                        account.owner.email,
                        (account.billing.charge_rate + account.billing.charge_monthly)
                    );
    
                    if (response !== "") {
                        update_session =  {
                            ...update_session,
                            is_charging: false,
                            updated_at: admin.firestore.Timestamp.now(),
                            billing: {
                                charge_monthly: 0,
                                charge_rate: 0,
                                time:  Math.floor((new Date().getTime()))
                            }
                        };
                    } else {
                        VALID = false
                        updateSessions(api_key,{
                            ...update_session,
                            is_charging: false,
                            is_valid: false,
                            updated_at: admin.firestore.Timestamp.now(),
                        });
                        text = text + `${text} - Merchant Needs To Pay`
                        status = 405;
                        functions.logger.warn(text);
                    }
                }
            } else {
                console.log("[BILLING] Date in seconds: ", billing_range, ".")
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
                functions.logger.warn(" ❶ wrong key / host match");
                VALID = false
                text = text + `${text} - host & key do not match`
                status = 400;
            };

            const session_range = (account.usage.time) + 5000;

            // Validate Usage w/ max of 999 / 5 sec
            if (Math.floor((new Date().getTime())) < session_range) {

                if (account.usage.count >= 999) {
                    functions.logger.warn(" ❶ rate limit hit");
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
            };

            if (VALID && !update_session?.is_charging){
                text = " 🎉 [SUCCESS]: Session validated 🔑";
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
                    roles: account.roles,
                    owner: account.owner
                };
                functions.logger.info(text);
                return next();
            }

    } else {
        functions.logger.error("" + text);
        status = 403;
        text = text ;
    }


    return res.status(status).send({
        text: text,
        data: VALID ? account : null
    })
}

export const getSessionAndAPI = async (
    cyrpted: string,
    text: string,
    status: number
) => {

    // Decrypt token from header
    let token = "";
    let account: AppSession | null = null;

    try {
        token = cyrpted == "19uq99myrxd6jmp19k5mygo5d461l0" ? "19uq99myrxd6jmp19k5mygo5d461l0" : decrypt(cyrpted);
    } catch (error) {
        
    }

    let api_key: string = "";

    try {
        api_key = xssFilters.inHTMLData(token);
        const response = await getSessionAccount(api_key);

        if (response.status < 300) {
            account = response.data;
        } else {
            text = text + response.text;
            status = response.status;
        }

    } catch (e) {
        status = 404;
        text = text + " - cant find session document. Check API KEYS";
    }

    return {account, api_key}

}
