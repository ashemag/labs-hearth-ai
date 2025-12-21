import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const values = await request.json();
    const processedValues = {
      name: values.name,
      email: values.email,
      twitter_url: values.twitterUrl,
      linkedin_url: values.linkedinUrl,
      why: values?.why,
      role: values?.role,
      company: values.company,
     
    };
    const { data } = await axios.post(`${process.env.API_URL}/${process.env.WAITLIST_ENDPOINT}`, processedValues, {
      headers: { "X-API-Key": process.env.CLOUDRUN_API_TOKEN },
    });
    
    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return new Response(error.message, {
        status: 500,
      });
    }
    return new Response("Unknown error", {
      status: 500,
    });
  }
}
