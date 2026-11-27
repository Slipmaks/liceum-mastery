import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type ControlledFields = {
  name: string;
  grade: string;
  homeroom: string;
  onChange: (patch: Partial<{ name: string; grade: string; homeroom: string }>) => void;
};

/** Name, grade (паралель) and homeroom teacher: shared by «Новий клас» and the class page. */
export function ClassFields({
  teachers,
  values,
  controlled,
  error,
}: {
  teachers: { id: number; name: string }[];
  values?: { name: string; grade: number; homeroomTeacherId: number | null };
  controlled?: ControlledFields;
  error?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_6rem_1fr]">
      <div className="grid gap-1.5">
        <Label htmlFor="class-name">Назва</Label>
        {controlled ? (
          <Input
            id="class-name"
            name="name"
            required
            maxLength={20}
            placeholder="9-А"
            value={controlled.name}
            onChange={e => controlled.onChange({ name: e.target.value })}
            aria-invalid={error || undefined}
          />
        ) : (
          <Input id="class-name" name="name" required maxLength={20} placeholder="9-А" defaultValue={values?.name} aria-invalid={error || undefined} />
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="class-grade">Паралель</Label>
        {controlled ? (
          <Select id="class-grade" name="grade" value={controlled.grade} onChange={e => controlled.onChange({ grade: e.target.value })}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        ) : (
          <Select id="class-grade" name="grade" defaultValue={values?.grade ?? 9}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="class-homeroom">Класний керівник</Label>
        {controlled ? (
          <Select id="class-homeroom" name="homeroom" value={controlled.homeroom} onChange={e => controlled.onChange({ homeroom: e.target.value })}>
            <option value="">Не призначено</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select id="class-homeroom" name="homeroom" defaultValue={values?.homeroomTeacherId ?? ""}>
            <option value="">Не призначено</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
