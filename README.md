# Simple Markdown Calendar

Simple Markdown Calendar는 Obsidian Markdown 일정 파일을 읽어 한 달 단위로 정리해 보여 주는 가벼운 플러그인이다. 일정 데이터는 Markdown에만 남고, 플러그인은 파일을 만들거나 고치거나 외부 서비스와 동기화하지 않는다.

## 화면 원칙

- 월간 보기만 제공한다.
- 카드에는 시간을 반복하지 않고 제목만 보여 준다.
- 긴 제목은 두 줄까지만 표시하고, 마우스를 올리거나 키보드로 선택하면 전체 제목을 보여 준다.
- 날짜별 카드와 오늘 표식은 충분히 구분하되, 색은 저채도 팔레트로 제한한다. 카드는 움직이지 않으며, 마우스를 올리면 같은 유형의 채움색만 한 단계 진해진다.

## Markdown 계약

````markdown
```woon-simple-calendar
source: calendar/events
date_field: Date
category_field: Category
category_id_field: Category ID
```
````

`source`는 `..`나 절대 경로가 없는 Vault 상대 경로여야 하며, 그 아래의 각 Markdown 문서는 `Date: YYYY-MM-DD` frontmatter를 가져야 한다. `category_field`는 사람이 읽는 제목이고 `category_id_field`는 카드 팔레트를 고르는 안정 ID다. 기본 팔레트는 `career`, `learning`, `creative`, `life`, `relationship`, `health`, `admin`, `other`를 제공하며, 의미와 표시 제목은 Markdown을 만드는 시스템이 소유한다.

왼쪽 ribbon과 명령 팔레트의 `Simple Calendar 열기`는 코드 블록이 있는 첫 Markdown 문서를 연다. 특정 Vault 이름, Calendar 공급자, dashboard 경로를 가정하지 않으며, 대상 문서가 없을 때는 파일을 만들지 않고 안내만 표시한다.

## 개발 검증

```bash
npm run check
npm test
```

## Release

Obsidian 설치에 필요한 release asset은 `main.js`, `manifest.json`, `styles.css` 세 파일이다. 세 파일의 manifest ID와 release asset hash를 확인하는 설치 adapter만 배포본을 Vault에 설치할 수 있다.
