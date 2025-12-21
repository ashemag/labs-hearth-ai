import { format } from "date-fns";
import Link from "next/link";
import { FC } from "react";
import { BlogPostEntry, parseContentImage } from "../../../contentful";

const BlogPostCard: FC<{ post: BlogPostEntry }> = ({ post }) => {
  const link = `/blog/${post.fields.slug as string}`;
  const image = post.fields.image ? parseContentImage(post.fields.image) : null;

  return (
    <article className="w-full flex flex-col overflow-hidden border-b border-black/10 py-8 md:py-12 last-of-type:border-0 md:flex-row md:gap-12 md:items-center">
      <div className="bg-ww-accent relative h-[183px] bg-opacity-20 md:w-80">
        {image && (
          <Link href={link}>
            <img
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              loading="eager"
              srcSet={`${image.src}?w=300 1x, ${image.src} 2x`}
              className="absolute h-full w-full object-cover"
            />
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex-1">
          <h2 className="text-md mb-2 font-bold text-rand-purple-darker md:text-lg">
            <Link className="block" href={link}>
              {post.fields.title as string}
            </Link>
          </h2>

          <p className="md:text-lg mb-1">
            <Link className="block" href={link}>
              {(post.fields.summary || '') as string}
            </Link>
          </p>

          <p className="text-sm">{post.fields.datePublished ? format(new Date(post.fields.datePublished as string), "LLLL d, yyyy") : ''}</p>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
