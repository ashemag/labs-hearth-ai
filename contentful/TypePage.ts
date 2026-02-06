import { Entry, EntryFieldTypes } from "contentful";
import { Document } from "@contentful/rich-text-types";

export interface TypePageFields {
    title: string;
    slug: string;
    content?: Document;
    metadataDescription?: string;
}

export type TypePageSkeleton = {
    contentTypeId: "page";
    fields: TypePageFields;
}; 
