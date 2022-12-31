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
        
        // Parse the JSON object
        const jsonObject = JSON.parse('{"orderId": 12345, "customerName": "John Doe", "items": [{"name": "item1", "quantity": 2}, {"name": "item2", "quantity": 1}]}');

        // Create a string representation of the JSON object
        let jsonString = '';
        jsonString += `Order ID: ${jsonObject.orderId}\n`;
        jsonString += `Customer Name: ${jsonObject.customerName}\n`;
        jsonString += 'Items:\n';

        if (jsonObject.items) {
            const items = jsonObject.items as {
                name: "",
                quantity: ""
            }[];

            items.forEach((item) => {
                jsonString += `- ${item.name} (${item.quantity})\n`;
            });
        }

        console.log('\n\n\n => Start file write');
        // Write the string representation to a .txt file
        await fs.writeFile('./order.txt', jsonString, (err) => {

            if (err) {
                console.error("\n\n\n" + err);
            } else {
                console.log('\n\n\nFile saved successfully!');
            }
        });
        
        // Upload the file to GPT-3 for training
        try {
            setTimeout(async () => {
                console.log('\n\n\n => Upload file');
                const response = await openAPIRequests('/files', "POST", {
                    file: fs.createReadStream('./order.txt'),
                    purpose: "fine-tune"
                });
                // const data = fs.readFileSync('./order.txt');

                console.log('\n\n\n => open AI response');
                console.log(fs.createReadStream('./order.txt'));
                console.log(response);

            }, 500)

        } catch (error) {
            console.error(error);
            text = "ERROR: Failed to upload training data."
        }
    
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: null
        })
    });

}