/** Только цифры. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Маска телефона РФ при вводе: +7 XXX XXX-XX-XX.
 * Ведущая 8 заменяется на +7, при вводе с 9 подставляется +7.
 */
export function formatRuPhoneInput(raw: string): string {
  let d = digitsOnly(raw);
  if (!d.length) return "";
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (d[0] === "9") d = "7" + d;
  if (d[0] !== "7") d = "7" + d.replace(/^7+/, "");
  d = d.slice(0, 11);

  const n = d.slice(1);
  let out = "+7";
  if (n.length >= 1) {
    out += " " + n.slice(0, 3);
  } else return out;
  if (n.length > 3) {
    out += " " + n.slice(3, 6);
  }
  if (n.length > 6) {
    out += "-" + n.slice(6, 8);
  }
  if (n.length > 8) {
    out += "-" + n.slice(8, 10);
  }
  return out;
}

/** Как formatRuPhoneInput, но при удалении разделителя (пробел/дефис) убирает последнюю цифру. */
export function formatRuPhoneInputWithPrev(prev: string, next: string): string {
  if (next.length < prev.length) {
    const prevDigits = digitsOnly(prev);
    const nextDigits = digitsOnly(next);
    if (nextDigits.length === prevDigits.length && prevDigits.length > 0) {
      return formatRuPhoneInput(prevDigits.slice(0, -1));
    }
  }
  return formatRuPhoneInput(next);
}

/**
 * Маска даты ДД.ММ.ГГГГ: точки ставятся автоматически, только цифры.
 */
export function formatRuDateInput(raw: string): string {
  const d = digitsOnly(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}
