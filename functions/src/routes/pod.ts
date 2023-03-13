import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sharp from "sharp";
import * as crypto from "crypto";
import { createDocument, deleteDocument, getCollections, getDocument, simlpeSearch, updateDocument } from "../lib/helpers/firestore";
import { validateKey } from "./auth";
import { createProduct, fetchOrders } from "../lib/helpers/shopify";
// import { storage } from "../firebase";
import fetch from "node-fetch";
import { divinciRequests, shineOnAPIRequests } from "../lib/helpers/requests";
import { createVariantsFromOptions } from "../lib/helpers/products/variants";
import { Product } from "../lib/types/products";
import { firestore } from "firebase-admin";

type Design = {
    id: string,
    merchant_uuid: string,
    url: string,
    sku: string,
    title: string,
    meta: {}[]
}

type DesignProduct = {
    merchant_uuid: string,
    id?: string,
    sku?: string,
    title: string,
    large_asset_url: string,
    small_asset_url: string,
    options: {
        options1: [],
        options2: [],
        options3: []
    }
    option1: string,
    option2: string,
    option3: string,
    meta: {}[],
    external?: string
    url: string
    updated_at: firestore.Timestamp
    created_at: firestore.Timestamp
}


type ShopifyOrder = {	
    "order": {
        "id": number,
        "name": string,
        "total_price": string,
        "line_items": [
        {
            "id": number,
            "admin_graphql_api_id": string,
            "fulfillable_quantity": number,
            "fulfillment_service": string,
            "fulfillment_status": null,
            "gift_card": boolean,
            "grams": number,
            "name": string,
            "price": string,
            "price_set": {
            "shop_money": {
                "amount": number,
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": number,
                "currency_code": "USD"
            }
            },
            "product_exists": true,
            "product_id": number,
            "properties": [
            {
                "name": string,
                "value": string
            },
            {
                "name": string,
                "value": string
            }
            ],
            "quantity": number,
            "requires_shipping": boolean,
            "sku": string,
            "taxable": boolean,
            "title": string,
            "total_discount": number,
            "total_discount_set": {
            "shop_money": {
                "amount": number,
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": number,
                "currency_code": "USD"
            }
            },
            "variant_id": number,
        },]
    }
}
export const podRoutes = (app: express.Router) => {
    app.post("/pod/designs/upload", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design Upload ✅");
        let status = 200,
            text = "[SUCCESS]: Design successfully uploaded 👽",
            ok = true,
            result = "";

        let {
            sku,
            merchant_uuid,
            url,
            title,
            meta
        } = req.body as Design; 

        // create paload
        const design_data = {
            sku,
            url,
            title,
            large_asset_url: url,
            small_asset_url: url,
            meta: meta ? meta : [],
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        }

        try {
            if (sku !== "" && url !== ""){
                // create document
                const response = await createDocument(merchant_uuid, "designs", "des_", design_data);
                if (response.status < 300 && response.data.id) {
                    result = response.data.id;
                }
            }
        } catch (e) {
            functions.logger.error(text)
            status = 200;
            text = " 🚨 [ERROR]: Design could not be uploaded";
            ok = true;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: result
        })
    });

    app.post("/pod/product/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [POD_ROUTE] - Started To Create Product Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: Product succesfully created 👽 ",
            ok = true;

        let {
            sku,
            id,
            merchant_uuid,
            options,
            option1,
            option2,
            option3,
            large_asset_url,
            external,
            url,
            title,
            meta
        } = req.body as DesignProduct; 

        let designs = [] as DesignProduct[]

        console.log(req.body)


        if (sku !== "" && id == "") {
            try {
                const response = await simlpeSearch(merchant_uuid, "designs", "sku", sku);

                if (response.status < 300 && response?.data?.list) {
                    response.data.list?.forEach(design => {
                        if (design.exists) {
                            const d = design.data() as DesignProduct;
                            designs.push(d);
                        }
                    })
                }
            } catch (e) {
                functions.logger.error(text)
                status = 422;
                text = " 🚨 [ERROR]: Could not fetch design with SKU.";
                ok = true;
            }
        } 


        if (id && id !== "" && sku == "") {
            try {
                const response = await getDocument(merchant_uuid, "designs", id);
    
                if (response.status < 300 && response.data) {
                    designs.push(response.data as DesignProduct);
                }
            } catch (e) {
                functions.logger.error(text)
                status = 422;
                text = " 🚨 [ERROR]: Could not fetch design with ID!.";
                ok = true;
            }
        } else {
            designs.push({
                sku,
                url,
                title,
                large_asset_url: url,
                small_asset_url: url,
                meta: meta ? meta : [],
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
                merchant_uuid: "",
                options: {
                    options1: [],
                    options2: [],
                    options3: []
                },
                option1: "",
                option2: "",
                option3: ""
            });
        }

        let product_data: Product = {} as Product;

        if (designs.length > 0 && options) {

            const img_list = url && url !== "" ? [{
                alt: "",
                id: "img_" + crypto.randomBytes(5).toString("hex").substring(0,10),
                url: url
            }] : []

            // create paload
            product_data = {
                merchant_uuid: merchant_uuid,
                id: "pro_" + crypto.randomBytes(5).toString("hex"),
                high_risk: false,
                title: designs[0].title,
                description: "",
                sku: designs[0].sku,
                price: 1075,
                status: true,
                sell_overstock: true,
                is_digital: false,
                requires_shipping: true,
                compare_at_price: 0,
                handle: designs[0].title.toLocaleLowerCase().replace(" ", "-"),
                weight: 0.06,
                quantity: 100,
                tags: [],
                collections: ["POD"],
                option1: option1 ? option1 : '',
                updated_at: admin.firestore.Timestamp.now(),
                created_at: admin.firestore.Timestamp.now(),
                option2: option2 ? option2 : '',
                option3: option3 ? option3 : "",
                variants: [],
                options: options,
                videos: [],
                images: img_list,
                external_id: "",
                external_type: ""
            };
    

            // merchant_uuid,
            // options,
            // large_asset_url,
            const variants = createVariantsFromOptions(product_data, options.options1, options.options2, options.options3);

            if (variants && variants.length > 0) {
                product_data = {
                    ...product_data,
                    variants: variants,
                };
            }
        }

        let product_id = "";

        try {

            const response = await createDocument(merchant_uuid, "products", "pro_", product_data);

            if (response.status < 300 && response.data.id) {
                product_id = response.data.id
            }
            
        } catch (error) {
            functions.logger.error(text)
            status = 400;
            text = " 🚨 [ERROR]: Could not create product.";
            ok = true;
        }

        if (designs[0].id && designs[0].id !== "") {
            try {

                await updateDocument(merchant_uuid, "designs", designs[0].id as string, {
                    ...designs[0],
                    large_asset_url: large_asset_url ? large_asset_url : designs[0].small_asset_url,
                    option1: option1 ? option1 : "",
                    option2: option2 ? option2 : "",
                    option3: option3 ? option3 : "",
                    options: options ? options : {},
                    meta: [
                        ...designs[0].meta,
                        {
                            product_id: product_id
                        }
                    ]
                } as DesignProduct);

            } catch (error) {
                functions.logger.error(text)
                status = 400;
                text = " 🚨 [ERROR]: Could not update design.";
                ok = true;
            }
        } else {

            try {
                if (sku !== "" && url !== ""){
                    // create document
                    await createDocument(merchant_uuid, "designs", "des_", {
                        ...designs[0],
                        large_asset_url: large_asset_url ? large_asset_url : designs[0].small_asset_url,
                        option1: option1 ? option1 : "",
                        option2: option2 ? option2 : "",
                        option3: option3 ? option3 : "",
                        options: options ? options : {},
                        meta: [
                            ...designs[0].meta,
                            {
                                product_id: product_id
                            }
                        ]
                    });
                }
            } catch (e) {
                functions.logger.error(text)
                status = 200;
                text = " 🚨 [ERROR]: Design could not be uploaded";
                ok = true;
            }
        }

        

        if (external && external == "SHOPIFY") {
            try {

                let variants: {
                    option1: string;
                    option2: string;
                    option3: string;
                    price: number;
                    sku: string;
                    weight: number,
                    weight_unit: "lb",
                    requires_shipping: boolean
                }[] = [];

                product_data.variants?.forEach((el) => {
                    variants.push({
                        option1: el.options1 ? el.options1 : "",
                        option2: el.options2 ? el.options2 : "",
                        option3: el.options3 ? el.options3 : "",
                        price: el.price ? (el.price / 100) : 0,
                        sku: el.sku ? el.sku : "",
                        weight: product_data.weight ? product_data.weight : 0,
                        weight_unit: "lb",
                        requires_shipping: true,
                    })
                });

                let productData = {
                    product: {
                        title: product_data.title ? product_data.title : "",
                        body_html: '',
                        vendor: 'BIGLY',
                        product_type: '',
                        tags: "POD",
                        handle: product_data.handle ? product_data.handle : "",
                        status: "active",
                        published_scope: "global", 
                        image: {},
                        images:[{
                            src: designs[0].small_asset_url ? designs[0].small_asset_url : ""
                        }],
                        options: [
                            {
                                name: option1 ? option1 : "",
                                values: options.options1 ? options.options1 : [],
                            },
                        ],
                        variants: variants,
                    },
                };

                if (option1 !== "" &&  options.options1  &&  options.options1.length > 0) {
                    productData = {
                        ...productData,
                        product: {
                            ...productData.product,
                            options: [
                                {
                                    name: option1 ? option1 : "",
                                    values: options.options1 ? options.options1 : [],
                                },
                            ],
                        },
                    }
                }


                if (option2 !== "" &&  options.options2  &&  options.options2.length > 0) {
                    productData = {
                        ...productData,
                        product: {
                            ...productData.product,
                            options: [
                                ...productData.product.options,
                                {
                                    name: option2 ,
                                    values: options.options2
                                },
                            ],
                        },
                    }
                }


                if (option3 !== "" &&  options.options3  &&  options.options3.length > 0) {
                    productData = {
                        ...productData,
                        product: {
                            ...productData.product,
                            options: [
                                ...productData.product.options,
                                {
                                    name: option3 ,
                                    values: options.options3
                                },
                            ],
                        },
                    }
                }

                const response = await createProduct(productData);
                if (response) {
                    text = text + " [SHOPIFY] - Created Product 👍🏻"
                };
            } catch (e) {
                functions.logger.error(text)
                status = 400;
                text = " 🚨 [ERROR]: Could not creaet shopify product.";
                ok = true;
            }
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: null
        })
    });

    app.post("/pod/designs/delete", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [DESIGNS] - Started Design batch delete ");
        let status = 200,
            text = " 🎉 [SUCCESS]: Design successfully deleted ",
            size = 0,
            ok = true;

        let {
            designs,
            merchant_uuid,
        } = req.body as {
            merchant_uuid: string,
            designs:  string[] ,
            meta: {}[]
        }; 

        try {

            if (designs && designs.length == 1) {
                // delete design document
                await deleteDocument(merchant_uuid, "designs", designs[0]);
            }

            if (designs && designs.length > 1) {
                // delete design document
                await Promise.all(designs.map(id => deleteDocument(merchant_uuid, "designs", id)));
            }


        } catch (e) {
            functions.logger.error(text)
            status = 200;
            text = " 🚨 [ERROR]: Design could not be deleted";
            ok = true;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                list: designs
            }
        })
    });

    app.post("/pod/designs", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design fetch ");
        let status = 200,
            text = "[SUCCESS]: Design successfully fetched 👽",
            size = 0,
            ok = true;

        let {
            des_uuid,
            merchant_uuid,
        } = req.body as {
            merchant_uuid: string,
            des_uuid: string,
            meta: {}[]
        }; 

        let designs: Design[] = [] as Design[];

        try {

            if (des_uuid && des_uuid !== "") {
                // fetch design document
                const design_res = await getDocument(merchant_uuid, "designs", des_uuid);
                if (design_res.status < 300 && design_res.data) {
                    size = 1;
                    designs = [design_res.data as Design]
                }
            }

            if (des_uuid === "") {
                // fetch design document
                const design_res = await getCollections(merchant_uuid, "designs");
                if (design_res.status < 300 && design_res.data) {
                    size = design_res.data.size;

                    design_res.data.collection?.forEach(d => {
                        designs = [
                            ...designs,
                            d
                        ]
                    })
                }
            }

        } catch (e) {
            functions.logger.error(text)
            status = 200;
            text = " 🚨 [ERROR]: Design could not be fetched";
            ok = true;
        }
        
        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                list: designs
            }
        })
    });

    app.post("/pod/designs/search", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Design fetched ✅");
        let status = 200,
            text = "[SUCCESS]: Design successfully fetched 👽",
            size = 0,
            ok = true;

        let {
            sku,
            order_number,
        } = req.body as {
            sku: string,
            order_number: string
        }; 

        const merchant_uuid = "50rAgweT9PoQKs5u5o7t";

        let designs: Design[] = [] as Design[];

        let order = {} as ShopifyOrder

        try {
            functions.logger.debug(" ====> [SKU] - Searching by SKU");
            // Search & fetch design document by sku
            const design_res = await getCollections(merchant_uuid, "designs");

            console.log(design_res)
            if (design_res.status < 300 && design_res?.data?.collection) {
                design_res?.data?.collection?.forEach(d => {
                    designs = [
                        ...designs,
                        d
                    ]
                })
            }

        } catch (e) {
            functions.logger.error(text)
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Design could not be fetched";
        }

        try {

            if (sku && sku !== "") {
                designs = [];
                functions.logger.debug(" ====> [SKU] - Searching by SKU");
                // Search & fetch design document by sku
                const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", sku);
                if (design_res.status < 300 && !design_res.data.list?.empty) {
                    design_res.data.list?.forEach(d => {
                        designs = [
                            ...designs,
                            d.data() as Design
                        ]
                    })
                }
            }

        } catch (e) {
            functions.logger.error(text)
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Design could not be fetched";
        }

        try {

            if (order_number && order_number !== "") {
                functions.logger.debug(" ====> [SHOPIFY] - Fetching Order by order number");
                const order_res = await fetchOrders(order_number);

                if (order_res && order_res !== undefined) {
                    order = order_res as ShopifyOrder;
                }
            }
            
        } catch (e) {
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Valid order number required if SKU not presented";
            functions.logger.error(text)
        }

        let sku_list: string[] = []

        if (order_number && order_number !== "" && order) {
            functions.logger.debug(" ====> [SHOPIFY] - Fetched Order");

            order.order.line_items.forEach(li => {
                sku_list = [
                    ...sku_list,
                    li.sku
                ]
            });
        }
        functions.logger.debug(" ====> [SKUS] - Extracted");


        const designs_new = await searchArray(sku_list, designs) as Design[];

        functions.logger.debug(" - [DESIGN NEW]");
        functions.logger.debug(designs_new);

        res.status(status).json({
            ok: ok,
            text: text,
            result: {
                size: size,
                list: designs_new ? designs_new : designs ? designs : []
            }
        })
    });

    app.post("/pod/poems", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Poem to Shine On Route ✅");
        let text = " ✅ [SUCCESS]: Poem successfully generated and shine on image fetched 👽",
            ok = true,
            status = 200;
            

        let {
            url,
            relation,
            name,
            isMale,
            type
        } = req.body as {
            url: string,
            relation: string,
            name: string,
            type: string,
            isMale: boolean
        }

        url = "https://firebasestorage.googleapis.com/v0/b/impowered-funnel.appspot.com/o/%2Fimages%2Ftest%2FTEMPLATES%20JLR-%20HT%20(20).png?alt=media&token=f43f5e8a-3b2e-417b-848d-b760bcb27501";

        let poem = "";

        try {

            if (name !== "" && relation !== "" && type !== "") {
                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "Generate the best short " + (type ? type : "love") + " poem, less than 26 words, for a " + (relation ? relation : "wife") +  " with the name " + (name ? name : ""),
                    temperature: 0.9,
                    max_tokens: 35,
                }); 

                if (gpt_response.status < 300 && gpt_response.data) {
                    poem = gpt_response?.data?.choices[0]?.text;
                    functions.logger.debug(poem);
                    status = 201;
                    text = " 🎉 [SUCCESS]: New poem generated. ";
                    ok = true;
                }
               
            }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }

        const lines = poem ? poem.toLocaleLowerCase().substring(4).split("\n") : [];
        let text_to_svg = "";

        console.log(lines.length)

        if (lines.length > 1) {
            lines.forEach((line, index) => {
                functions.logger.debug(" => LINE: " + line);
                text_to_svg += `<tspan x="50%" dy="1.8em" class="spanText">${line.toLocaleUpperCase()}</tspan>`;
                if (index !== lines.length - 1 && line !== '') {
                    text_to_svg += "\n"
                }
            });
        } else {
            const poemArr = poem ? poem.substring(2).split(" ") : [];

            let wpl = 7; // Words per line
            let new_line = ""; 

            poemArr.forEach((word, index) => {
                if (index < wpl - 1) {
                    new_line = new_line + " " + word;
                    functions.logger.debug(" => WORD: " + new_line);
                } 
                if (index == wpl - 1) {
                    new_line = new_line + " " + word;
                    text_to_svg += `<tspan x="50%" dy="1.8em" class="spanText">${new_line.toLocaleUpperCase()}</tspan>`;
                    if (index !== poemArr.length - 1 && word !== '') {
                        text_to_svg += "\n"
                    }
                    wpl = wpl + 7;
                    new_line = ""
                    functions.logger.debug(" => text_to_svg: " + text_to_svg);
                }
            });
            
            text_to_svg += `<tspan x="50%" dy="1.8em" class="spanText">${new_line.toLocaleUpperCase()}</tspan>`;

        }

        // MADE Evolve Sans --> FONT 28px 


        const svgText = `<svg width="1500" height="1500" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <style>
            @font-face {
                font-family: 'MADE Evolve Sans';
                src: url('../assets/MADE_Evolve_Sans.otf') format('truetype');
            }
            .title { 
                fill: black; 
                font-size: 45px;
                text-align: center;
                word-wrap: break-word;
                font-family: 'MADE Evolve Sans';
            }
            .spanText {
                font-size: 45px;
                fill: black; 
                font-family: 'MADE Evolve Sans';
                word-wrap: break-word;
            }
            </style>
            <g>
                <text x="50%" y="60%" width="500px" text-anchor="middle" class="title">
                    ${text_to_svg}
                </text>
            </g>
        </svg>`

        const svgBuffer = Buffer.from(svgText);

        // const new_text = Buffer.from(poem, "utf8");

        let img_url = "";
        let img_list = [""];

        try {
            // download image from stoage
            if (url !== "" && poem !== "") {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(" 🚨 [ERROR] - ");
                }
    
                const array_buffer = await response.arrayBuffer();

                const buffer = Buffer.from(array_buffer, "utf8");

                functions.logger.debug(" 🖼️ [IMAGE] - Fetched ");
    
                const image = sharp(buffer);
                functions.logger.debug(" 🖼️ [IMAGE] - Image -> Sharp ");
                
                
                const newImage = await image
                    .resize(1500, 1500)
                    .composite([{input: svgBuffer, gravity: "south"}])
                    .toFormat("png")
                    .toBuffer({ resolveWithObject: true })
                    .then(({ data, info }) => {
                        console.log(data);
                        console.log(info);
                        return data
                    })
                    .catch(err => console.error(err));
                
                functions.logger.debug(" 🖼️ [IMAGE] - New Image w/ poem");

                img_url = (await uploadImageToStorage(newImage as Buffer)) as string;

                functions.logger.log(" ✅ [FINISHED]: " + img_url);

                

            }

        } catch (e) {
            // status = 400;
            // ok = false;
            text = " 🚨 [ERROR]: Design could not be fetched";
            functions.logger.error(text)
        }

        console.log(isMale)

        // try {

        //     // download image from stoage
        //     const response = await shineOnAPIRequests("/renders/13125/make", "POST", {
        //         "src": img_url
        //     })

        //     if (response.status < 300 && response.data) {
        //         functions.logger.debug(response.data)
        //         img_url = response.data.render.make.src ? response.data.render.make.src : img_url
        //     }

        // } catch (e) {
        //     status = 400;
        //     ok = false;
        //     text = " 🚨 [ERROR]: Shine On could not be created";
        //     functions.logger.error(text)
        // }

        

        try {

            // download image from stoage
            // const response = await shineOnAPIRequests("/renders/13125/make", "POST", {
            //     "src": img_url
            // })
            const requests = ["/renders/13125/make", "/renders/13125/make", "/renders/13125/make",].map(async (id) => await shineOnAPIRequests(id,  "POST", {
                "src": img_url
            }));

            img_url = "";
            img_list = []

            await Promise.all(requests)
              .then(results => {
                console.log(" [PROMISE] - ALL RESULTS");
                console.log(results);

                results.forEach(response => {
                    if (response.status < 300 && response.data) {
                        functions.logger.debug(response.data)
                        img_list = [
                            ...img_list,
                            response.data.render.make.src ? response.data.render.make.src : img_url
                        ]
                        
                    }
                })
              })
              .catch(error => {
                console.error(error);
              });

            // if (response.status < 300 && response.data) {
            //     functions.logger.debug(response.data)
            //     img_url = response.data.render.make.src ? response.data.render.make.src : img_url
            // }

        } catch (e) {
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Shine On could not be created";
            functions.logger.error(text)
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: img_url !== "" ? img_url : img_list
         })
    });

    app.post("/pod/image/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> [POD ROUTE] - Started Image Create ✅");
        let text = " ✅ [SUCCESS]: Design successfully fetched 👽",
            ok = true,
            status = 200;
            
        let {
            url,
            poem,
            name
        } = req.body as {
            url: string,
            poem: string,
            name: string 
        }
        functions.logger.debug(name);

        // const img = {};

        // New Image to client

        const lines = poem ? poem.toLocaleLowerCase().substring(4).split("\\n") : [];
        let text_to_svg = "";

        console.log(lines.length)

        if (lines.length > 1) {
            lines.forEach((line, index) => {
                functions.logger.debug(" => LINE: " + line);
                text_to_svg += `<tspan x="50%" dy="1.8em" class="spanText">${line.toLocaleUpperCase()}</tspan>`;
                if (index !== lines.length - 1 && line !== '') {
                    text_to_svg += "\n"
                }
            });
        } else {
            const poemArr = poem ? poem.substring(4).split(" ") : [];

            let wpl = 7; // Words per line
            let new_line = ""; 

            poemArr.forEach((word, index) => {
                if (index < wpl - 1) {
                    new_line = new_line + " " + word;
                    functions.logger.debug(" => WORD: " + new_line);
                } 
                if (index == wpl - 1) {
                    new_line = new_line + " " + word;
                    text_to_svg += `<tspan x="50%" dy="1.8em" class="spanText">${new_line.toLocaleUpperCase()}</tspan>`;
                    if (index !== poemArr.length - 1 && word !== '') {
                        text_to_svg += "\n"
                    }
                    wpl = wpl + 7;
                    new_line = ""
                    functions.logger.debug(" => text_to_svg: " + text_to_svg);
                }
            });

        }

        // MADE Evolve Sans --> FONT 28px 


        const svgText = `<svg width="1500" height="1500" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <style>
            @font-face {
                font-family: 'MADE Evolve Sans';
                src: url('../assets/MADE_Evolve_Sans.otf') format('truetype');
            }
            .title { 
                fill: black; 
                font-size: 45px;
                text-align: center;
                word-wrap: break-word;
                font-family: 'MADE Evolve Sans';
            }
            .spanText {
                font-size: 45px;
                fill: black; 
                font-family: 'MADE Evolve Sans';
                word-wrap: break-word;
            }
            </style>
            <g>
                <text x="50%" y="60%" width="500px" text-anchor="middle" class="title">
                    ${text_to_svg}
                </text>
            </g>
        </svg>`

        const svgBuffer = Buffer.from(svgText);

        // const new_text = Buffer.from(poem, "utf8");

        let img_url = "";

        try {
            // download image from stoage
            if (url !== "" && poem !== "") {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(" 🚨 [ERROR] - ");
                }
    
                const array_buffer = await response.arrayBuffer();

                const buffer = Buffer.from(array_buffer, "utf8");

                functions.logger.debug(" 🖼️ [IMAGE] - Fetched ");
    
                const image = sharp(buffer);
                functions.logger.debug(" 🖼️ [IMAGE] - Image -> Sharp ");
                
                
                const newImage = await image
                    .resize(1500, 1500)
                    .composite([{input: svgBuffer, gravity: "south"}])
                    .toFormat("png")
                    .toBuffer({ resolveWithObject: true })
                    .then(({ data, info }) => {
                        console.log(data);
                        console.log(info);
                        return data
                    })
                    .catch(err => console.error(err));
                
                functions.logger.debug(" 🖼️ [IMAGE] - New Image w/ poem");

                img_url = (await uploadImageToStorage(newImage as Buffer)) as string;

                functions.logger.log(" ✅ [FINISHED]: " + img_url);

                

            }

        } catch (e) {
            // status = 400;
            // ok = false;
            text = " 🚨 [ERROR]: Design could not be fetched";
            functions.logger.error(text)
        }

        try {

            // download image from stoage
            const response = await shineOnAPIRequests("/renders/13125/make", "POST", {
                "src": img_url
            })

            if (response.status < 300 && response.data) {
                functions.logger.debug(response.data)
                img_url = response.data.render.make.src ? response.data.render.make.src : img_url
            }

        } catch (e) {
            status = 400;
            ok = false;
            text = " 🚨 [ERROR]: Shine On could not be created";
            functions.logger.error(text)
        }



        res.status(status).json({
            ok: ok,
            text: text,
            result: img_url
        })
    });
}

