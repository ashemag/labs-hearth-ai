import { AnimatedSubLayout } from "@/layouts/AnimatedSubLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of service for Hearth AI - Relational Intelligence software. Your Second Brain on Your People.",
};

const Terms = () => {
  return (
    <AnimatedSubLayout>
      <div className="prose max-w-none">
        <h1>Terms of Use</h1>
        <p>This page is currently unavailable.</p>
      </div>
    </AnimatedSubLayout>
  );
};

export default Terms;
