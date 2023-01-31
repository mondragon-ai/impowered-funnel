export type Blog = {
    id: string,
    title: string,
    sub_title: string,
    collection: string,
    original_text: string,
    new_text: string,
    sections: [
        {
            id: string,
            type: "TEXT" | "VIDEO" | "IMAGE",
            text: string, 
            video: string,
            image: string,
            [key_name:string]: any
            option_one: string,
            option_two: string,
        }
    ],
    default_media_url: string,
    updated_at: FirebaseFirestore.Timestamp,
    created_at: FirebaseFirestore.Timestamp,
}