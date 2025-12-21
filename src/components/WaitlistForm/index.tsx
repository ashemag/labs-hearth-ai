"use client";

import { Title } from "@/components/common/Typography";
import { HandleSubmit, WaitlistFormFields } from "@/types";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import WaitlistDesktopForm from "./DesktopForm";
import WaitlistMobileForm from "./MobileForm";

const WaitlistForm = () => {
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit: HandleSubmit<WaitlistFormFields> = async (values) => {
    setError(false);
    setLoading(true);
    const res = await fetch(`/api/waitlist`, { method: "POST", body: JSON.stringify(values) });
    setLoading(false);
    if (!res.ok) setError(true);
    const { data } = await res.json();

    if (res.ok) setSuccess(data.message);
  };

  return (
    <div>
      <Title className="text-center">Sign up for early access</Title>

      <p className="text-center text-gray-700 text-sm sm:text-base mb-8">
        We&apos;ll be in touch if it&apos;s a match <span className="inline-block">🔥</span>
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-md mb-8 flex items-center justify-center">
          <CheckCircleIcon className="w-6 h-6 mr-2 flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-md mb-8 text-center">
          <p className="text-sm sm:text-base">
            Oh no! Something went wrong. Let us know at{" "}
            <a href="mailto:hello@hearth.ai" className="font-bold underline hover:text-red-700 transition-colors">
              hello@hearth.ai
            </a>
          </p>
        </div>
      )}

      {!success && (
        <div className="bg-white rounded-lg  p-6 sm:p-8">
          <div className="lg:hidden">
            <WaitlistMobileForm handleSubmit={handleSubmit} loading={loading} />
          </div>
          <div className="hidden lg:block">
            <WaitlistDesktopForm handleSubmit={handleSubmit} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitlistForm;
