"use client";

import Link from "next/link";
import { FC } from "react";

const Pagination: FC<{ totalPages: number; currentPage: number }> = ({ currentPage }) => {
  return (
    <Link className="block w-max px-4 py-2 text-white bg-black" href={`/blog/page/${currentPage + 1}`}>
      Load More
    </Link>
  );
};

export default Pagination;
