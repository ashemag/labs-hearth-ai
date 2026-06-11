import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AuthenticatedRouteContext {
    supabase: ServerSupabaseClient;
    user: User;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body?: Record<string, unknown>
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function apiError(message: string, status: number, body?: Record<string, unknown>) {
    return NextResponse.json(body || { error: message }, { status });
}

export function badRequest(message: string): never {
    throw new ApiError(message, 400);
}

export function serverError(message: string): never {
    throw new ApiError(message, 500);
}

export function withUser(
    handler: (req: NextRequest, ctx: AuthenticatedRouteContext) => Promise<NextResponse>
) {
    return async function authenticatedRoute(req: NextRequest) {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return apiError("Unauthorized", 401);
        }

        try {
            return await handler(req, { supabase, user });
        } catch (error) {
            if (error instanceof ApiError) {
                return apiError(error.message, error.status, error.body);
            }

            console.error("API route error:", error);
            return apiError("Internal server error", 500);
        }
    };
}

export async function readJsonObject(req: NextRequest) {
    let body: unknown;

    try {
        body = await req.json();
    } catch {
        badRequest("Invalid JSON body");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        badRequest("JSON body must be an object");
    }

    return body as Record<string, unknown>;
}

export function requiredNumber(value: unknown, name: string) {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        badRequest(`${name} is required`);
    }

    return parsed;
}

export function requiredString(value: unknown, name: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
        badRequest(`${name} is required`);
    }

    return value.trim();
}

export function requiredEnum<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    name: string
): T[number] {
    if (typeof value !== "string" || !allowed.includes(value)) {
        badRequest(`${name} must be one of: ${allowed.join(", ")}`);
    }

    return value as T[number];
}

export function optionalString(value: unknown) {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== "string") {
        return String(value);
    }

    return value;
}

export function optionalNullableString(value: unknown) {
    if (value === null) {
        return null;
    }

    return optionalString(value);
}
