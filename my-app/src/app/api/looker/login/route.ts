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
  getApiAccessToken,
  getLookerUserId,
  setLookerApiAccessToken,
  setLookerUserId,
} from "../utils";

export async function GET() {
  try {
    const userAgent = (await headers()).get("user-agent");
    const sdk = getAdminLookerSdk();
    const cookieStore = await cookies();
    const locale = cookieStore.get(USER_LOCALE_COOKIE)?.value;
    const brand = cookieStore.get(USER_BRAND_COOKIE)?.value;
    const access_token = getApiAccessToken(cookieStore);
    if (
      access_token?.expires_on &&
      access_token?.expires_on > Date.now() - 5 * 60 * 1000 // 5 minutes
    ) {
      return NextResponse.json({
        message: "API token is still valid",
      });
    } else {
      let user_id = cookieStore.get(USER_ID_COOKIE)?.value;

      if (!user_id) {
        user_id = Math.random().toString(36).substring(2, 15);
      }

      let looker_user_id = await getLookerUserId(
        undefined,
        cookieStore,
        user_id
      );

      if (!looker_user_id) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _r = await sdk.ok(
          sdk.acquire_embed_cookieless_session(
            createEmbedSessionConfig(user_id, locale, brand),
            {
              headers: {
                "User-Agent": userAgent,
              },
            }
          )
        );
        const user = await sdk.ok(
          sdk.user_for_credential("embed", user_id, "id")
        );

        looker_user_id = user.id;
      }

      if (!looker_user_id) {
        return NextResponse.json(
          { message: "Looker user ID not found" },
          { status: 404 }
        );
      }

      const new_access_token = await sdk.ok(sdk.login_user(looker_user_id));
      const response = NextResponse.json({
        message: "API token acquired successfully",
        access_token: new_access_token,
      });

      setLookerApiAccessToken(response, new_access_token);
      setLookerUserId(response, looker_user_id);
      return response;
    }
  } catch (error) {
    console.error("Error acquiring API token:", error);
    return NextResponse.json(
      {
        message: "Failed to acquire API token",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
