# Архитектура

## Слои

```
src/
  app/           — провайдеры, store, глобальные стили
  pages/         — страницы
  widgets/       — составные UI-блоки
  features/      — пользовательские сценарии (сохранение, экспорт)
  entities/      — расчётное ядро
  shared/        — api, geometry, config, ui, types
```

## Принципы

- UI не содержит расчётной логики
- Геометрия и расчёты — чистые функции
- Каталог загружается через адаптер, независимый от UI
- Zustand хранит состояние; производные данные пересчитываются в `recalculate()`
- TanStack Query кэширует XML (через `fetchCatalog` в провайдере)

## Поток данных

1. XML → `XmlCatalogSource` → `YmlCatalogAdapter` → `CatalogData`
2. Пользователь выбирает вариант → `selectedVariant`
3. Контур помещения → `offsetPolygonInward` → рабочий контур
4. `generateLayout` + `calculate` → `calculation`
5. Konva отображает контуры и модули

## Расширяемость

- Замена XML на API: реализовать новый `CatalogSource`
- Предвыбор товара: URL-параметр из конфигурации
- Оптимизация раскладки: `optimizeLayout()` готова к Web Worker
