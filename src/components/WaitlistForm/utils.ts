import { WaitlistFormFields } from "@/types";
import * as Yup from "yup";

export const waitlistValidationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  company: Yup.string().required("Company is required"),
  role: Yup.string().required("Role is required"),
  twitterUrl: Yup.string(),
  linkedinUrl: Yup.string(),
});

export const fields = [
  { name: "name", label: "Name", type: "text", placeholder: "Name" },
  { name: "email", label: "Email", type: "email", placeholder: "Email" },
  { name: "company", label: "Company", type: "text", placeholder: "Company" },
  {
    name: "role",
    label: "Role",
    type: "select",
    placeholder: "Role",
    options: [
      { value: "Founder/CEO", label: "Founder/CEO", role: "Founder/CEO" },
      { value: "Product Manager", label: "Product Manager", role: "Product Manager" },
      { value: "Investor", label: "Investor", role: "Investor" },
      { value: "Partnerships", label: "Partnerships", role: "Partnerships" },
      { value: "Sales", label: "Sales", role: "Sales" },
      { value: "Business Dev", label: "Business Dev", role: "Business Dev" },
      { value: "Chief of Staff", label: "Chief of Staff", role: "Chief of Staff" },
      { value: "Finance", label: "Finance", role: "Finance" },
      { value: "Tech", label: "Tech", role: "Tech" },
      { value: "Real Estate", label: "Real Estate", role: "RealEstate" },
      { value: "Other", label: "Other", role: "other" },
    ],
  },
  { name: "twitterUrl", label: "Twitter", type: "text", placeholder: "Twitter" },
  { name: "linkedinUrl", label: "LinkedIn", type: "text", placeholder: "LinkedIn" },
  { name: "why", label: "Why", type: "text", placeholder: "Why are you interested in Hearth?" },
];

export const initialValues: WaitlistFormFields = {
  name: "",
  email: "",
  company: "",
  role: "",
  why: "",
  twitterUrl: "",
  linkedinUrl: "",
};
