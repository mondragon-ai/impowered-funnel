import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import * as sharp from "sharp";
import { createDocument, getCollections, getDocument, simlpeSearch, updateDocument} from "../lib/helpers/firestore"; //, getCollections, getDocument, simlpeSearch
import { validateKey } from "./auth";
import { divinciRequests } from "../lib/helpers/requests";
import { Blog } from "../lib/types/blogs";
// import { fetchOrders } from "../lib/helpers/shopify";
// import { storage } from "../firebase";
// import fetch from "node-fetch";

// type Design = {
//     merchant_uuid: string,
//     url: string,
//     sku: string,
//     title: string,
//     meta: {}[]
// }

type BlogCreate = {	
    blog: Blog,
    merchant_uuid: string
}

type BlogVote = {
    merchant_uuid: string,
    blo_uuid: string,
    sec_uuid: string,
    key_name: string,
    blog?: Blog,
}

type BlogGenerate = {
    merchant_uuid: string,
    original_text: string,
    author: string,
    collection_type: string,
}

type BlogCollectionFetch = {
    merchant_uuid: string,
    collection_type: string
}

type BlogFetch = {
    merchant_uuid: string,
    blo_uuid: string
}
type BlogUpdate = {
    merchant_uuid: string,
    blo_uuid: string
    blog: Blog,
}



