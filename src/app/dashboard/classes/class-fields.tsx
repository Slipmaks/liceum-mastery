import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const select = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";

/** Name, grade (паралель) and homeroom teacher: shared by «Новий клас» and the class page. */
export function ClassFields({ teachers, values }: { teachers: { id: number; name: string }[]; values?: { name: string; grade: number; homeroomTeacherId: number | null } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_6rem_1fr]">
      <div className="grid gap-1.5">
        <Label htmlFor="class-name">Назва</Label>
        <Input id="class-name" name="name" required maxLength={20} placeholder="9-А" defaultValue={values?.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="class-grade">Паралель</Label>
        <select id="class-grade" name="grade" defaultValue={values?.grade ?? 9} className={select}>
          {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="class-homeroom">Класний керівник</Label>
        <select id="class-homeroom" name="homeroom" defaultValue={values?.homeroomTeacherId ?? ""} className={select}>
          <option value="">Не призначено</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
