import * as express from "express";
import * as xssFilters from "xss-filters";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as functions from "firebase-functions";
import { generateAPIKey } from "../lib/helpers/auth/auth";
import { createAppSessions, getMerchant, getSessionAccount, updateMerchant, updateSessions } from "../lib/helpers/firestore";
import { AppSession } from "../lib/types/Sessions";
import { decryptToken } from "../lib/helpers/algorithms";
import { chargeMerchantStripe } from "../lib/helpers/merchants/chargeMerchant";


import { createClient } from 'redis';
import { Merchant } from "../lib/types/merchants";

// 
const client = createClient({
    password: 'd2CXNfzCFNuZpK2EN1n8fZRAJPBy7vzU',
    socket: {
        host: 'redis-17602.c279.us-central1-1.gce.cloud.redislabs.com',
        port: 17602
    }
});

export const authRoutes = (app: express.Router) => {

    app.post("/sessions/create", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(' ✅ [SESSIONS] - Start Session Validation Route');
        let text = "ERROR: Likely internal prolem 🔥", status= 500, result: AppSession | any = null;

        const merchant_uuid = req.body.merchant_uuid || "50rAgweT9PoQKs5u5o7t";
        const roles = req.body.roles || ["STORE_FRONT"];
        const session_type = req.body.session_type || "PLATFORM"

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
            billing: [{
                charge_monthly: 1400,
                charge_rate: 0,
                time:  Math.floor((new Date().getTime())),
                service_type: "PLATFORM",
                title: "Base Platform Services",
                id: "bil_"+crypto.randomBytes(10).toString('hex')
            }],
            roles: roles ? roles : ["STOREFRONT"],
            session_type: session_type ? session_type : "PLATFROM",
        } as AppSession;

        try {
            const response = await createAppSessions(API_KEY as string, sessions,"",["STORE_FRONT"],"PLATFORM");

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

// export const validateKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     let text = " 🚨 [ERROR]: Likely oAuth problem problems. ",
//         status= 401,
//         account: AppSession | null = null;

//     let cyrpted = req.header('impowered-api-key') as string; 
//     functions.logger.debug(" ✅ [SESSIONS] - Start Validation Route: " + cyrpted);

//     // Decrypt token from header
//     let token = "";
//     let decrypted_token = "";

//     try {
//         decrypted_token = decryptToken(cyrpted);
//     } catch (error) {
        
//     }
//     console.log("[DECRYPTED]: ", decrypted_token)
//     token = cyrpted == "19uq99myrxd6jmp19k5mygo5d461l0" ? "19uq99myrxd6jmp19k5mygo5d461l0" : (decrypted_token ? decrypted_token : "");

//     console.log("[TOKEN]: ", token)

//     let api_key = "";

//     try {
//         api_key = xssFilters.inHTMLData(token);
//         const response = await getSessionAccount(api_key);
//         console.log("[ACCOUNT]: ", response)

//         if (response.status < 300) {
//             account = response.data;
//         } else {
//             text = text + response.text;
//             status = response.status;
//         }

//     } catch (e) {
//         status = 404;
//         text = text + " - cant find session document. Check API KEYS";
//     }

//     let update_session = {
//         ...account,
//     } as AppSession

//     let VALID = true;

//     if (account !== null) {
        
//             // Validate dev ? LOCALHOST && dev_key ? serve :: err
//             if (account.api_key.includes("test_") && api_key !==  account.dev_api_key) {
//                 functions.logger.warn(" ❶ Dev host & dev key dont match");
//                 VALID = false;
//                 text = text + " - dev host & dev key dont match"
//                 status = 400;
//             }

//             const billing_range = (account.billing.time) + (1000 * 60 * 60 * 24 * 30);

//             // Validate Usage w/ max of 999 / min
//             if (Math.floor((new Date().getTime())) >= billing_range) {
//                 VALID = false;
//                 text = text + " - Billing Is not Valid"
//                 functions.logger.warn(text);

//                 updateSessions(api_key,{
//                     ...update_session,
//                     is_charging: true,
//                     updated_at: admin.firestore.Timestamp.now(),
//                     usage: {
//                         count: (update_session.usage?.count as number) + 1,
//                         time: update_session.usage?.time
//                     }
//                 });

//                 if (!account.is_charging) {
//                     const response = await chargeMerchant(
//                         account.merchant_uuid,
//                         account.owner.email,
//                         (account.billing.charge_rate + account.billing.charge_monthly)
//                     );
    
//                     if (response !== "") {
//                         update_session =  {
//                             ...update_session,
//                             is_charging: true,
//                             updated_at: admin.firestore.Timestamp.now(),
//                             billing: {
//                                 charge_monthly: 0,
//                                 charge_rate: 0,
//                                 time:  Math.floor((new Date().getTime()))
//                             }
//                         };
//                     } else {
//                         VALID = false
//                         updateSessions(api_key,{
//                             ...update_session,
//                             is_charging: false,
//                             is_valid: false,
//                             updated_at: admin.firestore.Timestamp.now(),
//                         });
//                         text = text + `${text} - Merchant Needs To Pay`
//                         status = 405;
//                         functions.logger.warn(text);
//                     }
//                 }
//             } else {
//                 console.log("[BILLING] Date in seconds: ", billing_range, ".")
//             }

//             // Validate Host w/ Key ? LOCALHOST || {{ host }} 
//             // if (host === "localhost" && !account.api_key.includes("test_")) {
//             //     functions.logger.debug(" => Dev host & live key");
//             //     VALID = false
//             //     text = text + " - dev host & live key."
//             //     status = 400;
                
//             // } else {
//             //     if (host !== account.host || api_key !==  account.api_key) {
//             //         functions.logger.debug(" =>  wrong key / host match");
//             //         VALID = false
//             //         text = text + " - host & key match"
//             //         status = 400;
//             //     } 
//             // }

//             if (api_key !==  account.api_key) {
//                 functions.logger.warn(" ❶ wrong key / host match");
//                 VALID = false
//                 text = text + `${text} - host & key do not match`
//                 status = 400;
//             };

//             const session_range = (account.usage.time) + 5000;

//             // Validate Usage w/ max of 999 / min
//             if (Math.floor((new Date().getTime())) < session_range) {

//                 if (account.usage.count >= 999) {
//                     functions.logger.warn(" ❶ rate limit hit");
//                     text = text + " - rate limit hit.";
//                     VALID = false;
//                     status = 400;
//                 }
//             } else {

//                 update_session =  {
//                     ...update_session,
//                     updated_at: admin.firestore.Timestamp.now(),
//                     usage: {
//                         count: 0,
//                         time:  Math.floor((new Date().getTime()))
//                     }
//                 };
//                 VALID = true;
//                 status = 200;
//             };

//             if (VALID && !account.is_charging){
//                 text = " 🎉 [SUCCESS]: Session validated 🔑. "
//                 status = 200;
//                 await updateSessions(api_key, {
//                     ...update_session,
//                     updated_at: admin.firestore.Timestamp.now(),
//                     usage: {
//                         count: (update_session.usage?.count as number) + 1,
//                         time: update_session.usage?.time
//                     }
//                 });
//                 req.body = {
//                     ...req.body,
//                     merchant_uuid: account.merchant_uuid,
//                     roles: account.roles,
//                     owner: account.owner
//                 };
//                 functions.logger.info(text);
//                 return next();
//             }

//     } else {
//         functions.logger.error("" + text);
//         status = 403;
//         text = text ;
//     }


//     return res.status(status).send({
//         text: text,
//         data: VALID ? account : null
//     })
// }


const getToken = (encrypted: string): string => {
    try {
        return encrypted === "19uq99myrxd6jmp19k5mygo5d461l0" ? encrypted : decryptToken(encrypted);
    } catch (error) {
        return "";
    }
};



export const getSessionAccounRedis = async (
    merchant_uid: string,
) => {

    let text = "🚨 [ERROR]: Likely oAuth problem problems.";

    client.on('error', err => console.log('Redis Client Error', err));
    
    await client.connect();
    

                    
    await client.set("mer_4cc661b2c2a3b66a7388", "");
    const value = await client.get("mer_4cc661b2c2a3b66a7388");
    await client.disconnect();
    // return either result 
    return {
        text:  value ? " 🎉 [SUCESS] Posted & Fetched" : text,
        status:  value ? 200 : 404,
        data: value
    }
}

export const getMerchantRedis = async (
    merchant_uid: string,
) => {

    let text = "🚨 [ERROR]: Likely oAuth problem problems.";

    client.on('error', err => console.log('Redis Client Error', err));
    
    await client.connect();
    const value = await client.get(merchant_uid);
    if (value !== null && value !== "") {
        const data  = await JSON.parse(value);
        await client.disconnect();

        return {
            text:  value ? " 🎉 [SUCESS] Redis Merchant Fethed"  : text,
            status:  value ? 200 : 404,
            data: data as Merchant
        }
    } else {

        const response = await getMerchant(merchant_uid);

        if (response.status >= 300 && !response.data) {
            throw new Error(text + "Merchant doesn't exist");
            
        }
        await client.set(merchant_uid, JSON.stringify(response.data));
        // return either result 
        return {
            text:  response.status < 300 ? " 🎉 [SUCESS] Merchant Fetched & Redis Merchant Created" : text,
            status:  response.status < 300 ? 200 : 404,
            data: response.data as Merchant
        }

    }
}



export const validateKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let text = "🚨 [ERROR]: Likely oAuth problem problems.";
    let status = 401;
    const encrypted = req.header('impowered-api-key') as string;
    const token = getToken(encrypted);
    const api_key = xssFilters.inHTMLData(token);
    console.log(api_key)
    // const resp = await getSessionAccounRedis("")
    // console.log(resp)
    const response = await getSessionAccount(api_key);

    let account: AppSession | null = null
    if (response.status < 300) {
        account = response.data;
    } else {
        text = text + response.text;
        status = response.status;
    }
    console.log(response)
    let decrypted_merchant = "";

    try {
        decrypted_merchant = account?.merchant_uuid == "50rAgweT9PoQKs5u5o7t"  ? account?.merchant_uuid :  decryptToken(account?.merchant_uuid as string);
    } catch (error) { }
    console.log(decrypted_merchant)

    if (account !== null) {
        const {isValid, update_session} = await validateAccount(account, account, api_key, text, status, account.session_type);

        if (isValid && !account.is_charging) {
            text = "🎉 [SUCCESS]: Session validated 🔑. ";
            status = 200;
            await updateSessions(api_key, {
                ...update_session,
                updated_at: admin.firestore.Timestamp.now(),
            });
            req.body = {
                ...req.body,
                merchant_uuid: decrypted_merchant,
                token: encrypted,
                roles: account.roles,
                owner: account.owner,
                billing: update_session.billing
            };
            functions.logger.info(text);
            return next();
        }

    } else {
        functions.logger.error("" + text);
        status = 403;
        text = text;
    }

    return res.status(status).send({
        text: text,
        data: status < 300 ? account : null
    });
}

export const validateAccount = async (
    account: AppSession,
    update_session: AppSession,
    api_key: string,
    text: string,
    status: number,
    session_type: string
): Promise<{isValid: boolean, update_session: AppSession}> => {
    let VALID = true;

    let decrypted_merchant = "";

    try {
        decrypted_merchant = decryptToken(account.merchant_uuid);
    } catch (error) { }

    // Validate dev ? LOCALHOST && dev_key ? serve :: err
    if (account.api_key.includes("test_") && api_key !==  account.dev_api_key) {
        functions.logger.warn(" ❶ Dev host & dev key dont match");
        VALID = false;
        text = text + " - dev host & dev key dont match"
        status = 400;
    }

    // Make Sure keys match
    if (api_key !==  account.api_key) {
        functions.logger.warn(" ❶ wrong key / host match");
        VALID = false
        text = text + `${text} - host & key do not match`
        status = 400;
    };

    const merchant_res = await getMerchantRedis(decrypted_merchant);

    if (merchant_res.status >= 300 && merchant_res.data) {
        throw new Error(text);
    }

    const merchant = merchant_res.data as Merchant;

    console.log("MERCHANT")
    console.log(merchant)

    const billings = merchant && merchant.billing.length >= 0 ? merchant.billing :  merchant.billing ?  [(merchant.billing as any)] : []

    update_session = {
        ...update_session,
        billing: billings,
        updated_at: admin.firestore.Timestamp.now()
    }
    
    const processBilling = async (billing: {
        amount: number;
        time: number;
        service_type: "API_KEY" | "PLATFORM" | "MICRO";
        title: string;
        id: string;
        name: string;
    }): Promise<void> => {

        const billing_range = (billing.time) + (1000 * 60 * 60 * 24 * 30);

        // Validate Merchant Account has Paid
        if (Math.floor((new Date().getTime())) >= billing_range) {
            VALID = false;
            functions.logger.warn(text + "  " + (Math.floor((new Date().getTime())) >= billing_range));
            functions.logger.warn(Math.floor((new Date().getTime()))  + "   " + billing.time);
            functions.logger.warn(new Date().toLocaleString() + " " + new Date(billing_range).toLocaleString());
            functions.logger.warn(new Date().getTime())
            functions.logger.warn(billing);

            updateSessions(api_key,{
                ...update_session,
                is_charging: true,
                updated_at: admin.firestore.Timestamp.now(),
                usage: {
                    count: (update_session.usage?.count as number) + 1,
                    time: update_session.usage?.time
                }
            });

            // If not charging Charge
            if (!account.is_charging) {
                const response = await chargeMerchantStripe(
                    decrypted_merchant,
                    (billing.amount),
                    session_type
                );

                // If Successfull prep session and continue session
                if (response.STRIPE_PI_ID !== "") {
                    update_session =  {
                        ...update_session,
                        is_charging: false,
                        is_valid: true,
                        updated_at: admin.firestore.Timestamp.now(),
                    };

                    await client.connect();

                    const new_biling = billings[0] ? billings.map(bil => {
                        if (bil.name == "PLATFORM") {
                            return bil = {
                                amount: 1400,
                                name: "PLATFORM",
                                time:  Math.floor((new Date().getTime())),
                                service_type: "PLATFORM",
                                title: "Base Platform Services",
                                id: "bil_"+crypto.randomBytes(10).toString('hex')
                            }
                        } else {
                            return bil;
                        }
                    }) : []

                    
                    await client.set(decrypted_merchant, JSON.stringify({
                        ...merchant,
                        billing: new_biling
                    }));

                    await updateMerchant(decrypted_merchant, {
                        ...merchant,
                        billing: new_biling
                    });

                    await client.disconnect();
                } else {
                    // If error update session immedietly to be in-valid
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
            console.log("[BILLING] Next Billing Date (in seconds): ", billing_range, ".")
        }
    };
  
    billings[0] && await Promise.all(billings.map((bil: any) => processBilling(bil)));

    // Last Charge Date + 30 Days
    // const billing_range = (account.billing.time) + (1000 * 60 * 60 * 24 * 30);

    

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
    // If error update session immedietly to be in-valid
    const session_range = (account.usage.time) + 5000;

    // Validate Usage w/ max of 999 / min
    if (Math.floor((new Date().getTime())) < session_range) {
        functions.logger.info("LIMIT REACHED: ", session_range);

        if (account.usage.count >= 999) {
            functions.logger.warn(" ❶ rate limit hit");
            text = text + " - rate limit hit.";
            VALID = false;
            status = 400;
        } else {
            update_session =  {
                ...update_session,
                updated_at: admin.firestore.Timestamp.now(),
                usage: {
                    count: (update_session.usage?.count as number) + 1,
                    time:  Math.floor((new Date().getTime()))
                }
            };
        }
    } else {
        functions.logger.info("NO LIMIT REACHED: ", session_range);
        update_session =  {
            ...update_session,
            updated_at: admin.firestore.Timestamp.now(),
            usage: {
                count: 0,
                time:  Math.floor((new Date().getTime()))
            }
        };
        status = 200;
    };
    if (!VALID) {
        functions.logger.warn(text);
    }

    return {isValid: VALID, update_session};
}
