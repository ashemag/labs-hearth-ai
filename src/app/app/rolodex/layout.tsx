import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Home / Hearth",
};

export default function RolodexLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}

