import type { LocaleId } from "./model";

const messages = {
  en: {
    add: "Add",
    addSource: "Add source",
    agenda: "Agenda",
    apply: "Apply",
    automatic: "Automatic",
    backlinks: "Backlinks",
    calendarNotes: "Calendar notes",
    calendarSource: "Calendar source",
    category: "Category",
    closeContext: "Close context",
    context: "Context",
    contextPanel: "Context panel",
    contextPanelDesc: "Show links, backlinks, people, and projects beside the month.",
    create: "Create",
    createEvent: "Create event note",
    createFailed: "The event note could not be created.",
    dateField: "Date",
    diagnosticEndBeforeStart: "End date is before start date",
    diagnosticEventTooLong: "Event exceeds the supported 370-day span",
    diagnosticInvalidDate: "Invalid date property",
    diagnosticInvalidEnd: "Invalid end date property",
    diagnosticMissingDate: "Missing date property",
    diagnostics: "Diagnostics",
    disabled: "Disabled",
    empty: "No events",
    enableSource: "Enable source",
    endDate: "End date",
    english: "English",
    folder: "Folder",
    folderDesc: "Vault-relative path; leave empty when using only a tag.",
    includeSubfolders: "Include subfolders",
    included: "Included in the calendar",
    invalidEmbedSource: "Invalid source. No events were loaded.",
    invalidFolder: "Folder must be a safe vault-relative path.",
    korean: "한국어",
    language: "Language",
    languageDesc: "Use Obsidian's language automatically, or override it.",
    links: "Links",
    missingSource: "Enter a folder or tag.",
    missingStart: "Start date property cannot be empty.",
    moreEvents: "{count} more events",
    moveFailed: "The event date could not be changed.",
    name: "Name",
    newEventNote: "New event note",
    next: "Next month",
    noDetectedFolder: "No dated-note folder was detected. Add one in calendar settings.",
    noSources: "Choose a folder containing dated Markdown notes.",
    noteNotFound: "Note not found",
    onboarding: "Choose a folder containing Markdown notes with a date property. Nothing is copied or uploaded.",
    open: "Open note",
    openCalendar: "Open Context Calendar",
    openSettingsHelp: "Open Settings → Community plugins → Context Calendar.",
    people: "People",
    previous: "Previous month",
    project: "Projects",
    propertyMapping: "Property mapping",
    readOnly: "This source is read-only.",
    related: "Related",
    removeSource: "Remove source",
    search: "Search events",
    settings: "Calendar settings",
    sourceDesc: "A source is a folder or tag containing dated Markdown notes.",
    sourceField: "Source",
    sources: "Sources",
    startDate: "Start date",
    sunday: "Sunday",
    tag: "Tag",
    tagDesc: "Optional; files must also have this tag.",
    titleDateRequired: "Title and a valid date are required.",
    titleField: "Title",
    today: "Today",
    useFolder: "Use folder",
    weekStartsOn: "Week starts on",
    writable: "Writable",
    writableDesc: "Allow note creation and date moves. Turn this off for generated or imported folders.",
    writableSourceRequired: "Add an enabled writable folder source in calendar settings.",
    monday: "Monday",
  },
  ko: {
    add: "추가",
    addSource: "소스 추가",
    agenda: "일정",
    apply: "적용",
    automatic: "자동",
    backlinks: "이 문서를 연결한 노트",
    calendarNotes: "일정 문서",
    calendarSource: "캘린더 소스",
    category: "분류",
    closeContext: "맥락 닫기",
    context: "맥락",
    contextPanel: "맥락 패널",
    contextPanelDesc: "월간 보기 옆에 링크, backlink, 인물, 프로젝트를 표시합니다.",
    create: "생성",
    createEvent: "일정 문서 생성",
    createFailed: "일정 문서를 생성하지 못했습니다.",
    dateField: "날짜",
    diagnosticEndBeforeStart: "종료일이 시작일보다 빠릅니다",
    diagnosticEventTooLong: "일정 기간이 지원 범위인 370일을 초과합니다",
    diagnosticInvalidDate: "날짜 속성이 올바르지 않습니다",
    diagnosticInvalidEnd: "종료일 속성이 올바르지 않습니다",
    diagnosticMissingDate: "날짜 속성이 없습니다",
    diagnostics: "진단",
    disabled: "사용 안 함",
    empty: "일정 없음",
    enableSource: "소스 사용",
    endDate: "종료일",
    english: "English",
    folder: "폴더",
    folderDesc: "Vault 상대 경로입니다. tag만 사용할 때는 비워 두세요.",
    includeSubfolders: "하위 폴더 포함",
    included: "캘린더에 포함됨",
    invalidEmbedSource: "소스가 올바르지 않아 일정을 불러오지 않았습니다.",
    invalidFolder: "Vault 안의 안전한 상대 경로를 입력하세요.",
    korean: "한국어",
    language: "언어",
    languageDesc: "Obsidian 언어를 자동으로 따르거나 직접 선택합니다.",
    links: "연결 문서",
    missingSource: "폴더나 tag를 입력하세요.",
    missingStart: "시작일 속성은 비울 수 없습니다.",
    moreEvents: "일정 {count}개 더 보기",
    moveFailed: "일정 날짜를 변경하지 못했습니다.",
    name: "이름",
    newEventNote: "새 일정 문서",
    next: "다음 달",
    noDetectedFolder: "날짜 문서 폴더를 찾지 못했습니다. 캘린더 설정에서 추가하세요.",
    noSources: "날짜 속성이 있는 Markdown 폴더를 선택하세요.",
    noteNotFound: "문서를 찾을 수 없음",
    onboarding: "날짜 속성이 있는 Markdown 폴더를 선택하세요. 파일을 복사하거나 업로드하지 않습니다.",
    open: "문서 열기",
    openCalendar: "Context Calendar 열기",
    openSettingsHelp: "설정 → 커뮤니티 플러그인 → Context Calendar를 여세요.",
    people: "인물",
    previous: "이전 달",
    project: "프로젝트",
    propertyMapping: "속성 연결",
    readOnly: "이 소스는 읽기 전용입니다.",
    related: "관련 문서",
    removeSource: "소스 삭제",
    search: "일정 검색",
    settings: "캘린더 설정",
    sourceDesc: "날짜가 있는 Markdown 문서를 폴더나 tag로 모읍니다.",
    sourceField: "소스",
    sources: "소스",
    startDate: "시작일",
    sunday: "일요일",
    tag: "Tag",
    tagDesc: "선택 사항이며, 지정하면 문서에도 같은 tag가 있어야 합니다.",
    titleDateRequired: "제목과 올바른 날짜가 필요합니다.",
    titleField: "제목",
    today: "오늘",
    useFolder: "이 폴더 사용",
    weekStartsOn: "한 주 시작",
    writable: "수정 허용",
    writableDesc: "문서 생성과 날짜 이동을 허용합니다. 자동 생성·가져온 폴더는 끄세요.",
    writableSourceRequired: "사용 중인 수정 가능 폴더 소스를 캘린더 설정에 추가하세요.",
    monday: "월요일",
  },
} as const;

