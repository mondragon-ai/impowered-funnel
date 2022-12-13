import * as express from "express";
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
// import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
// import { Fulfillment } from "../lib/types/fulfillments";

export const fulfillmentRoutes = (app: express.Router) => {
    app.post("/fulfillments/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create subscription");
        let status = 200,
            text = "SUCCESS: Subscsription document succesffully created 👽",
            result: string = "",
            ok = true;


        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                sub_uuid: result
            }
        })
    });
}