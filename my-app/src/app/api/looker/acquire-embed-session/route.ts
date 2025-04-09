import {
  USER_BRAND_COOKIE,
  USER_ID_COOKIE,
  USER_LOCALE_COOKIE,
} from "@/app/constants";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createEmbedSessionConfig,
  getAdminLookerSdk,
  getLookerCookieTokens,
  getLookerUserId,
  setLookerCookieTokens,
} from "../utils";

export async function GET() {
  const sdk = getAdminLookerSdk();
  try {
    const userAgent = (await headers()).get("user-agent");
    if (!userAgent) {
      return NextResponse.json(
        { message: "User agent header is required" },
        { status: 400 }
      );
    }
    const cookieStore = await cookies();
    const locale = cookieStore.get(USER_LOCALE_COOKIE)?.value;
    const userId = cookieStore.get(USER_ID_COOKIE)?.value;

    // this value should also be validated against the user table
    const brand = cookieStore.get(USER_BRAND_COOKIE)?.value;

    const existingTokens = getLookerCookieTokens(cookieStore);
    const session_reference = existingTokens?.session_reference_token;
    const config = createEmbedSessionConfig(
      userId,
      locale,
      brand,
      session_reference
    );

    // For cookieless embed, we need to acquire a session first, but shouldn't store the reference token
    const embedSession = await sdk.ok(
      sdk.acquire_embed_cookieless_session(config, {
        headers: {
          "User-Agent": userAgent,
        },
      })
    );

    const looker_user_id = await getLookerUserId(
      embedSession.authentication_token,
      cookieStore,
      userId
    );
    // Remove session_reference_token from embedSession

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_reference_token, ...rest } = embedSession;
    // Return session and token info
    const response = NextResponse.json({
      message: "Looker embed endpoint",
      status: "success",
      userId,
      ...rest,
      looker_user_id,
    });

    if (!looker_user_id) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    setLookerCookieTokens(response, embedSession);

    return response;
  } catch (error) {
    console.error("Looker embed error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate embed URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
