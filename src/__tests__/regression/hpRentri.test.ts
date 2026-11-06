import { describe, it, expect } from "vitest";
import { hpListRentri } from "@/data/hpCaratteristiche";
describe("HP verso RENTRI", () => {
  it("usa due cifre", () => {
    expect(hpListRentri(["HP4", "hp 14", "HP05"])).toEqual(["HP04", "HP05", "HP14"]);
  });
});
