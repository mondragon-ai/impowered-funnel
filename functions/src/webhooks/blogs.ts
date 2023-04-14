import * as functions from "firebase-functions";
import { Blog } from "../lib/types/blogs";
import { deleteAlgoliaFn, updateAlgoliaFn } from "../routes/db";

export const blogsCreated = functions.firestore
.document("/merchants/{merchantID}/blogs/{blogsID}")
.onCreate(async (snap) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let blog: Blog = snap.exists ? snap.data() as Blog : {} as Blog;

    if (blog !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await updateAlgoliaFn(blog.merchant_uuid+"_"+"blog_search", blog, "blogs");

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
}); 

export const blogsUpdated = functions.firestore
.document("/merchants/{merchantID}/blogs/{blogsID}")
.onUpdate(async (change, context) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let blog: Blog = change.after.exists ? change.after.data() as Blog : {} as Blog;

    if (blog !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await updateAlgoliaFn(blog.merchant_uuid+"_"+"blog_search", blog,"blogs");

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})


export const blogsDelete = functions.firestore
.document("/merchants/{merchantID}/blogs/{blogsID}")
.onDelete(async (change, context) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let blog: Blog = change.exists ? change.data() as Blog : {} as Blog;

    if (blog !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await deleteAlgoliaFn(blog.merchant_uuid+"_"+"blog_search",blog.id);

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})