# Simple Calendar

Simple Calendar는 Obsidian Markdown 일정 파일을 읽어 한 달 단위로 정리해 보여 주는 가벼운 플러그인이다. 일정 데이터는 Markdown에만 남고, 플러그인은 파일을 만들거나 고치거나 외부 서비스와 동기화하지 않는다.

## 화면 원칙

- 월간 보기만 제공한다.
- 카드에는 시간을 반복하지 않고 제목과 유형 표시만 보여 준다.
- 긴 제목은 두 줄까지만 표시하고, 마우스를 올리거나 키보드로 선택하면 전체 제목을 보여 준다.
- 날짜별 카드와 오늘 표식은 충분히 구분하되, 색은 저채도 팔레트로 제한한다.

## Markdown 계약

```markdown
```woon-simple-calendar
source: inbox/calendar/events
date_field: Date
category_field: Category
```
```

`source` 아래의 각 Markdown 문서는 `Date: YYYY-MM-DD` frontmatter를 가져야 한다. `category_field` 값이 있으면 카드의 작은 점과 테두리 톤으로만 구분한다.

왼쪽 ribbon의 `Apple Calendar 열기` 아이콘과 명령 팔레트의 같은 명령은 `inbox/calendar/apple-calendar.md`를 연다. 이 경로가 없을 때는 파일을 만들지 않고 안내만 표시한다.

## 개발 검증

```bash
npm run check
npm test
```

## Release

Obsidian 설치에 필요한 release asset은 `main.js`, `manifest.json`, `styles.css` 세 파일이다. 세 파일의 manifest ID와 release asset hash를 확인하는 설치 adapter만 배포본을 Vault에 설치할 수 있다.
