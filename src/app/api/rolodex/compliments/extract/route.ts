import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Extract compliment text from a screenshot using GPT-4o Vision
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const imageFile = formData.get("image") as File | null;

        if (!imageFile) {
            return NextResponse.json({ error: "Image is required" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(imageFile.type)) {
            return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
        }
        if (imageFile.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
        }

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const base64Image = buffer.toString("base64");
        const mimeType = imageFile.type;

        const systemPrompt = `You extract compliments from screenshots of messages, tweets, DMs, emails, or conversations.
Extract:
1. The person's name or username who gave the compliment(s)
2. ALL compliment texts - each distinct compliment or kind statement should be a separate item
3. The context/platform (e.g., "Twitter DM", "Slack", "Text message", "iMessage", "Email", "LinkedIn")

Return JSON: {"personName": "...", "compliments": ["compliment 1", "compliment 2", ...], "context": "..."}
Return an array even if there's only one compliment.
If there's no visible person name, set personName to null.
Only return valid JSON. If no clear compliment exists, return {"compliments": [], "personName": null, "context": null}`;

        const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Extract the compliment(s) from this screenshot:" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                    detail: "auto",
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 500,
                temperature: 0.1,
            }),
        });

        if (!visionResponse.ok) {
            console.error("[Compliment Extract] OpenAI error:", visionResponse.status);
            return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
        }

        const visionData = await visionResponse.json();
        const content = visionData.choices?.[0]?.message?.content?.trim();

        if (!content) {
            return NextResponse.json({ personName: null, compliments: [], context: null });
        }

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ personName: null, compliments: [], context: null });
        }

        const extracted = JSON.parse(jsonMatch[0]);

        // Normalize compliments to array
        let compliments: string[] = [];
        if (Array.isArray(extracted.compliments)) {
            compliments = extracted.compliments;
        } else if (extracted.compliments) {
            compliments = [extracted.compliments];
        } else if (extracted.compliment) {
            compliments = [extracted.compliment];
        } else if (extracted.text) {
            compliments = [extracted.text];
        }

        const personName = extracted.personName || extracted.name || extracted.person || extracted.author || extracted.from || extracted.sender || null;
        const context = extracted.context || extracted.source || extracted.platform || null;

        return NextResponse.json({ personName, compliments, context });
    } catch (error) {
        console.error("[Compliment Extract] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