/**
 * Upload the image buffer to Google Storage
 * @param {Buffer} buffer that will be uploaded to Google Storage
 */
export const uploadImageToStorage = (buffer: Buffer) => {
        return new Promise( (resolve, reject) => {
        if (!buffer) {
            reject('No image buffer');
        }
        

        // Generate a new file name
        let newFileName = `${Date.now()}.png`;

        let fileUpload = admin.storage().bucket("impowered-funnel.appspot.com").file("/images/test/" + newFileName);

        const blobStream = fileUpload.createWriteStream({
            metadata: {
            contentType: "image/png"
            }
        });

        blobStream.on('error', (error) => {
            functions.logger.error(" 🚨 [ERROR]: ");
            reject(error);
        });

        blobStream.on('finish', async () => {
            functions.logger.error(" ✅ [FINISHED]: ");

            // Get the public URL of the newly stored PNG image
            await fileUpload.makePublic();
            const URL = fileUpload.publicUrl();
            // const meta = await fileUpload.getMetadata();
            functions.logger.error(" ✅ [URL]: " + URL);
            // console.log(PUBLIC_URL);
            functions.logger.error(" ✅ [META]: ");
            // console.log(meta);

            // fileUpload.getSignedUrl({
            //     action: 'read',
            //     expires: '03-09-2491'
            // });

            resolve(URL);
        });
        blobStream.end(buffer);

    //   blobStream.on('error', (error) => {
    //     reject('Something is wrong! Unable to upload at the moment.');
    //   });

    //   blobStream.on('finish', () => {
    //     // The public URL can be used to directly access the file via HTTP.
    //     const url = `https://firebasestorage.googleapis.com/v0/b/impowered-funnel.appspot.com/o${fileUpload.name}`;
    //     resolve(url);
    //   });
    //   blobStream.end(buffer);
      
    });
}

