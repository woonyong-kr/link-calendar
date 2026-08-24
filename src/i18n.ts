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
    calendarScope: "Calendar scope",
    calendarSource: "Calendar source",
    category: "Category",
    chooseFolder: "Choose source folder",
    clearFilter: "Clear filter",
    closeContext: "Close context",
    context: "Context",
    contextPanel: "Context panel",
    contextPanelDesc: "Show links, backlinks, people, and projects beside the month.",
    connectedNotes: "{count} connected notes",
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
    detectedDateProperty: "Detected from valid date properties in this folder.",
    empty: "No events",
    enableSource: "Enable source",
    endDate: "End date",
    eventsOnDate: "{count} events on this date",
    exitFocusMode: "Exit focus mode",
    english: "English",
    folder: "Folder",
    folderDesc: "Required Vault-relative boundary. Only Markdown notes inside this folder are indexed.",
    folderRequired: "Folder required",
    includeSubfolders: "Include subfolders",
    included: "Included in the calendar",
    invalidEmbedSource: "Invalid source. No events were loaded.",
    invalidFolder: "Folder must be a safe vault-relative path.",
    korean: "한국어",
    language: "Language",
    languageDesc: "Use Obsidian's language automatically, or override it.",
    links: "Links",
    filterMonth: "Filter month",
    focusMode: "Focus month",
    missingSource: "Choose a folder. A tag can only narrow that folder.",
    missingStart: "Start date property cannot be empty.",
    moreEvents: "{count} more events",
    moveFailed: "The event date could not be changed.",
    name: "Name",
    newEventNote: "New event note",
    next: "Next month",
    noDetectedFolder: "No dated-note folder was detected. Add one in calendar settings.",
    noDatedNotes: "No valid date values were detected. You can still add the source and map the property later.",
    noFolders: "No folders found",
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
    readOnlyShort: "Read-only",
    revealActiveNote: "Reveal active note in calendar",
    related: "Related",
    removeSource: "Remove source",
    search: "Search events",
    settings: "Calendar settings",
    sourceDesc: "A source indexes dated Markdown notes inside one folder. A tag can narrow the result.",
    sourceField: "Source",
    sourcePreview: "Preview calendar source",
    sourcePreviewSummary: "{dated} of {total} Markdown notes contain a valid date.",
    sources: "Sources",
    allSources: "All",
    startDate: "Start date",
    sunday: "Sunday",
    tag: "Tag",
    tagDesc: "Optional; files must also have this tag.",
    titleDateRequired: "Title and a valid date are required.",
    titleField: "Title",
    today: "Today",
    visibleEvents: "{count} events",
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
    backlinks: "연결한 노트",
    calendarNotes: "일정 문서",
    calendarScope: "캘린더 범위",
    calendarSource: "캘린더 소스",
    category: "분류",
    chooseFolder: "소스 폴더 선택",
    clearFilter: "필터 해제",
    closeContext: "맥락 닫기",
    context: "맥락",
    contextPanel: "맥락 패널",
    contextPanelDesc: "월간 보기 옆에 링크, backlink, 인물, 프로젝트를 표시합니다.",
    connectedNotes: "연결 문서 {count}개",
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
    detectedDateProperty: "이 폴더의 올바른 날짜 속성을 기준으로 감지했습니다.",
    empty: "일정 없음",
    enableSource: "소스 사용",
    endDate: "종료일",
    eventsOnDate: "이 날짜의 일정 {count}개",
    exitFocusMode: "집중 보기 종료",
    english: "English",
    folder: "폴더",
    folderDesc: "필수 Vault 상대 경계입니다. 이 폴더 안의 Markdown 문서만 색인합니다.",
    folderRequired: "폴더 필요",
    includeSubfolders: "하위 폴더 포함",
    included: "캘린더에 포함됨",
    invalidEmbedSource: "소스가 올바르지 않아 일정을 불러오지 않았습니다.",
    invalidFolder: "Vault 안의 안전한 상대 경로를 입력하세요.",
    korean: "한국어",
    language: "언어",
    languageDesc: "Obsidian 언어를 자동으로 따르거나 직접 선택합니다.",
    links: "연결 문서",
    filterMonth: "월간 보기 필터",
    focusMode: "월간 집중 보기",
    missingSource: "폴더를 선택하세요. Tag는 해당 폴더 안에서만 범위를 좁힙니다.",
    missingStart: "시작일 속성은 비울 수 없습니다.",
    moreEvents: "일정 {count}개 더 보기",
    moveFailed: "일정 날짜를 변경하지 못했습니다.",
    name: "이름",
    newEventNote: "새 일정 문서",
    next: "다음 달",
    noDetectedFolder: "날짜 문서 폴더를 찾지 못했습니다. 캘린더 설정에서 추가하세요.",
    noDatedNotes: "올바른 날짜 값을 찾지 못했습니다. 소스를 추가한 뒤 속성을 직접 연결할 수 있습니다.",
    noFolders: "폴더가 없습니다",
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
    readOnlyShort: "읽기 전용",
    revealActiveNote: "현재 문서를 캘린더에서 찾기",
    related: "관련 문서",
    removeSource: "소스 삭제",
    search: "일정 검색",
    settings: "캘린더 설정",
    sourceDesc: "한 폴더 안의 날짜 Markdown 문서를 색인하며, tag로 결과를 더 좁힐 수 있습니다.",
    sourceField: "소스",
    sourcePreview: "캘린더 소스 미리보기",
    sourcePreviewSummary: "Markdown 문서 {total}개 중 {dated}개에 올바른 날짜가 있습니다.",
    sources: "소스",
    allSources: "전체",
    startDate: "시작일",
    sunday: "일요일",
    tag: "Tag",
    tagDesc: "선택 사항이며, 지정하면 문서에도 같은 tag가 있어야 합니다.",
    titleDateRequired: "제목과 올바른 날짜가 필요합니다.",
    titleField: "제목",
    today: "오늘",
    visibleEvents: "일정 {count}개",
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
