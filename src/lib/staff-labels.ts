// Plain labels, safe for client components (lib/staff.ts reaches the database).
export const RANK_LABEL = { director: "Директор", deputy: "Заступник директора", teacher: "Вчитель" } as const;
export type Rank = keyof typeof RANK_LABEL;
