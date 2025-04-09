"use client";
import { useState } from "react";
import useSWR from "swr";
import AnimatedLogo from "./components/LoadingAnimation";
import Main from "./components/Main";
import { USER_ID_COOKIE } from "./constants";
export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _uid = useState(() => {
    if (typeof window === "undefined") {
      return;
    }
    const cookies = document.cookie.split(";");
    const userIdCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("u=")
    );
    if (userIdCookie) {
      return userIdCookie.split("=")[1];
    }
    const newUserId = Math.random().toString(36).substring(2, 15);
    const existingCookies = document.cookie;
    const updatedCookie = `${USER_ID_COOKIE}=${newUserId};path=/;max-age=${
      60 * 60 * 24 * 30
    }`;
    document.cookie = existingCookies
      ? `${existingCookies}; ${updatedCookie}`
      : updatedCookie;
    return newUserId;
  });
  const login = useSWR("/api/looker/login", (url) =>
    fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error((await res.json()).message || "Failed to login");
      }
      return res.json();
    })
  );

  const dashboards = useSWR(
    !(login.isLoading || login.isValidating) ? "/api/looker/dashboards" : null,
    (url) => fetch(url).then((res) => res.json())
  );

  return (
    <div className="dashboard" style={{ position: "relative" }}>
      {login.isLoading || dashboards.isLoading ? (
        <AnimatedLogo
          svg_height={150}
          svg_width={"auto"}
          display={"flex"}
          justifyContent={"center"}
          alignItems={"center"}
          flexGrow={1}
          marginBottom={"400px"}
        />
      ) : login.error ? (
        <div>Error</div>
      ) : (
        <Main />
      )}
    </div>
  );
}
