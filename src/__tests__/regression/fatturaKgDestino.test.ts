import { describe, it, expect } from "vitest";
import { kgDestinoFir } from "@/lib/fatturaKgDestino";

describe("fattura: kg a destino", () => {
  it("usa i kg accettati a destino, non quelli di partenza", () => {
    expect(kgDestinoFir({ quantita: 1000, form_data: { quantita: 1000, quantita_accettata: 980 } })).toBe(980);
  });
  it("senza peso confermato a destino non usa il peso di partenza", () => {
    expect(kgDestinoFir({ quantita: 1000, form_data: { quantita: 1000 } })).toBeNull();
  });
  it("usa il peso a destino del registro se il formulario non lo riporta", () => {
    expect(kgDestinoFir({ quantita: 1000, form_data: {} }, 770)).toBe(770);
  });
});
