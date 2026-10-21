import { daysFromToday, relativeDue } from "../lib/dates";

export default function DueStamp({ date }) {
  if (!date) return null;
  const diff = daysFromToday(date);
  const tone = diff < 0 ? "is-late" : diff <= 1 ? "is-soon" : "";
  return (
    <time className={`due ${tone}`} dateTime={date}>
      {relativeDue(date)}
    </time>
  );
}
