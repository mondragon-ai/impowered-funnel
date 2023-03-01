import * as functions from "firebase-functions";
import { Blog } from "../lib/types/blogs";
import { updateAlgoliaFn } from "../routes/db";

export const blogsCreated = functions.firestore
.document("/merchants/{merchantID}/blogs/{blogsID}")
.onCreate(async (snap) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let blog: Blog = snap.exists ? snap.data() as Blog : {} as Blog;

    if (blog !== null) {
        functions.logger.info(" ⏭️ [START] - Push Algolia");
        await updateAlgoliaFn(blog, "blogs");

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
        await updateAlgoliaFn(blog, "blogs");

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})