export type MessageKey = keyof typeof messages.en;

function systemLanguage(): string {
  return typeof navigator === "undefined" ? "en-US" : navigator.language;
}

export function resolvedLocale(locale: LocaleId, language = systemLanguage()): "en" | "ko" {
  if (locale !== "auto") return locale;
  return language.toLocaleLowerCase().startsWith("ko") ? "ko" : "en";
}

export function translate(locale: LocaleId, key: MessageKey): string {
  return messages[resolvedLocale(locale)][key];
}

export function formatMessage(locale: LocaleId, key: MessageKey, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    translate(locale, key),
  );
}

export function monthTitle(locale: LocaleId, value: Date): string {
  return new Intl.DateTimeFormat(resolvedLocale(locale), { month: "long", year: "numeric" }).format(value);
}

export function weekdayNames(locale: LocaleId, firstDay: 0 | 1): string[] {
  const formatter = new Intl.DateTimeFormat(resolvedLocale(locale), { weekday: "short" });
  const sunday = new Date(2026, 7, 16);
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(sunday);
    value.setDate(value.getDate() + index + firstDay);
    return formatter.format(value);
  });
}

export function firstDayOfWeek(
  locale: LocaleId,
  setting: "auto" | "sunday" | "monday",
  language = systemLanguage(),
): 0 | 1 {
  if (setting === "sunday") return 0;
  if (setting === "monday") return 1;
  if (resolvedLocale(locale, language) === "ko") return 0;
  const region = language.split("-")[1]?.toLocaleUpperCase();
  return region === "US" || region === "CA" ? 0 : 1;
}
