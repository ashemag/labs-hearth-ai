import { Asset, AssetLink, createClient, Entry } from "contentful";
import { TypeBlogPostSkeleton } from "./contentful/TypeBlogPost";
import { TypePageSkeleton } from "./contentful/TypePage";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
});

const previewClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN ?? "",
  host: "preview.contentful.com",
});

export const contentfulClient = ({ preview = false }: { preview?: boolean }) => {
  return preview ? previewClient : client;
};

export type BlogPostEntry = Entry<TypeBlogPostSkeleton, undefined, string>;
export interface ContentImage {
  src: string;
  alt?: string;
  width: number;
  height: number;
}

export const parseContentImage = (asset?: Asset<undefined, string> | { sys: AssetLink }): ContentImage | null => {
  if (!asset) return null;

  if (!("fields" in asset)) {
    return null;
  }

  return {
    src: asset.fields.file?.url || "",
    alt: asset.fields.description || "",
    width: asset.fields.file?.details.image?.width || 0,
    height: asset.fields.file?.details.image?.height || 0,
  };
};

export const getPage = async (slug: string) => {
  const contentful = contentfulClient({});

  const response = await contentful.getEntries<TypePageSkeleton>({
    content_type: "page",
    "fields.slug": slug,
    include: 10,
  });

  const [page] = response.items ?? [];

  return page && "fields" in page
    ? {
      slug: page.fields.slug,
      title: page.fields.title,
      content: page.fields.content,
      metadata: { description: page.fields.metadataDescription },
    }
    : null;
};

export const getBlogPostCount = async () => {
  const contentful = contentfulClient({});

  const response = await contentful.getEntries<TypeBlogPostSkeleton>({
    content_type: "blogPost",
    include: 0,
    select: ["fields.slug"],
  });

  return response.total;
};

export const getBlogPosts = async ({ limit, skip = 0 }: { limit?: number; skip?: number }) => {
  const contentful = contentfulClient({});

  const response = await contentful.getEntries<TypeBlogPostSkeleton>({
    content_type: "blogPost",
    limit,
    skip,
    order: ["-sys.createdAt"],
  });

  const posts = response.items ?? [];

  return posts;
};

export const getBlogPost = async (slug: string) => {
  const contentful = contentfulClient({});

  const response = await contentful.getEntries<TypeBlogPostSkeleton>({
    content_type: "blogPost",
    "fields.slug": slug,
    limit: 1,
    include: 2,
  });

  const [post] = response.items ?? [];

  return post;
};
