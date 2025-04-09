import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAdminLookerSdk,
  getLookerCookieTokens,
  getLookerUserId,
  setLookerApiAccessToken,
  setLookerCookieTokens,
} from "../utils";

export async function PUT() {
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
    const lookerTokens = getLookerCookieTokens(cookieStore);
    const looker_user_id = await getLookerUserId(
      lookerTokens?.authentication_token,
      cookieStore
    );

    if (!lookerTokens) {
      return NextResponse.json(
        { message: "No Looker tokens found in cookies" },
        { status: 401 }
      );
    }

    const tokens = sdk.ok(
      sdk.generate_tokens_for_cookieless_session(lookerTokens, {
        headers: {
          "User-Agent": userAgent,
        },
      })
    );

    const api_access_token = sdk.ok(sdk.login_user(looker_user_id));

    const [embed, api] = await Promise.all([tokens, api_access_token]);

    // Remove session_reference_token from embed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_reference_token, ...rest } = embed;
    const response = NextResponse.json({
      message: "Embed tokens generated successfully",
      ...rest,
    });

    setLookerCookieTokens(response, embed);

    setLookerApiAccessToken(response, api);

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
