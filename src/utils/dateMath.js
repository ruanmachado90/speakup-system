// Soma `months` meses a `date` sem estourar pro mês seguinte quando o dia de
// origem (29/30/31) não existe no mês de destino — trava no último dia
// daquele mês (ex: 31/01 + 1 mês -> 28/02, não 03/03).
export function addMonthsClamped(date, months) {
  const day = date.getDate();
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d;
}
