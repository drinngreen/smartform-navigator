import { cfValido } from "./rentriValidazione";
import { test, expect } from "vitest";
test("cf", () => { expect(cfValido("NDRMNL83H21L781V")).toBe(true); expect(cfValido("RSSMRA85T10A562S")).toBe(true); expect(cfValido("NDRMNL83H21L781A")).toBe(false); });
