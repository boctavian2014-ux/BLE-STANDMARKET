export function placeholderInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export function composeOfferCardLabel(input: {
  title: string;
  discount: string;
  stand: string;
}): string {
  return [input.title, input.discount, input.stand]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function isHotDiscount(percent: number | null | undefined): boolean {
  return percent != null && percent >= 15;
}
