"use client";

import { HandleSubmit, WaitlistFormFields } from "@/types";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import { useState } from "react";
import SubmitButton from "./SubmitButton";
import { fields, initialValues, waitlistValidationSchema } from "./utils";

const WaitlistMobileForm = ({
  handleSubmit,
  loading,
}: {
  handleSubmit: HandleSubmit<WaitlistFormFields>;
  loading: boolean;
}) => {
  const [query, setQuery] = useState("");

  const roleOptions = fields[3].options ?? [];
  const filteredRoles =
    query === ""
      ? roleOptions
      : roleOptions.filter((option) => {
          return option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
        });

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
        <Form onSubmit={handleSubmit} className="flex flex-col">
          {fields.map((field) => {
            const isSelect = field.type === "select";
            const isSocialLink = ["linkedinUrl", "twitterUrl"].includes(field.name);
            const isRequired = !isSocialLink && field.name !== "why";
            const isWhy = field.name === "why";

            return (
              <div key={field.name} className="mb-4 flex flex-col">
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium mb-1 text-brand-purple-darker"
                >
                  {isWhy ? "Why are you interested in Hearth?" : field.label}
                  {isRequired && <span className="text-red-500">*</span>}
                </label>

                {isSelect ? (
                  <Combobox
                    value={values.role}
                    onChange={(value) => setFieldValue("role", value)}
                    onClose={() => setQuery("")}
                  >
                    <div className="relative">
                      <ComboboxInput
                        aria-label="Role"
                        className="w-full rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple-light border border-brand-purple-lighter"
                        displayValue={(role: string) => role}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Select role"
                      />
                      <ComboboxOptions
                        className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                      >
                        {filteredRoles.map((role) => (
                          <ComboboxOption
                            key={role.role}
                            value={role.value}
                            className={({ active }) =>
                              `${active ? 'text-brand-purple-darker bg-brand-purple-lighter' : 'text-gray-900'}
                              cursor-default select-none relative py-2 pl-3 pr-9`
                            }
                          >
                            {role.label}
                          </ComboboxOption>
                        ))}
                      </ComboboxOptions>
                    </div>
                  </Combobox>
                ) : (
                  <Field
                    type={field.type}
                    id={field.name}
                    name={field.name}
                    as={isWhy ? "textarea" : "input"}
                    placeholder={isWhy ? "Tell us more..." : field.placeholder}
                    className={`w-full rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple-light border border-brand-purple-lighter`}
                  />
                )}

                {touched[field.name as keyof WaitlistFormFields] && errors[field.name as keyof WaitlistFormFields] && (
                  <div className="text-red-500 text-xs mt-1">{errors[field.name as keyof WaitlistFormFields]}</div>
                )}
              </div>
            );
          })}

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

export default WaitlistMobileForm;
