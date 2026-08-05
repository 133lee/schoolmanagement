import { redirect } from "next/navigation";

export default function TimetableRedirect() {
  redirect("/admin/timetable/view");
}
