import { describe, expect, it } from "vitest";
import { inventoryCorrection, signedInventoryQuantity } from "@/lib/firFinalSync";

describe("riconciliazione giacenze FIR", () => {
  it("ripristina uno scarico neutralizzato da una compensazione precedente", () => {
    const current =
      signedInventoryQuantity("SCARICO", 1820) +
      signedInventoryQuantity("CARICO", 1820);

    expect(inventoryCorrection(-1820, current)).toEqual({
      tipoMovimento: "SCARICO",
      quantitaKg: 1820,
    });
  });

  it("non duplica un FIR già contabilizzato correttamente", () => {
    expect(inventoryCorrection(-1820, -1820)).toBeNull();
  });

  it("applica solo la differenza quando cambia il peso", () => {
    expect(inventoryCorrection(-2000, -1820)).toEqual({
      tipoMovimento: "SCARICO",
      quantitaKg: 180,
    });
  });
});