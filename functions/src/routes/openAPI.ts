import * as express from "express";
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
// import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
// import { validateKey } from "./auth";
// import { Fulfillment } from "../lib/types/fulfillments";const express = require('express');
import * as fs from "fs"
import { openAPIRequests } from "../lib/helpers/requests";

export const openAPIRoutes = (app: express.Router) => {
    app.post("/openAPI/upload", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to upload data to train a model for imPowered. 👽 ");
        let status = 200,
            text = "SUCCESS: Uploaded data to train a model for imPowered 👽",
            ok = true;


        // Load the JSON data from a file or string
        const jsonData = [
            {
                text: "order number for angel mondragon with email angel@gmail.com is #SH-91273bi1"
            },
            {
                text: "order number for Darth Maul with email darth.maul@gmail.com is #SH-239IH2hE"
            },
            {
                text: "order number for Obi Kanobi with email obi@gmail.com is #SH-O234IH"
            },
            {
                text: "order number for Darth Vader with email darth.vader@gmail.com is #SH-HB93489"
            }
        ]
        // Extract the text data from the JSON objects
        const textData = jsonData.map((obj: any) => obj.text);
        
        // Save the text data to a file in the appropriate format for GPT-3
        fs.writeFileSync('gpt3_data.txt', textData.join('\n'));

        const open = await openAPIRequests("/files", "POST", {
            purpose: "fine-tune",
            file: fs.createReadStream('gpt3_data.txt')
        });

        console.log(open)
    
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                open: open,
                textData: textData
            }
        })
    });

}