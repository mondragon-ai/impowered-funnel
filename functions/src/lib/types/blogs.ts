export type Blog = {
    id: string,
    merchant_uuid: string,
    title: string,
    sub_title: string,
    status: boolean,
    collection: "TRENDING" | "CULTURE" | "HEALTH" | "",
    original_text: string,
    new_text: string,
    style: string,
    author: string,
    published_date: string,
    sections: 
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
        }[],
    default_media_url: string,
    updated_at: FirebaseFirestore.Timestamp | { _seconds:number } | any,
    created_at?: FirebaseFirestore.Timestamp | { _seconds:number } | any,
}