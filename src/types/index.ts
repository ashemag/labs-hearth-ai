export type ArticleData = {
  icon: string;
  title: string;
  createDate: string;
  author: string;
};

export type NavItems = {
  name: string;
  to: string;
  id: number;
};

export type ApplyFormData = {
  name: string;
  label: string;
  subLabel: string;
  type: string;
  placeholder: string;
};

export type ApplyFormFields = {
  name: string;
  email: string;
  whyHearth?: string;
  resume: File | null;
  portfolio?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
};

export type WaitlistFormFields = {
  name: string;
  email: string;
  role: string;
  company: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  why?: string;
};

export interface FormikActions<Values> {
  setFieldValue<Field extends keyof Values>(field: Field, value: Values[Field], shouldValidate?: boolean): void;
}

export type HandleSubmit<FormFields> = (values: FormFields) => Promise<void>;
