const VOTE_TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VOTE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VOTE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function numericParts(formatter: Intl.DateTimeFormat, date: Date) {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function saoPauloMidnightUtc(year: number, month: number, day: number) {
  const desired = Date.UTC(year, month - 1, day);
  let instant = desired;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = numericParts(dateTimeFormatter, new Date(instant));
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    instant = desired - (representedAsUtc - instant);
  }

  return new Date(instant);
}

export function currentVoteCycleStart(now = new Date()) {
  const parts = dateFormatter.formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const localSunday = new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) - weekdays[values.weekday],
    ),
  );

  return saoPauloMidnightUtc(
    localSunday.getUTCFullYear(),
    localSunday.getUTCMonth() + 1,
    localSunday.getUTCDate(),
  );
}

export function canChangeVote(updatedAt: string, now = new Date()) {
  return new Date(updatedAt).getTime() < currentVoteCycleStart(now).getTime();
}
