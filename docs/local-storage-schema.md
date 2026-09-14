# Схема localStorage

## Ключи

- `plastfactor_projects` — массив сохранённых проектов
- `plastfactor_autosave` — последний автосохранённый проект

## SavedProject

```ts
{
  schemaVersion: 5,
  id: string,
  name: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  productSourceId: string,
  productSnapshot: ProductVariant,
  room: RoomState,
  layout: LayoutSettings,
  wastePercent: number,
  edging?: EdgingSettings   // v3+; v5+ sizeRef
}
```

## Версии

| Версия | Что добавилось |
|---|---|
| 1 | базовый снимок проекта |
| 2 | `room.obstacles`, `room.openings` |
| 3 | `edging` — окантовка Optima Duos |
| 4 | `colorOverrides` — покраска модулей |
| 5 | `edging.sizeRef` — заданный размер с кантами или поле + кант |

## Миграции

`migrateProject()` обновляет `schemaVersion` при загрузке. Изменения аддитивные:
в проектах до v3 окантовка отсутствует и подставляется выключенной (`DEFAULT_EDGING`).

При загрузке проекта:
1. Поиск актуального варианта по `productSourceId`
2. Fallback на `productSnapshot` с предупреждением
3. `edging` применяется **после** `selectVariant` — тот сбрасывает кант для чужой серии
   и подставляет толщину выбранной плитки
