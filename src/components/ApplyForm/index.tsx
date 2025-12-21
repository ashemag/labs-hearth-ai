import { useParams } from "next/navigation";
import { useState } from "react";

import { ApplyFormFields, HandleSubmit } from "@/types";
import axios from "axios";
import { ErrorMessage, Field, Form, Formik } from "formik";
import FileUpload from "./FileUpload";
import Save from "./Save";
import { applyFields, applyValidationSchema } from "./utils";

const ApplyForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const param = useParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const initialValues: ApplyFormFields = {
    name: "",
    email: "",
    whyHearth: "",
    portfolio: "",
    linkedin: "",
    github: "",
    twitter: "",
    resume: null,
  };

  const handleSubmit: HandleSubmit<ApplyFormFields> = async (values) => {
    try {
      setError(false);
      setLoading(true);
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("email", values.email);
      selectedFile && formData.append("resume", selectedFile);
      formData.append("urls[GitHub]", values.github as string);
      formData.append("urls[LinkedIn]", values.linkedin as string);
      formData.append("urls[Portfolio]", values.portfolio as string);
      formData.append("urls[Twitter]", values.twitter as string);
      formData.append("comments", values.whyHearth as string);

      const res = await axios.post(
        `https://api.lever.co/v0/postings/hearthai/${param.id}?key=D3WMqn0roRCCpjaFUAwW`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (res.data.ok) {
        setSuccess(true);
      } else {
        setError(true);
      }
      setLoading(false);
    } catch (error) {
      console.log(error);
      setError(true);
      setSuccess(false);
      setLoading(false);
    }
  };

  return (
    <>
      {success && <p> Application submitted ✅</p>}
      {!success && (
        <Formik
          initialValues={initialValues}
          validationSchema={applyValidationSchema}
          onSubmit={(values: ApplyFormFields) => handleSubmit(values)}
        >
          {({ setFieldValue, values }) => {
            return (
              <Form>
                <div className="space-y-12">
                  <div className="border-brand-orange-lighter pb-12 grid grid-cols-1 gap-x-6 gap-y-4">
                    <div className="grid grid-cols-1 gap-y-4">
                      {applyFields.slice(0, 3).map((field) => {
                        return (
                          <div key={field.name} className="sm:col-span-3">
                            <label
                              htmlFor="first-name"
                              className="block text-sm font-medium leading-6 text-brand-purple-darker"
                            >
                              {field.label}
                              {field.type !== "textarea" && <span className="text-brand-orange">*</span>}
                              {field.subLabel && (
                                <p className="text-xs leading-6 text-brand-purple-darker">{field.subLabel}</p>
                              )}
                            </label>
                            <div className="mt-2">
                              {field.type === "textarea" ? (
                                <>
                                  <Field
                                    // type={field.type}
                                    as={"textarea"}
                                    id={field.name}
                                    name={field.name}
                                    placeholder={field.placeholder}
                                    className="block w-full rounded-md border-0 p-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-brand-orange-lighter placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                  />
                                </>
                              ) : (
                                <>
                                  <Field
                                    type={field.type}
                                    id={field.name}
                                    name={field.name}
                                    placeholder={field.placeholder}
                                    className="block w-full rounded-md border-0 p-3 text-brand-purple-darker shadow-sm ring-1 ring-inset ring-brand-orange-lighter placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                  />
                                  <ErrorMessage
                                    name={field.name}
                                    component="div"
                                    className="text-red-500 text-xs pt-1"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <FileUpload
                      setFieldValue={setFieldValue}
                      selectedFile={selectedFile}
                      setSelectedFile={setSelectedFile}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4">
                  <h4 className="text-[22px] font-bold mt-2.5 mb-2">Links</h4>
                  <hr className="border-brand-purple-dark/20 mb-2" />
                  {applyFields.slice(4).map((field) => {
                    return (
                      <div key={field.name} className="sm:col-span-4">
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-purple-darker">
                          {field.label}
                        </label>
                        <p className="text-xs leading-6 text-brand-purple-darker">{field.subLabel}</p>

                        <div className="mt-2">
                          <Field
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            placeholder={field.placeholder}
                            className="text-sm block w-full rounded-md border-0 p-3 text-gray-900 shadow-sm ring-1 ring-inset ring-brand-orange-lighter focus:outline-none placeholder:text-gray-400 sm:leading-6"
                          />
                          <ErrorMessage name={field.name} component="div" className="text-red-500 text-xs pt-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {error && (
                  <div className="pt-6">
                    <div className="bg-red-200 py-2 px-4 rounded w-full text-red-700">{`Oh no! Something went wrong. Please email us at hiring@hearth.ai.`}</div>
                  </div>
                )}
                <Save disabled={!selectedFile || !values.email || !values.name} loading={loading} />
              </Form>
            );
          }}
        </Formik>
      )}
    </>
  );
};

export default ApplyForm;
