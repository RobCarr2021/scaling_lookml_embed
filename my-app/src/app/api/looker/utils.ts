import {
  COOKIE_MAX_AGE,
  LOOKER_API_ACCESS_TOKEN_COOKIE,
  LOOKER_API_EMBED_TOKENS,
  LOOKER_USER_ID_COOKIE,
} from "@/app/constants";
import { LookerNodeSDK } from "@looker/sdk-node";
import { AuthToken } from "@looker/sdk-rtl";
import {
  IAccessToken,
  IEmbedCookielessSessionAcquireResponse,
} from "@looker/sdk/lib/4.0/models";
import crypto from "crypto";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { NextResponse } from "next/server";
const JWT_SECRET = process.env.JWT_SECRET;

export const getLookerCookieTokens = (
  cookieStore: ReadonlyRequestCookies
): IEmbedCookielessSessionAcquireResponse | undefined => {
  try {
    const lookerTokens = cookieStore.get(LOOKER_API_EMBED_TOKENS)?.value;
    if (!lookerTokens) {
      return;
    }
    const tokens = JSON.parse(lookerTokens);
    return {
      session_reference_token: decrypt(tokens[0]),
      api_token: tokens[1],
      authentication_token: tokens[2],
      navigation_token: tokens[3],
      api_token_ttl: tokens[4],
      authentication_token_ttl: tokens[5],
      navigation_token_ttl: tokens[6],
      session_reference_token_ttl: tokens[7],
    } as IEmbedCookielessSessionAcquireResponse;
  } catch {
    // do nothing
  }
  return;
};

export const setLookerCookieTokens = (
  response: NextResponse,
  tokens: IEmbedCookielessSessionAcquireResponse
) => {
  const arr = [
    encrypt(tokens.session_reference_token),
    tokens.api_token,
    tokens.authentication_token,
    tokens.navigation_token,
    tokens.api_token_ttl,
    tokens.authentication_token_ttl,
    tokens.navigation_token_ttl,
    tokens.session_reference_token_ttl,
  ];
  response.cookies.set(LOOKER_API_EMBED_TOKENS, JSON.stringify(arr), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE, // 30 days
  });
};

export const getApiAccessToken = (cookieStore: ReadonlyRequestCookies) => {
  return parseToken(cookieStore.get(LOOKER_API_ACCESS_TOKEN_COOKIE)?.value) as
    | (IAccessToken & { expires_on: number })
    | undefined;
};

export const setLookerUserId = (
  response: NextResponse,
  looker_user_id: string
) => {
  response.cookies.set(LOOKER_USER_ID_COOKIE, looker_user_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE, // 30 days
  });
};
export const setLookerApiAccessToken = (
  response: NextResponse,
  token: IAccessToken
) => {
  response.cookies.set(
    LOOKER_API_ACCESS_TOKEN_COOKIE,
    JSON.stringify({
      ...token,
      expires_on: token.expires_in
        ? Date.now() + token.expires_in * 1000
        : undefined,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE, // 30 days
    }
  );
};

export const getUserLookerSdk = (cookieStore: ReadonlyRequestCookies) => {
  const looker_user_id = cookieStore.get(LOOKER_USER_ID_COOKIE)?.value;
  if (!looker_user_id) {
    throw new Error("looker_user_id is required");
  }
  const looker_api_access_token = parseToken(
    cookieStore.get(LOOKER_API_ACCESS_TOKEN_COOKIE)?.value
  );

  const sdk = LookerNodeSDK.init40();
  sdk.authSession.sudoId = looker_user_id;
  if (looker_api_access_token) {
    // @ts-expect-error - This is a private property
    sdk.authSession._sudoToken = new AuthToken(looker_api_access_token);
  }
  return sdk;
};

export const getAdminLookerSdk = () => {
  return LookerNodeSDK.init40();
};

function deriveKey(secret: string): Buffer {
  // Use PBKDF2 to derive a 32-byte key from the secret
  return crypto.pbkdf2Sync(secret, "bryan-kewl-demo", 100000, 32, "sha256");
}

export function encrypt(token: string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const iv = crypto.randomBytes(16);
  const key = deriveKey(JWT_SECRET);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(token: string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const [iv, encrypted] = token.split(":");
  const key = deriveKey(JWT_SECRET);
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function parseToken(token?: string) {
  if (!token) return undefined;
  try {
    return JSON.parse(token);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    return undefined;
  }
}

export const getEnv = (key: string, required: boolean = true): string => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const getFormData = <T = string>(
  formData: FormData,
  key: string,
  required: boolean = true
): T => {
  const value = formData.get(key) as T;
  if (required && !value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const getLookerUserId = async (
  authentication_token?: string,
  cookieStore?: ReadonlyRequestCookies,
  userId?: string
) => {
  let looker_user_id: string | undefined;
  if (authentication_token) {
    // sometimes user_id is not present
    looker_user_id = JSON.parse(atob(authentication_token.split(".")[1]))
      .credentials.user_id;
  }
  if (!looker_user_id) {
    // cookie may have expired
    looker_user_id = cookieStore?.get(LOOKER_USER_ID_COOKIE)?.value;
  }
  if (!looker_user_id && userId) {
    // lookup user_id from user table
    const sdk = getAdminLookerSdk();
    try {
      const user = await sdk.ok(sdk.user_for_credential("embed", userId, "id"));
      looker_user_id = user.id;
    } catch {
      // do nothing
    }
  }
  return Promise.resolve(looker_user_id);
};

export const createEmbedSessionConfig = (
  userId: string,
  locale?: string,
  brand?: string,
  session_reference_token?: string
) => ({
  external_user_id: userId,
  first_name: "Embedded",
  last_name: "User",
  session_length: 3600,
  force_logout_login: true,
  permissions: [
    "access_data",
    "see_looks",
    "see_user_dashboards",
    "save_content",
    "see_lookml_dashboards",
    "explore",
    "embed_browse_spaces",
  ],
  models: ["thelook"],
  group_ids: [],
  user_attributes: {
    locale: locale || "en_US",
    brand: brand || "Levi's",
  },
  session_reference_token: session_reference_token,
});
