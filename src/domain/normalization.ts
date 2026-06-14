import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { IdentifierType, NormalizedIdentifier, ObjectType } from "./types.js";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "yclid",
  "ref",
  "ref_src",
]);

const PLATFORM_DOMAINS: Record<string, string> = {
  "t.me": "telegram",
  "telegram.me": "telegram",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "wa.me": "whatsapp",
  "api.whatsapp.com": "whatsapp",
  "whatsapp.com": "whatsapp",
};

export function normalizeIdentifier(input: string): NormalizedIdentifier {
  const rawInput = input.trim();

  if (!rawInput) {
    return buildTextIdentifier(rawInput);
  }

  const url = parseUrl(rawInput);
  if (url) {
    return normalizeUrl(rawInput, url);
  }

  const phone = normalizePhone(rawInput);
  if (phone) {
    return {
      rawInput,
      objectType: "phone",
      identifierType: "phone",
      platformKey: "phone",
      normalizedValue: phone,
      displayValue: phone,
      parentNormalizedValue: null,
      isAmbiguous: false,
    };
  }

  if (isLikelyDomain(rawInput)) {
    const domain = normalizeDomain(rawInput);
    return {
      rawInput,
      objectType: "website",
      identifierType: "domain",
      platformKey: "website",
      normalizedValue: domain,
      displayValue: domain,
      parentNormalizedValue: null,
      isAmbiguous: false,
    };
  }

  if (rawInput.startsWith("@") && rawInput.length > 1) {
    return {
      rawInput,
      objectType: "app_profile",
      identifierType: "username",
      platformKey: "unknown",
      normalizedValue: normalizeUsername(rawInput),
      displayValue: rawInput,
      parentNormalizedValue: null,
      isAmbiguous: true,
    };
  }

  return buildTextIdentifier(rawInput);
}

function buildTextIdentifier(rawInput: string): NormalizedIdentifier {
  return {
    rawInput,
    objectType: "service",
    identifierType: "service_name",
    platformKey: "unknown",
    normalizedValue: rawInput.toLowerCase().replace(/\s+/g, " ").trim(),
    displayValue: rawInput,
    parentNormalizedValue: null,
    isAmbiguous: true,
  };
}

function normalizeUrl(rawInput: string, url: URL): NormalizedIdentifier {
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  const domain = normalizeDomain(url.hostname);
  const platformKey = PLATFORM_DOMAINS[domain] ?? "website";

  if (platformKey === "telegram") {
    const username = firstPathSegment(url);
    if (username) {
      return appProfile(rawInput, "telegram", "username", username, `@${username}`);
    }
  }

  if (platformKey === "instagram") {
    const username = firstPathSegment(url);
    if (username) {
      return appProfile(rawInput, "instagram", "username", username, `@${username}`);
    }
  }

  if (platformKey === "whatsapp") {
    const phone = normalizePhone(firstPathSegment(url) ?? rawInput);
    if (phone) {
      return appProfile(rawInput, "whatsapp", "phone", phone, phone);
    }
  }

  const cleanPath = normalizePath(url.pathname);
  if (!cleanPath) {
    return {
      rawInput,
      objectType: "website",
      identifierType: "domain",
      platformKey: "website",
      normalizedValue: domain,
      displayValue: domain,
      parentNormalizedValue: null,
      isAmbiguous: false,
    };
  }

  return {
    rawInput,
    objectType: "website_profile",
    identifierType: "url_path",
    platformKey: "website",
    normalizedValue: `${domain}${cleanPath}`,
    displayValue: `${domain}${cleanPath}`,
    parentNormalizedValue: domain,
    isAmbiguous: false,
  };
}

function appProfile(
  rawInput: string,
  platformKey: string,
  identifierType: IdentifierType,
  value: string,
  displayValue: string,
): NormalizedIdentifier {
  return {
    rawInput,
    objectType: "app_profile",
    identifierType,
    platformKey,
    normalizedValue: identifierType === "username" ? normalizeUsername(value) : value,
    displayValue,
    parentNormalizedValue: platformKey,
    isAmbiguous: false,
  };
}

function parseUrl(rawInput: string): URL | null {
  try {
    return new URL(rawInput);
  } catch {
    try {
      if (rawInput.includes(".") && !rawInput.includes(" ")) {
        return new URL(`https://${rawInput}`);
      }
      return null;
    } catch {
      return null;
    }
  }
}

function normalizePhone(input: string): string | null {
  const candidate = input.replace(/[^\d+]/g, "");
  if (candidate.length < 7) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(candidate);
  if (parsed?.isValid()) {
    return parsed.number;
  }

  const candidateWithPlus = candidate.startsWith("+") ? candidate : `+${candidate}`;
  const parsedWithPlus = parsePhoneNumberFromString(candidateWithPlus);
  return parsedWithPlus?.isValid() ? parsedWithPlus.number : null;
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return path === "/" ? "" : path.toLowerCase();
}

function normalizeUsername(input: string): string {
  return input.replace(/^@/, "").trim().toLowerCase();
}

function firstPathSegment(url: URL): string | null {
  const [segment] = url.pathname.split("/").filter(Boolean);
  return segment ? decodeURIComponent(segment) : null;
}

function isLikelyDomain(input: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input.trim());
}
