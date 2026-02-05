import { Asset, Entry } from "contentful";

export interface TypeBlogPostFields {
    title: string;
    slug: string;
    content?: any;
    summary?: string;
    datePublished: string;
    author?: string;
    featuredImage?: Asset;
    image?: Asset;
}

export type TypeBlogPostSkeleton = {
    contentTypeId: "blogPost";
    fields: TypeBlogPostFields;
}; 