"use client";

import { useEffect, useState } from "react";

export function useApiKey() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setApiKey(sessionStorage.getItem("openai_api_key") || "");
  }, []);

  useEffect(() => {
    if (apiKey) sessionStorage.setItem("openai_api_key", apiKey);
  }, [apiKey]);

  return { apiKey, setApiKey };
}
