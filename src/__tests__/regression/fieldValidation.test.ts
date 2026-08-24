import { describe, it, expect } from "vitest";
import {
  validateCfPiva,
  validatePartitaIva,
  validateDataNascita,
  validateCap,
  validateEmail,
  validateTelefono,
  autoValidateByLabel,
} from "@/lib/fieldValidation";

describe("fieldValidation", () => {
  it("accetta valori vuoti", () => {
    expect(validateCfPiva("")).toBeNull();
    expect(validateDataNascita("")).toBeNull();
  });

  it("segnala partite IVA con cifre errate", () => {
    expect(validatePartitaIva("1234567890")).toMatch(/11/);
    expect(validatePartitaIva("123456789012")).toMatch(/11/);
    expect(validatePartitaIva("12345678901")).toMatch(/controllo/);
    expect(validatePartitaIva("00743110157")).toBeNull(); // valida
  });

  it("segnala codici fiscali di lunghezza errata", () => {
    expect(validateCfPiva("RSSMRA85M01H50")).toMatch(/16/);
    expect(validateCfPiva("RSSMRA85M01H501Z")).toBeNull();
    expect(validateCfPiva("RSSMRA85M01H501A")).toMatch(/non valido/);
  });

  it("segnala date di nascita implausibili", () => {
    expect(validateDataNascita("01/01/1910")).toMatch(/1920/);
    expect(validateDataNascita("01/01/2030")).toMatch(/futuro/);
    expect(validateDataNascita("32/01/1980")).toMatch(/non valida/);
    expect(validateDataNascita("01/01/1980")).toBeNull();
  });

  it("valida CAP, email e telefono", () => {
    expect(validateCap("101")).toMatch(/5 cifre/);
    expect(validateCap("10121")).toBeNull();
    expect(validateEmail("pippo@")).toMatch(/non valido/);
    expect(validateEmail("a@b.it")).toBeNull();
    expect(validateTelefono("12")).toMatch(/corto/);
    expect(validateTelefono("+39 011 1234567")).toBeNull();
  });

  it("auto-valida in base all'etichetta", () => {
    expect(autoValidateByLabel("Codice Fiscale / P.IVA", "123")).toBeTruthy();
    expect(autoValidateByLabel("Denominazione", "Qualsiasi cosa")).toBeNull();
    expect(autoValidateByLabel("Data di nascita", "01/01/1900")).toBeTruthy();
    expect(autoValidateByLabel("Targa Automezzo", "AB123CD")).toBeNull();
  });
});
