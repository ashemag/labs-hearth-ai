"use client";

import { HandleSubmit, WaitlistFormFields } from "@/types";
import { Field, Form, Formik } from "formik";
import Select from "react-select";
import SubmitButton from "./SubmitButton";
import { fields, initialValues, waitlistValidationSchema } from "./utils";

const WaitlistDesktopForm = ({
  handleSubmit,
  loading,
}: {
  handleSubmit: HandleSubmit<WaitlistFormFields>;
  loading: boolean;
}) => {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={waitlistValidationSchema}
      onSubmit={async (values, { setSubmitting }) => {
        await handleSubmit(values);
        setSubmitting(false);
      }}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ isValid, setFieldValue, values, errors, touched, handleSubmit }) => (
        <Form onSubmit={handleSubmit} className="flex flex-col w-full text-brand-purple-dark">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => {
              if (field.name === "why") return null; // Skip the "why" field here
              return (
                <div key={field.name} className="flex flex-col mb-4">
                  <label htmlFor={field.name} className="text-sm font-medium mb-1">
                    {field.placeholder}
                    {field.name !== "twitterUrl" && field.name !== "linkedinUrl" && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <Select
                      className="text-sm"
                      classNamePrefix="select"
                      placeholder="Select role"
                      name="role"
                      onChange={(selectedOption) => {
                        setFieldValue(field.name, selectedOption?.value);
                      }}
                      options={field.options}
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          border: "1px solid #E5E7EB",
                          boxShadow: "none",
                          "&:hover": {
                            border: "1px solid #E5E7EB",
                          },
                          color: "#E5E7EB",
                          fontSize: "14px",
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          fontSize: "12px",
                          backgroundColor: state.isDisabled
                            ? undefined
                            : state.isSelected
                            ? "#bfc0d1"
                            : state.isFocused
                            ? "#E5E5EC"
                            : undefined,
                          ":active": {
                            backgroundColor: state.isSelected ? "#bfc0d1" : "#e2e2e2",
                          },
                        }),
                        placeholder: (styles) => ({ ...styles, fontSize: "12px", color: "#bfc0d1" }),
                        singleValue: (styles) => ({ ...styles, fontSize: "12px" }),
                      }}
                    />
                  ) : (
                    <Field
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      className="text-sm border border-brand-purple-lighter rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-purple-light"
                    />
                  )}
                  {touched[field.name as keyof WaitlistFormFields] && errors[field.name as keyof WaitlistFormFields] && (
                    <div className="text-red-500 text-xs mt-1">{errors[field.name as keyof WaitlistFormFields]}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mb-4">
            <label htmlFor="why" className="text-sm font-medium mb-1">
              Why are you interested in Hearth?
            </label>
            <Field
              as="textarea"
              id="why"
              name="why"
              placeholder="Tell us more..."
              className="w-full text-sm border border-brand-purple-lighter rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-purple-light"
              rows={4}
            />
          </div>

          <div className="flex justify-center mt-6">
            <SubmitButton
              loading={loading}
              disabled={!isValid || (values.name === initialValues.name && values.email === initialValues.email)}
            />
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default WaitlistDesktopForm;
