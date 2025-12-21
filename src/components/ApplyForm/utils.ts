import { ApplyFormData } from "@/types";
import * as Yup from "yup";

export const applyValidationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  whyHearth: Yup.string().nullable(),
  // whyHearth: Yup.string().required("Tell us why you want to join Hearth!"),
  resume: Yup.mixed().required("Please upload your resume"),
  portfolioLink: Yup.string().nullable(),
  linkedin: Yup.string().nullable(),
  github: Yup.string().nullable(),
  twitter: Yup.string().nullable(),
});

export const applyFields: ApplyFormData[] = [
  { name: "name", label: "Name", subLabel: "", type: "text", placeholder: "" },

  { name: "email", label: "Email", type: "email", subLabel: "", placeholder: "" },
  {
    name: "whyHearth",
    label: "Why Hearth?",
    subLabel: "Tell us why you want to join our team!",
    type: "textarea",
    placeholder: "Type here...",
  },
  { name: "resume", label: "Resume", subLabel: "", type: "file", placeholder: "" },

  {
    name: "portfolio",
    label: "Portfolio link",
    subLabel: "If you have a portfolio website, please provide the link",
    type: "text",
    placeholder: "Type here...",
  },

  {
    name: "linkedin",
    label: "LinkedIn",
    subLabel: "Please provide your linkedin profile link",
    type: "text",
    placeholder: "Type here...",
  },

  {
    name: "github",
    label: "Github",
    subLabel: "Please provide your github profile link",
    type: "text",
    placeholder: "Type here...",
  },

  {
    name: "twitter",
    label: "Twitter",
    subLabel: "If you're active on twitter, please provide your twitter profile link",
    type: "twitter-link",
    placeholder: "Type here...",
  },
];
