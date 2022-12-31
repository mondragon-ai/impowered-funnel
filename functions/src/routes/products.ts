import * as express from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createDocument, getCollections, getDocument, updateDocument } from "../lib/helpers/firestore";
import { validateKey} from "./auth";
import { Product} from "../lib/types/products";

export const productRoutes = (app: express.Router) => {

    // Create Product for Impowered paltform 
    app.post('/products/create', async (req: express.Request, res: express.Response) => {
        let status = 200, text = "🤑 [SUCCESS]: Product created ", data: string | null = null;
        try {
            functions.logger.debug(' ====> [PRODUCT CREATE]');
            // Destructure the required data from the request body
            const { merchant_uuid, product: new_data } = req.body;
            functions.logger.debug(' => DATA ', new_data);

            // Create the product object with the new data and the current timestamps
            const product: Product = {
                ...new_data,
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now()
            } as Product;

            // Call the createDocument function to create the product document
            const response = await createDocument(merchant_uuid, 'products', 'pro_', product);

            if (response.status < 300 && response.data) {
                // Return a success response if the document was created successfully
                data = response.data.id
            }
        } catch (error) {
            // Log the error and return a server error response
            functions.logger.error(error);
            text = '[ERROR]: Likely internal problem 🔥 - Creating document';
            status = 500;
        }
        res.status(status).json({
            text: text,
            data: data
        });
    });

    // Fetch products using imPowered API_KEY
    app.post("/products", validateKey, async (req: express.Request, res: express.Response) => {
        // Destructure the required data from the request body
        const { merchant_uuid, product_uuid } = req.body;
    
        let text = '[SUCCESS]: Products fetched 📦',
        status = 500,
        result: Product[] | null = null,
        size = 0,
        ok = true;

        try {
            functions.logger.debug(' ====> [FETCH PRODUCT]');
            if (product_uuid === '') {
                // Get all products if product_uuid is not provided
                const response = await getCollections(merchant_uuid, 'products');
            
                if (response.status < 300 && response.data) {
                    result = response.data.collection;
                    size = response.data.size;
                    functions.logger.debug(' ====> [STATUS] - < 300');
                }
                if (response.status == 420) {
                    functions.logger.debug(' ====> [STATUS] - 422');
                    // Return the response
                    status = 422;
                    text = "[SUCCESS]: " +  response.text;
                    size = 0;
                    result = null;
                }
            } else {
                // Get a single product if product_uuid is provided
                const response = await getDocument(merchant_uuid, 'products', product_uuid);
            
                if (response.status < 300 && response.data !== undefined) {
                    result = [response.data as Product];
                    status = 201;
                }
            }
        } catch (error) {
            // Log the error and return a server error response
            functions.logger.error(`${text} - fetching products.`);
            status = 500;
            text = "[ERROR]: Could not fetch product" + (product_uuid === "" ? "s" : "") + " 🥲" ;
            result = null;
        }
        // Return the response
        res.status(status).json({
            ok,
            text,
            data: {
                size,
                result
            }
        });
    });

    // Update products using imPowered API_KEY
    app.post("/products/update", validateKey, async (req: express.Request, res: express.Response) => {
        let status = 200, text = "🤑 [SUCCESS]: Product created ", data: string | null = null, ok = true;
        try {
            functions.logger.debug(' ====> [PRODUCT CREATE]');
            // Destructure the required data from the request body
            const { merchant_uuid, product: new_data } = req.body;
            functions.logger.debug(' => [DATA] ', new_data);

            // Create the product object with the new data and the current timestamps
            const product: Product = {
                ...new_data,
                updated_at: admin.firestore.Timestamp.now(),
            } as Product;

            // Call the createDocument function to create the product document
            const response = await updateDocument(merchant_uuid, 'products', product.id, product);

            if (response.status > 300) {
                // Return a success response if the document was created successfully
                ok = false;
                text = '[ERROR]: Likely internal problem 🔥 ' + 
                    '  - Creating document';
                status = 400;
            }
        } catch (error) {
            // Log the error and return a server error response
            functions.logger.error(error);
            text = '[ERROR]: Likely internal problem 🔥 ' + 
            '  - Creating document';
            status = 500;
            ok = false;
        }
        res.status(status).json({
            ok: ok,
            text: text,
            data: data
        });
    });
}