import { XMarkIcon } from "@heroicons/react/24/outline";
import { ApplyFormFields, FormikActions } from "@/types";
import React from "react";

type Props = {
  setFieldValue: FormikActions<ApplyFormFields>["setFieldValue"];
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
};

const FileUpload = ({ setFieldValue, selectedFile, setSelectedFile }: Props) => (
  <div className="w-full">
    <div className="w-full">
      <div className="col-span-full">
        <label htmlFor="cover-photo" className="block text-sm font-medium leading-6 text-brand-purple-darker">
          Resume<span className="text-brand-orange">*</span>
        </label>
        {selectedFile ? (
          <div className="mt-3 border border-brand-purple p-3 rounded-md flex flex-row bg-white text-sm items-center">
            <p>{selectedFile.name}</p>
            <XMarkIcon className="h-6 w-6 ml-auto cursor-pointer" onClick={() => setSelectedFile(null)} />
          </div>
        ) : (
          <div className="bg-white mt-2 flex items-center justify-center rounded-full border border-brand-orange-lighter px-6 py-3 hover:cursor-pointer">
            <label
              htmlFor="resume"
              className="relative flex cursor-pointer rounded-md text-base font-semibold text-brand-purple-darker focus-within:outline-none  hover:text-brand-purple"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75"
                />
              </svg>

              <span>Upload File</span>
              <input
                id="resume"
                name="resume"
                type="file"
                className="sr-only"
                onChange={(event) => {
                  if (!event.currentTarget.files?.[0]) return;
                  setFieldValue("resume", event.currentTarget.files?.[0]);
                  setSelectedFile(event.currentTarget.files?.[0]);
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default FileUpload;
