export const MATERIAL_TYPES = ["video", "presentation", "document", "website"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const TYPE_LABEL: Record<MaterialType, string> = {
  video: "Відео",
  presentation: "Презентація",
  document: "Документ",
  website: "Сайт",
};