const searchArray = async (
    sku_list: string[],
    designs: Design[],
) => {

    console.log(designs);
    let colleciton: any[] = [];
    return new Promise((resolve) => {
        // let designs: any[] = [];
        sku_list.forEach(async (s, i) => {
            designs.forEach((m) => {
                if (s.includes(m.sku)) {
                    functions.logger.debug(" [DESIGN] - Found 🔎");
                    colleciton.push(m)
                }
            });
            // const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", s);
                                
            // if (design_res.status < 300 && design_res.data.list) {
            //     functions.logger.debug(" [DESIGN] - Found 🔎");
            //     functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
            //     designs.forEach((d) => {
            //         const data = d.data() as Design;
            //         colleciton = [
            //             ...colleciton,
            //             data
            //         ]
            //     });
            //     designs = [
            //         colleciton[0]
            //     ];
            // } else if (i == (sku_list.length - 1)) {
            //     functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
            // }
        });
        return resolve(colleciton);
    });
};

export const getDesignsFromOrder = async (
    sku_list: string[],
    merchant_uuid: string,
) => {
    let colleciton: any[] = [];
    let designs: any[] = [];



    if (sku_list.length > 0) {
        functions.logger.debug(" [SKU] - Exist - " + sku_list.length);
        functions.logger.debug(sku_list);

        sku_list.forEach(async (s, i) => {
            // Search & fetch design document by sku
            const delay = (ms: number) => {
                return new Promise((resolve) => setTimeout(async () => {

                    const design_res = await simlpeSearch(merchant_uuid, "designs", "sku", s);
                            
                    if (design_res.status < 300 && design_res.data.list) {
                        functions.logger.debug(" [DESIGN] - Found 🔎");
                        functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
                        design_res.data.list?.forEach((d) => {
                            const data = d.data() as Design;
                            colleciton = [
                                ...colleciton,
                                data
                            ]
                        });
                        designs = [
                            colleciton[0]
                        ];
                    } else if (i == (sku_list.length - 1)) {
                        functions.logger.debug(" [DESIGN] - " + i + " " + (sku_list.length - 1));
                        return resolve
                    }
                    return
                }, ms));
            };
            await delay(500).then(() => console.log("TEST"))
        })
    }
    functions.logger.debug("-");
    functions.logger.debug(designs);
    functions.logger.debug(colleciton);
    return designs

}