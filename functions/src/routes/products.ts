// import * as admin from "firebase-admin";
// import * as functions from "firebase-functions";
import * as express from "express";

export const productRoutes = (app: express.Router) => {
    app.post("/products/create", async (req: express.Request, res: express.Response) => {
        let text = "ERROR: Likely internal prolem 🔥", status= 500;

        const body = req.body;
        console.log(body);

        res.status(status).json({
            text: text
        })
    })
}