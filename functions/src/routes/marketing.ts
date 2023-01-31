import * as express from "express";
import * as functions from "firebase-functions";
import { getDocument } from "../lib/helpers/firestore";
import { klavyioAPIRequests } from "../lib/helpers/requests";
// import { sendWelcomeEmail } from "../lib/helpers/twillio";
// import { Blog } from "../lib/types/blogs";
// import * as admin from "firebase-admin";
// import * as sharp from "sharp";
// import { createDocument, getCollections, getDocument, simlpeSearch, updateDocument} from "../lib/helpers/firestore"; //, getCollections, getDocument, simlpeSearch
import { validateKey } from "./auth";
// import { divinciRequests } from "../lib/helpers/requests";
// import { fetchOrders } from "../lib/helpers/shopify";
// import { storage } from "../firebase";
// import fetch from "node-fetch";

type SendWelcomeEmail = {
    merchant_uuid: string,
    type: "POLL" | "DISCOUNT" | "NEWS_LETTER" | "STORE" | "ORDER" | "CREATE" | "",
    blo_uuid: string,
    fun_uuid: string,
    cus_uuid:  string,
    email: string,
    first_name?: string,
    last_name?: string,
}


// type Blog = {
//     id: string,
//     title: string,
//     sub_title: string,
//     collection: string,
//     original_text: string,
//     new_text: string,
//     sections: [
//         {
//             id: string,
//             type: "TEXT" | "VIDEO" | "IMAGE",
//             text: string, 
//             video: string,
//             image: string,
//             [key_name:string]: any
//         }
//     ],
//     default_media_url: string,
//     updated_at: FirebaseFirestore.Timestamp,
//     created_at: FirebaseFirestore.Timestamp,
// }

export const marketingRoutes = (app: express.Router) => {
    app.post("/marketing/email/welcome", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to creaete");
        let status = 400,
            text =  " 🚨 [ERROR]: Could not send email",
            ok = false;

        const {
            merchant_uuid,
            type,
            first_name,
            last_name,
            blo_uuid,
            email
        } = req.body as SendWelcomeEmail;

        let response = {} as any

        try {

            if (type === "POLL" ) {

                const resp = await getDocument(merchant_uuid, "blogs", blo_uuid);

                if (resp.status < 300 && resp.data) {

                    // const sections = (resp.data as Blog).sections;

                    const klav_resposnse = await klavyioAPIRequests("/profiles/", "POST", {
                        data: {
                             type: "profile",
                             attributes: {
                                  email: email,
                                  first_name: first_name,
                                  last_name: last_name
                             }
                        }
                   });

                   status = klav_resposnse.status;
                   response = klav_resposnse.data;
                    
                }
            }
            
        } catch (error) {
            functions.logger.error(' ❶ Coould not send email.');
            
        }



        if (status < 300 && response && response.data.id) {

            console.log(response);
            const final = await klavyioAPIRequests("/lists/UKNQnb/relationships/profiles/", "POST", {
                data: [
                    {
                        type: "profile",
                        id: response.data.id
                    }
                ]
            });

            console.log(final.data);
            ok = true;
            text = " 🎉 [SUCCESS]: Email created in Klavyo & linked to Popoli Press";
       }
       
       if (status == 409 && response.errors[0].meta.duplicate_profile_id) {

            console.log(response.errors[0].meta.duplicate_profile_id);
            const final = await klavyioAPIRequests("/lists/UKNQnb/relationships/profiles/", "POST", {
                data: [
                    {
                        type: "profile",
                        id: response.errors[0].meta.duplicate_profile_id
                    }
                ]
            });

            console.log(final.data);
            ok = true;
            text = " 🎉 [SUCCESS]: Email created in Klavyo & linked to Popoli Press";
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: null
        })

    });
}