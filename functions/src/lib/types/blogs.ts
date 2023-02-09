export type Blog = {
    id: string,
    title: string,
    sub_title: string,
    collection: "TRENDING" | "CULTURE" | "HEALTH" | "",
    original_text: string,
    new_text: string,
    style: string,
    author: string,
    published_date: string,
    sections: [
        {
            type: "TEXT" | "VIDEO" | "IMAGE" | "TWEET" | "POLL" | "",
            text: string, 
            video: string,
            image: string,
            id: string,
            tweet: string,
            option_one: string,
            option_two: string,
            [key: string]: any
        }
    ],
    default_media_url: string,
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
}