import * as functions from "firebase-functions";
import { Blog } from "../lib/types/blogs";
import { updateAlgolia } from "../lib/helpers/draft_orders/timeCompletion";

export const blogsCreated = functions.firestore
.document("/merchants/{merchantID}/blogs/{blogsID}")
.onCreate(async (snap) => {

    functions.logger.info(" ⏱️ [CRON_JOB]: Blog Created");
    let blog: Blog = snap.exists ? snap.data() as Blog : {} as Blog;

    if (blog !== null) {
        functions.logger.info(" ⏭️ [QUEUE] - Push Task to Queue");
        updateAlgolia(blog);

    } else {
        functions.logger.error(" 🚨 [ERROR]: Internal error - customer doesn't exist");
        
    }
})