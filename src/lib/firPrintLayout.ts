import type { TemplateField } from "@/components/fir/FIRAlternativeForm";

/**
 * I campi del template sono stati disegnati sulle scansioni 1414x2000 usate
 * dall'editor originale. Le pagine ufficiali correnti sono immagini 1655x2340
 * ottenute da scansioni diverse: non basta quindi convertire due rettangoli
 * pagina, perché soprattutto il secondo foglio ha scala e margini differenti.
 *
 * Le matrici sotto sono state ricavate registrando otticamente le linee dei due
 * moduli (225 riscontri pagina 1, 247 pagina 2). Sono omografie old-pixel ->
 * current-pixel e mantengono allineato ogni singolo riquadro del formulario.
 */
const LEGACY_IMAGE_SIZE = { width: 1414, height: 2000 };
const CURRENT_IMAGE_SIZE = { width: 1655, height: 2340 };

type Homography = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

const PAGE_HOMOGRAPHY: Record<number, Homography> = {
  1: [
    1.177491314306, 0.001112533286425, -38.37237135097,
    0.0000005780836516394, 1.185079999351, -107.1256265494,
    -0.0000000846936216183, 0.00000391396156586, 1,
  ],
  2: [
    1.27007627314, 0.0007370644316654, -78.41466241776,
    0.0003449370324643, 1.270655780996, -104.3810822947,
    0.0000005807433368884, 0.00000008720549866679, 1,
  ],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function officialPrintFieldGeometry(field: TemplateField): Pick<TemplateField, "x" | "y" | "width" | "height"> {
  const matrix = PAGE_HOMOGRAPHY[field.page];
  if (!matrix) {
    return { x: field.x, y: field.y, width: field.width, height: field.height };
  }

  const project = (xPercent: number, yPercent: number) => {
    const x = (xPercent / 100) * LEGACY_IMAGE_SIZE.width;
    const y = (yPercent / 100) * LEGACY_IMAGE_SIZE.height;
    const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
    return {
      x: ((matrix[0] * x + matrix[1] * y + matrix[2]) / denominator / CURRENT_IMAGE_SIZE.width) * 100,
      y: ((matrix[3] * x + matrix[4] * y + matrix[5]) / denominator / CURRENT_IMAGE_SIZE.height) * 100,
    };
  };

  const corners = [
    project(field.x, field.y),
    project(field.x + field.width, field.y),
    project(field.x, field.y + field.height),
    project(field.x + field.width, field.y + field.height),
  ];
  const x = Math.min(...corners.map((point) => point.x));
  const y = Math.min(...corners.map((point) => point.y));
  const right = Math.max(...corners.map((point) => point.x));
  const bottom = Math.max(...corners.map((point) => point.y));

  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width: clamp(right - x, 0, 100 - clamp(x, 0, 100)),
    height: clamp(bottom - y, 0, 100 - clamp(y, 0, 100)),
  };
}