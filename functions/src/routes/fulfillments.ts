import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { createDocument, getCollections, getDocument, getPaginatedCollections } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { Fulfillment } from "../lib/types/fulfillments";
import { writeFileSync } from "fs";
import { getPrinters } from "unix-print";
import * as fs from "fs"


import { exec } from "child_process";
import * as util from "util";
export const execAsync = util.promisify(exec);

export default async function customPrint(
    file: string,
    printer?: string,
    options?: string[]
  ): Promise<{ stdout: string; stderr: string; [any: string]: any}> {
    if (!file) throw "No file specified";
    if (!fs.existsSync(file)) throw "No such file";
    
    const args = [];
    if (printer) {
      args.push(`-d "${printer}"`);
    }
    if (options) {
      if (!Array.isArray(options))
        throw "options should be an array";
      options.forEach((arg) => args.push(arg));
    }
    args.push('"' + file +'"');
    console.log("🖨️ -> ");
    console.log(`lp ${args.join(" ")}`);
  
    return execAsync(`lp ${args.join(" ")}`);
}


export const fulfillmentRoutes = (app: express.Router) => {
    app.post("/fulfillments/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to create fulfillment");
        let status = 200,
            text = "SUCCESS: Fulfillments document succesffully created 👽",
            result: string = "",
            ok = true;

        // Merchant uuid
        const merchant_uuid: string = req.body.merchant_uuid;

        // Data to push
        let fulfillments: Fulfillment = req.body.fulfillments;

        // TODO: SPECIAL SCOPE ACCESS CHECK

        fulfillments = {
            ...fulfillments,
            updated_at: admin?.firestore?.Timestamp?.now(),
            created_at: admin?.firestore?.Timestamp?.now(),
            merchant_uuid: merchant_uuid
        } 

        // Create fulfillment document 
        try {
            const response = await createDocument(merchant_uuid, "fulfillments", "ful_", fulfillments);

            // data check && set
            if (response?.status < 300 && response?.data) {
                result = response?.data?.id;
            }
            functions.logger.debug(" => Document created");
            
        } catch (e) {
            text = "[ERROR]: Likely couldnt create a fulfillment document";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }   
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                ful_uuid: result
            }
        })
    });

    app.post("/fulfillments", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Fulfillments(s) being fetched ");
        let status = 200,
            text = "SUCCESS: Fulfillments(s) sucessfully fetched ✅",
            result: Fulfillment[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;

        // Customer Data
        const ful_uuid: string = req.body.ful_uuid;

        // TODO: Sanatize scopes && data

        try {

            if (ful_uuid === "") {
                const response = await getCollections(merchant_uuid, "fulfillments");
                if (response?.data?.collection && response.status < 300) {
                    result = response?.data?.collection;
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            } else {
                const response = await getDocument(merchant_uuid, "fulfillments", ful_uuid);
                if (response?.data && response.status < 300) {
                    result = [response?.data as Fulfillment];
                    size = response?.data?.size ? response?.data?.size : 1;
                }
            }

        } catch (e) {
            text = "ERROR: Likely a problem fetching a fulfillment(s)";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                fulfillments: result
            }
        })
    });


    app.post("/fulfillments/print", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [FULLFILLMENT_ROUTE] Started & ready to be printed 🖨️ ");
        let status = 200,
            text = "SUCCESS: Fulfillments(s) sucessfully fetched ✅",
            result: Fulfillment[] = [],
            size = 0,
            ok = true;

        // Customer Data
        const url: string = req.body.url;

        if (url !== "") {

            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const file = Buffer.from(buffer);


            const filePath = "./label_file.png";
            writeFileSync(filePath, file);
            functions.logger.debug(" ====> WROTE FILE  🎉 ");
            
            const printes_response = await customPrint(filePath, "Printer_ThermalPrinter", ["-n 1", "-o media=4x6in ", "-o orientation-requested=1", "-o fit-to-page "]);
            functions.logger.debug(" ====> FULFILLMENT PRINTED.");
            console.log(printes_response);
    
        }

        const printers = await getPrinters();
        functions.logger.debug(" ====> PRINTERS.");
        console.log(printers);


        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                fulfillments: result
            }
        })
    });

    

    /**
     * Search & return users: 
     */
    app.post("/fulfillments/next", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [FULLFILMENT]: Fulfillments Paginate Next Start Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: Fulfillments sucessfully fetched",
            result: Fulfillment[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;
        const seconds = req.body.start | 0;
        functions.logger.debug(seconds);

        try {

            const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
            functions.logger.debug(start);

            const response = await getPaginatedCollections(merchant_uuid, "fulfillments", start);
            if (response?.data?.collection && response.status < 300) {
                result = response?.data?.collection;
                size = response?.data?.size ? response?.data?.size : 1;
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem fetching a fulfillments";
            status = 500;
            ok = false;
            functions.logger.error(text);
            throw new Error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                fulfillments: result
            }
        })
    });
    
}