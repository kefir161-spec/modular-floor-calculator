# Схема localStorage

## Ключи

- `plastfactor_projects` — массив сохранённых проектов
- `plastfactor_autosave` — последний автосохранённый проект

## SavedProject

```ts
{
  schemaVersion: 1,
  id: string,
  name: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  productSourceId: string,
  productSnapshot: ProductVariant,
  room: RoomState,
  layout: LayoutSettings,
  wastePercent: number
}
```

## Миграции

`migrateProject()` обновляет `schemaVersion` при загрузке.

При загрузке проекта:
1. Поиск актуального варианта по `productSourceId`
2. Fallback на `productSnapshot` с предупреждением
