import * as express from "express";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createDocument, createDocumentWthId, getCollections, getDocument, updateDocument } from "../lib/helpers/firestore";
import { validateKey} from "./auth";
import { Product, ShopifyProduct, Variant} from "../lib/types/products";
import { shopifyRequest } from "../lib/helpers/shopify";

export type ShopifySearch = {
    search: string;
    merchant_uuid: string;
}
export const productRoutes = (app: express.Router) => {

    
    // Create Product for Impowered paltform 
    app.post('/products/search/shopify', validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.info(" ✅ [PRODUCT]: Create Product using Shopify Route Started. ");
        let status = 200, text = "🤑 [SUCCESS]: Products searched form Shopify ", data: {
                products: Product[]
            } | any = null;

        const {
            search,
            merchant_uuid
        } = req.body as ShopifySearch;

        console.log(search)
        try {

            const response = await shopifyRequest(`products.json?title=${search}`, "GET");

            if (response.ok) {
                data = await response.json()
                console.log(data)
            } else {
                data = await response.json()
                console.log(data)
            }
            
        } catch (error) {
            // Log the error and return a server error response
            functions.logger.error(error);
            text = '[ERROR]: Likely internal problem 🔥 - Creating document';
            status = 500;
        }


        const product_id = "pro_" + crypto.randomBytes(10).toString('hex').substring(0,10);
        let product: Product= {} as Product;
        
        if (data?.products && data?.products.length > 0) {
            const shopify_product = data?.products[0] as unknown as ShopifyProduct;

            const new_variants: Variant[] = [] as Variant[];

            let price = 0;
            let weight = 0;
            let qty = 0;
            shopify_product.variants?.forEach((v) => {
                price = (Number(v.price)*100);
                weight = ((v.weight/10)/16);
                qty = v.inventory_quantity;
                new_variants.push({
                    product_id: product_id,
                    variant_id: "var_" + crypto.randomBytes(10).toString('hex'),
                    sku: v.sku,
                    compare_at: (Number(v.compare_at_price)*100),
                    price:(Number(v.price)*100),
                    options1: v.option1,
                    options2: v.option2,
                    options3: v.option3 || "",
                    quantity: v.inventory_quantity,
                    high_risk: false,
                    title: v.title,
                    weight: ((weight/10)/16),
                    compare_at_price: (Number(v.compare_at_price)*100),
                    status: true,
                    image_url: shopify_product.image.src,
                    inventory: v.inventory_quantity,
                    external_id: v.id,
                    external_type: "SHOPIFY",
                    updated_at: admin.firestore.Timestamp.now(),
                    created_at: admin.firestore.Timestamp.now(),
                })
            })

            product = {
                ...product,
                high_risk: false,
                title: shopify_product.title,
                handle: shopify_product.handle,
                price: price,
                description: shopify_product.description ? shopify_product.description : shopify_product.body_html ? shopify_product.body_html : "",
                compare_at_price: 0,
                quantity: qty,
                weight: weight,
                status: true,
                id: product_id,
                is_digital: true,
                sell_overstock: true,
                requires_shipping: true,
                tags: String(shopify_product.tags).split(","),
                collections: [],
                option1: shopify_product.options[0] ? shopify_product.options[0].name : "",
                option2: shopify_product.options[1] ? shopify_product.options[1].name : "",
                option3: shopify_product.options[2] ? shopify_product.options[2].name : "",
                options: {
                    options1: shopify_product.options[0] ? shopify_product.options[0].values : [],
                    options2: shopify_product.options[1] ? shopify_product.options[1].values : [],
                    options3: shopify_product.options[2] ? shopify_product.options[2].values : [],
                },
                images: [
                    {
                        url: shopify_product.image.src,
                        id: "img_" + crypto.randomBytes(10).toString('hex'),
                        alt: ""
                    }
                ],
                videos: [],
                variants: new_variants || [],
                sku: "",
                external_id: shopify_product.id,
                external_type: "SHOPIFY",
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
            } as Product;
        }

        try {

        
            const response = await createDocumentWthId(merchant_uuid, "products", product_id, product)

            if (response.status < 300) {
                data = response
            }
        } catch (e) {
            
        }
        res.status(status).json({
            text: text,
            data: data
        });
    })
    // Create Product for Impowered paltform 
    app.post('/products/create', validateKey, async (req: express.Request, res: express.Response) => {
        let status = 200, text = "🤑 [SUCCESS]: Product created ", data: string | null = null;

        const { merchant_uuid, product: new_data } = req.body;

        const shopify_product = new_data as Product;

        const new_variants: Variant[] = [] as Variant[];

        shopify_product.variants?.forEach((v) => {
            new_variants.push({
                ...v,
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
            })
        })

        try {
            functions.logger.debug(' ====> [PRODUCT CREATE]');
            // Destructure the required data from the request body
            functions.logger.debug(' => DATA ', new_data);

            // Create the product object with the new data and the current timestamps
            const product: Product = {
                ...new_data,
                merchant_uuid: merchant_uuid,
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
                variants: new_variants && new_variants,
                status: true
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
                    status = 200;
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
                merchant_uuid: merchant_uuid,
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