export const blogRoutes = (app: express.Router) => {
    app.post("/blogs/create", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to creaete");
        let status = 400,
            text =  " 🚨 [ERROR]: Could not create blog document",
            ok = false;

        let {
            blog,
            merchant_uuid,
            // url,
            // title,
            // meta
        } = req.body as BlogCreate; 


        blog = {
            ...blog,
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
        } as Blog;

        try {
            const response = await createDocument(merchant_uuid, "blogs", "blo_", blog);

            if (response.status < 300 && response.data) {
                ok = true;
                text = " 🎉  [SUCCESS]: Design successfully uploaded 👽";
                status = 200;
            }
            
        } catch (e) {
            functions.logger.error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text,
            result: ok
        })

    });


    app.post("/blogs", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to fetch blogs");
        let status = 400,
            text = " 🚨 [ERROR]: Could not fetch document",
            ok = false;

        let {
            blo_uuid,
            merchant_uuid,
        } = req.body as BlogFetch; 

        functions.logger.debug(blo_uuid);
        functions.logger.debug(merchant_uuid);

        let blogs: Blog[] = [];
        let size = 0;

        try {

            if (merchant_uuid !== "") {

                if (blo_uuid !== "") {
                    functions.logger.debug(" ❶ [BLOG_UUID] - Fetching Blog");

                    const blog_response = await getDocument(merchant_uuid, "blogs", blo_uuid);
                    
                    if (blog_response.status < 300 && blog_response.data) {
                        blogs = [blog_response.data as Blog];
                        status = 200;
                        text = " 🎉 [SUCCESS]: Document fetched with uuid -> " + blo_uuid;
                        ok = true;
                        size = 1;
                    }
                } else {
                    functions.logger.debug(" ❶ ![BLOG_UUID] - Fetching Blogs");

                    const blog_response = await getCollections(merchant_uuid, "blogs");
                    
                    if (blog_response.status < 300 && blog_response.data.collection) {
                        blogs = blog_response.data.collection;
                        status = 201;
                        text = " 🎉 [SUCCESS]: Documents fetched. ";
                        ok = true;
                        size = blog_response.data.size;
                    }
                }
            }   
            
        } catch (e) {
            functions.logger.error(text + (blo_uuid !== "" ? "." : "s."));
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: {
                size: size,
                blogs: blogs ? blogs : []
            }
        })

    });


    app.post("/blogs/update", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to Update blog");
        let status = 400,
            text = " 🚨 [ERROR]: Could not update document",
            ok = false;

        let {
            blo_uuid,
            blog,
            merchant_uuid,
        } = req.body as BlogUpdate; 

        functions.logger.debug(blo_uuid);
        functions.logger.debug(merchant_uuid);

        let blogs: Blog[] = [];
        let size = 0;

        let default_media_url = ""; // set && get blogs.default_media_url 

        if (blog.sections && blog.sections.length > 0) {
            blog.sections.forEach(section => {
        
                if (section.type === "IMAGE" && default_media_url === "") {
                    default_media_url = section.image;
                }
        
                if (section.type === "VIDEO" && default_media_url === "") {
                    default_media_url = section.video;
                }
            });    
        }

        blog = {
            ...blog,
            updated_at: admin.firestore.Timestamp.now(),
            default_media_url: default_media_url
        }



        try {

            if (merchant_uuid !== "") {

                if (blo_uuid === "") {
                    functions.logger.debug(" ❶ [BLOG_UUID] - Creating Blog -> UUID DOES NOT EXIST");

                    const blog_response = await createDocument(merchant_uuid, "blogs", "blo_", blog);
                    
                    if (blog_response.status < 300 && blog_response.data) {
                        blogs = [blog as Blog];
                        status = 200;
                        text = " 🎉 [SUCCESS]: Document updated with uuid -> " + blo_uuid;
                        ok = true;
                        size = 1;
                    }
                } else {
                    functions.logger.debug(" ❶ ![BLOG_UUID] - Updating Blogs");

                    const blog_response = await updateDocument(merchant_uuid, "blogs", blo_uuid, blog);
                    
                    if (blog_response.status < 300) {
                        blogs = blogs;
                        status = 201;
                        text = " 🎉 [SUCCESS]: Documents fetched. ";
                        ok = true;
                        size = 1;
                    }
                }
            }   
            
        } catch (e) {
            functions.logger.error(text + (blo_uuid));
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: {
                size: size,
                blogs: blogs ? blogs : []
            }
        })

    });


    app.post("/blogs/collections", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to fetch colleciton");
        let status = 400,
            text = " 🚨 [ERROR]: Could not fetch collection",
            ok = false;

        let {
            collection_type,
            merchant_uuid,
        } = req.body as BlogCollectionFetch; 

        let blogs: Blog[] = [];
        let size = 0;

        try {

            if (merchant_uuid !== "") {

                if (collection_type !== "") {

                    const blog_response = await simlpeSearch(merchant_uuid, "blogs", "collection", collection_type);
                    
                    if (blog_response.status < 300 && blog_response.data.list) {
                        const db_blogs = blog_response.data.list;

                        if (db_blogs.size > 0) {
                            db_blogs.forEach(b => {
                                if (b.exists) {
                                    blogs.push(b.data() as Blog)
                                }
                            });
                            status = 201;
                            text = " 🎉 [SUCCESS]: Documents collection fetched. ";
                            ok = true;
                            size = db_blogs.size;
                        }
                    }
                } 
            }   
            
        } catch (e) {
            functions.logger.error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: {
                size: size,
                blogs: blogs ? blogs : []
            }
        })

    });




    app.post("/blogs/generate", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to generate data for blog");
        let status = 400,
            text = " 🚨 [ERROR]: Could not generate blog data",
            ok = false;

        let {
            original_text,
            merchant_uuid,
        }: BlogGenerate = req.body as BlogGenerate; 

        let new_text = "";

        // TODO: Sanatize Data

        try {

            if (merchant_uuid !== "" && original_text !== "") {
                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "Generate a new news article from the following article below: \n\n" + original_text,
                    temperature: 0.9,
                    max_tokens: 1000,
                    frequency_penalty: 0,
                    presence_penalty: 0.6,
                }); 

                if (gpt_response.status < 300 && gpt_response.data) {
                    new_text = gpt_response?.data?.choices[0]?.text;
                    status = 201;
                    text = " 🎉 [SUCCESS]: New Blog Article generated. ";
                    ok = true;
                }
               
            }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }


        let head_line = "";

        try {

            if (merchant_uuid !== "" && original_text !== "") {
                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "Generate the best headline from the following article below for a news article website: \n\n" + new_text ? new_text : original_text,
                    temperature: 0.9,
                    max_tokens: 35,
                }); 

                if (gpt_response.status < 300 && gpt_response.data) {
                    head_line = gpt_response?.data?.choices[0]?.text;
                    status = 201;
                    text = " 🎉 [SUCCESS]: New Blog Article generated. ";
                    ok = true;
                }
               
            }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }

        let subheadline = "";

        try {

            if (merchant_uuid !== "" && original_text !== "") {
                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "Generate the best subheadline from the following article below for a news article website: \n\n" + new_text ? new_text : original_text,
                    temperature: 0.9,
                    max_tokens: 50,
                }); 

                if (gpt_response.status < 300 && gpt_response.data) {
                    subheadline = gpt_response?.data?.choices[0]?.text;
                    status = 201;
                    text = " 🎉 [SUCCESS]: New Blog Article generated. ";
                    ok = true;
                }
               
            }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }


        res.status(status).json({
            ok: ok,
            text: text, 
            result: {
                new_text,
                head_line,
                subheadline
            }
        })

    });




    app.post("/blogs/vote", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to vote for a blog poll.");
        let status = 400,
            text = " 🚨 [ERROR]: Could not vote correctly. ",
            ok = false;

        let {
            blo_uuid,
            merchant_uuid,
            key_name,
            sec_uuid,
        }: BlogVote = req.body as BlogVote; 

        let blog: Blog = {} as Blog;

        try {

            if (key_name !== "" && blo_uuid !== "" && sec_uuid !== "") {
                const blog_response = await getDocument(merchant_uuid, "blogs", blo_uuid)

                if (blog_response.status < 300 && blog_response.data) {
                    blog = blog_response?.data as Blog;
                }
            }   
        } catch (e) {
            functions.logger.error(text + " -> Problem fetching document. Contact customer support.");
        }

        if (blog.sections && blog.sections.length > 0) {
            blog.sections.forEach(sec => {
                if (sec_uuid === sec.id) {
                    const currTotal = sec[key_name];
                    functions.logger.debug(" ❶ [VOTE] - Current Total -> ", currTotal);
                    sec[key_name] = currTotal ? Number(currTotal) + 1 : 1;
                    functions.logger.debug(" ❶ [VOTE] - New Total after the Vote -> ", sec[key_name]);
                }
            });
            functions.logger.debug(" ❶ [NEW BLOG] -> ", {blog});
        }

        try {

            if (key_name !== "" && blo_uuid !== "" && sec_uuid !== "") {

                const update_response = await updateDocument(merchant_uuid, "blogs", blo_uuid, blog);
    
                if (update_response.status < 300) {
                    status = 201;
                    text = " 🎉 [SUCCESS]: Vote casted graciously. ";
                    ok = true;
                }    
               
            }   
        } catch (error) {
            functions.logger.error(text + " -> Likely problem updating. Contact customer support.");
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: null
        })

    });
}