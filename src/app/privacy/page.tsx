import { AnimatedSubLayout } from "@/layouts/AnimatedSubLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Relational Intelligence",
};

const PrivacyPolicyPage = () => {
  return (
    <AnimatedSubLayout>
      <div className="prose max-w-none">
        <h1>Privacy Policy</h1>
        <p>This page is currently unavailable.</p>
      </div>
    </AnimatedSubLayout>
  );
};

export default PrivacyPolicyPage;
