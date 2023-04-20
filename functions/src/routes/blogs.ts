import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import * as sharp from "sharp";
import { complexSearch, createDocument, deleteDocument, getCollections, getDocument, getPaginatedCollections, updateDocument} from "../lib/helpers/firestore"; //, getCollections, getDocument, simlpeSearch
import { validateKey } from "./auth";
import { divinciRequests } from "../lib/helpers/requests";
import { Blog } from "../lib/types/blogs";
// import puppeteer from "puppeteer";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { getToday } from "../lib/helpers/date";
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

type BlogGenerateURL = {
    merchant_uuid: string,
    url: string,
    original_text: string,
    author: string,
    collection_type: string,
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

type BlogDelete = {
    merchant_uuid: string,
    blo_uuid: string
    blog_ids: string[]
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

    app.post("/blogs/test", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to creaete");
        let status = 400,
            text =  " 🚨 [ERROR]: Could not create blog document",
            ok = false;

        // let original_text: string[] = [];
        let url = "http://rss.cnn.com/rss/cnn_topstories.rss";
        // let links: string[] = [];
    
        try {
    
          functions.logger.debug(" ❶ [URL] -> ", {url});
          if (url !== "") {
    
              const article_response = await fetch(url);
    
              if (!article_response.ok) {
                  throw new Error(`Failed to fetch article: ${article_response.statusText}`);
              }
    
              const xml = await article_response.text();
    
              const $ = cheerio.load(xml, { xmlMode: true });
          
              // $('link').each(function(i, el) {
              //   original_text.push($((el)).text());
              // });
    
              const articleEl = $("item");
    
              if (!articleEl.length) {
                  throw new Error("Article not found");
              }

              
    
              let k = 0;

              articleEl.each((i, el) => {

                const children: any[] = (el as unknown as any).children as any[];
                children.map(async (child) => {
                    const today = await getToday();
                    const yesterday = (today*1000) - (12 * 60 * 60 * 1000)
                    if (child.name == "pubDate") {
                        const pubDate = new Date($(child).text());
                        if (yesterday <= pubDate.getTime()) {
                            k = k + 1;
                            console.log([today, yesterday, pubDate.getTime(), $(child).text()]);
                        }
                    }
                })
                // console.log(children)
              });

              status = 201;
              text =  " 🎉 [SUCCESS]: Scraped the webpage > " + k;
              ok = true;
    
            //   const paragraphs = articleEl.find("link").toArray();
            //   original_text = paragraphs.map((p) => $(p).text());
          }
          
      } catch (e) {
          functions.logger.debug(" 🚨 [URL]: Article doesnt exist");
      }

      res.status(status).json({
          ok: ok,
          text: text,
          result: ok
      })

    
    });

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
            merchant_uuid: merchant_uuid,
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
            status: false
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
            merchant_uuid: merchant_uuid,
            updated_at: admin.firestore.Timestamp.now(),
            default_media_url: default_media_url,
            status: blog.title !== "" ? true : false
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

    app.post("/blogs/delete", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready delete blog(s)");
        let status = 200,
            text = " 🎉 [SUCCESS]: Blogs Successfully Deleted",
            ok = true;

        let {
            blo_uuid,
            merchant_uuid,
            blog_ids
        } = req.body as BlogDelete; 

        try {

            if (blo_uuid && blo_uuid !== "") {
                functions.logger.debug(" ❶ [BLOG_ID] -> Delete Single");
                await deleteDocument(merchant_uuid, "blogs", blo_uuid);
            }  
            
            if (blog_ids && blog_ids.length >= 1) {
                functions.logger.debug(" ❶ [BLOG_IDS] -> Loop through & delete single");
                await Promise.all(blog_ids.map(id => deleteDocument(merchant_uuid, "blogs", id)));
            }
            
        } catch (e) {
            ok = false;
            status = 400,
            text = " 🚨 [ERROR]: Could not fetch collection",
            functions.logger.error(text);
        }

        res.status(status).json({
            ok: ok,
            text: text, 
            result: ok
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

                    // const blog_response = await simlpeSearch(merchant_uuid, "blogs", "collection", collection_type);
                    functions.logger.debug(" ❶ ![BLOG_UUID] - Fetching Blogs");

                    const blog_response = await getCollections(merchant_uuid, "blogs");
                    
                    if (blog_response.status < 300 && blog_response.data.collection) {
                        blogs = blog_response.data.collection;
                        status = 201;
                        text = " 🎉 [SUCCESS]: Documents fetched. ";
                        ok = true;
                        size = blog_response.data.size;

                        blogs = blogs.filter(b => b.collection == collection_type)
                    }

                    const seconds = (blogs[blogs.length -1].updated_at as any)._seconds;
                    functions.logger.debug(seconds);
                    functions.logger.debug(blogs[blogs.length -1]);
            
                    try {
            
                        const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
                        functions.logger.debug(start);
            
                        const response = await complexSearch(merchant_uuid, "blogs", "collection", collection_type, start);

                        if (response.status < 300 && response.data.list) {
                            functions.logger.debug(response.status);
                            const db_blogs = response.data.list ;
            
                            if (db_blogs.size > 0) {
                                db_blogs.forEach((b) => {
                                    if (b.exists && blogs.length < 25) {
                                        const blog = b.data() as Blog;
            
                                        if (blog.collection == collection_type) {
                                            blogs.push(blog);
                                        }
                                    } 
                                });
                                status = 201;
                                text = " 🎉 [SUCCESS]: Documents collection fetched. ";
                                ok = true;
                                size = db_blogs.size;
                            }
                        }
                    } catch (e) {
                        text = " 🚨 [ERROR]: Likely a problem fetching a blogs";
                        status = 500;
                        ok = false;
                        functions.logger.error(text);
                        throw new Error(text);
                    }
            
                    
                    // if (blog_response.status < 300 && blog_response.data.list) {
                    //     const db_blogs = blog_response.data.list as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;

                    //     // let last_updated_at = 0;
                    //     if (db_blogs.size > 0) {
                    //         db_blogs.forEach( (b: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>)=> {
                    //             if (b.exists && blogs.length < 25) {
                    //                 blogs.push(b.data() as Blog)
                    //             } else {
                    //                 res.status(status).json({
                    //                     ok: ok,
                    //                     text: text,
                    //                     result: {
                    //                         size: size,
                    //                         blogs: blogs
                    //                     }
                    //                 })
                    //             }
                    //         });
                    //         status = 201;
                    //         text = " 🎉 [SUCCESS]: Documents collection fetched. ";
                    //         ok = true;
                    //         size = db_blogs.size;
                    //     }
                    // }
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
                blogs: blogs ? blogs.sort((a,b) => b.updated_at._seconds - a.updated_at._seconds) : []
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

    app.post("/blogs/generate/url", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [BLOG ROUTE] - Ready to generate data for blog using URL");
        let status = 400,
            text = " 🚨 [ERROR]: Could not generate blog data",
            ok = false;

        let {
            url,
            merchant_uuid,
            collection_type
        }: BlogGenerateURL = req.body as BlogGenerateURL; 

        let new_text = "";
        let img = "";
        let original_text = "";

        // TODO: Sanatize Data

        try {

            functions.logger.debug(" ❶ [URL] -> ", {url});
            if (url !== "") {

                status = 422;
                const article_response = await fetch(url);
                const test_article =  article_response;
                functions.logger.debug(test_article)
                if (!article_response.ok) {
                    throw new Error(`Failed to fetch article: ${article_response.statusText}`);
                }

                const html = await article_response.text();

                const $ = cheerio.load(html);
                const articleEl = $("article");

                if (!articleEl.length) {
                    throw new Error("Article not found");
                }

                // if <picture>
                const imgs = articleEl.find("picture").find("img");
                functions.logger.debug(" [IMGS]", imgs);

                img = imgs.attr("src") as string;
                functions.logger.debug(" [IMGS]", img);

                const paragraphs = articleEl.find("p").toArray();
                original_text = paragraphs.map((p) => $(p).text()).join("\n");


                // if Video

            }
            functions.logger.debug(" ❶ [URL] - New Text from Article > ", {original_text});
            
        } catch (e) {
            functions.logger.error(" 🚨 [URL]: Article doesnt exist");
        }

        try {

            if (merchant_uuid !== "" && original_text !== "") {
                const gpt_response = await divinciRequests("/completions", "POST", {
                    model: "text-davinci-003",
                    prompt: "Generate a new news article from the following article below with exact matching facts: \n\n" + original_text,
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

            // if (merchant_uuid !== "" && original_text !== "") {
            //     const gpt_response = await divinciRequests("/completions", "POST", {
            //         model: "text-davinci-003",
            //         prompt: "In 10 words or less, create a short title for the following news article: \n\n" + new_text !== "" ? new_text : original_text,
            //         temperature: 0.9,
            //         max_tokens: 100,
            //     }); 

            //     if (gpt_response.status < 300 && gpt_response.data) {
            //         head_line = gpt_response?.data?.choices[0]?.text;
            //         status = 201;
            //         text = " 🎉 [SUCCESS]: New Blog Article generated. ";
            //         ok = true;
            //     }
               
            // }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }

        let subheadline = "";

        const getRandomName = (names: string[]) => {
            // Generate a random index between 0 and the length of the names array
            const randomIndex = Math.floor(Math.random() * names.length);
          
            // Return the name at the random index
            return names[randomIndex];
        }
        
        const names = ['Richard Greentree', 'Monica Carlyle', 'Terri Bonner', 'Matt Couch'];

        try {

            // if (merchant_uuid !== "" && original_text !== "") {
            //     const gpt_response = await divinciRequests("/completions", "POST", {
            //         model: "text-davinci-003",
            //         prompt: "In 50 words or less, create a short enticing summary for the following news article: \n\n" + new_text ? new_text : original_text,
            //         temperature: 0.9,
            //         max_tokens: 100,
            //     }); 

            //     if (gpt_response.status < 300 && gpt_response.data) {
            //         subheadline = gpt_response?.data?.choices[0]?.text;
            //         status = 201;
            //         text = " 🎉 [SUCCESS]: New Blog Article generated. ";
            //         ok = true;
            //     }
               
            // }   
            
        } catch (e) {
            functions.logger.error(text + " Likley a DaVinci Issue. Contact customer support.");
        }

        let blog = {
            title: head_line,
            sub_title: subheadline,
            original_text: url ?  url : "",
            new_text: new_text ?  new_text : "",
            collection: collection_type,
            sections: [] as any,
            style: "OBJECTIVE",
            status: false,
            author: getRandomName(names),
            published_date: new Date().toLocaleDateString(),
            updated_at: admin.firestore.Timestamp.now(),
            created_at: admin.firestore.Timestamp.now(),
            default_media_url: img,
            merchant_uuid: merchant_uuid
        } as Blog;

        let generated_sections: {
            id: string,
            type: string,
            text: string,
            image: string,
            video: string,
            [key: string]: any
        }[] = []

        if (new_text !== "") {
            
            new_text.split("\n\n").forEach((section, i) => {
                if (i == 3) {
                    generated_sections = [
                        ...generated_sections,
                        {
                            id: "sec_" + crypto.randomBytes(10).toString("hex"),
                            type: "TEXT",
                            text: section.toString(),
                            image: "",
                            video: ""
                        },
                        {
                            id: "sec_" + crypto.randomBytes(10).toString("hex"),
                            type: "IMAGE",
                            text: "DEFAULT_IMG",
                            image: img,
                            video: ""
                        },
                    ]
                }
                if (section) {
                    generated_sections = [
                        ...generated_sections,
                        {
                            id: "sec_" + crypto.randomBytes(10).toString("hex"),
                            type: "TEXT",
                            text: section.toString(),
                            image: "",
                            video: ""
                        },
                    ]
                }
            })

            blog = {
                ...blog,
                sections: [
                    ...blog.sections,
                    ...generated_sections,
                ]
            } as Blog;

            if (new_text.length <= 3) {
                blog = {
                    ...blog,
                    sections: [
                        ...blog.sections,
                        ...generated_sections,
                        {
                            id: "sec_" + crypto.randomBytes(10).toString("hex"),
                            type: "IMAGE",
                            text: "DEFAULT_IMG",
                            image: img,
                            video: ""
                        },
                    ]
                } as Blog;
            }

        } else {

        }

        try {
            if (new_text !== "" && original_text !== "") {

                const response = await createDocument(merchant_uuid, "blogs", "blo_", blog);
    
                if (response.status < 300 && response.data) {
                    ok = true;
                    text = " 🎉  [SUCCESS]: Blog successfully created 👽";
                    status = 200;
                }
            }
        } catch (e) {
            functions.logger.error(text + " Likely due to creating blogs");
        }


        res.status(status).json({
            ok: ok,
            text: text, 
            result: {
                new_text,
                head_line,
                subheadline,
                sections: blog.sections
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

    /**
     * Search & return users: 
     */
    app.post("/blogs/collection/next", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [CUSTOMERS]: Blog Colleciton Paginate Next Start Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: Additional collection Blogs sucessfully fetched",
            result: Blog[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;
        const collection_type = req.body.collection_type;
        const seconds = req.body.start | 0;
        functions.logger.debug(seconds);

        try {

            const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
            functions.logger.debug(start);

            const response = await complexSearch(merchant_uuid, "blogs", "collection", collection_type, start);
            if (response.status < 300 && response.data.list) {
                const db_blogs = response.data.list ;

                if (db_blogs.size > 0) {
                    db_blogs.forEach((b) => {
                        if (b.exists && result.length < 25) {
                            const blog = b.data() as Blog;

                            if (blog.collection == collection_type) {
                                result.push(blog);
                            }
                        } 
                    });
                    status = 201;
                    text = " 🎉 [SUCCESS]: Documents collection fetched. ";
                    ok = true;
                    size = db_blogs.size;
                }
            }
        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem fetching a blogs";
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
                blogs: result
            }
        })
    });

    /**
     * Search & return users: 
     */
    app.post("/blogs/next", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ✅ [CUSTOMERS]: Blog Paginate Next Start Route");
        let status = 200,
            text = " 🎉 [SUCCESS]: Blogs sucessfully fetched",
            result: Blog[] = [],
            size = 0,
            ok = true;

        // if valid
        const merchant_uuid = req.body.merchant_uuid;
        const seconds = req.body.start | 0;
        functions.logger.debug(seconds);

        try {

            const start = admin.firestore.Timestamp.fromMillis(seconds * 1000);
            functions.logger.debug(start);

            const response = await getPaginatedCollections(merchant_uuid, "blogs", start);
            if (response?.data?.collection && response.status < 300) {
                result = response?.data?.collection;
                size = response?.data?.size ? response?.data?.size : 1;
            }

        } catch (e) {
            text = " 🚨 [ERROR]: Likely a problem fetching a blogs";
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
                blogs: result
            }
        })
    });

}