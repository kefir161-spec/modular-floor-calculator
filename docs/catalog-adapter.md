# Адаптер каталога

## Источники

- **local**: `public/data/plastfactor_catalog.xml`
- **remote**: `https://plastfactor.com/bitrix/catalog_export/export_Q7r.xml`

## Allow-list серий

В `src/shared/config/index.ts` задан `CATALOG_ELIGIBILITY.allowedFamilySlugs`.

### Включены (модульные напольные покрытия)

Серии Factor, Sensor, Optima Duos, Aqua, City, Klever-Sport, Veropol, Sporto.one, Broneplast, Canal и др. — см. полный список в конфигурации.

### Исключены

| Причина | Примеры slug |
|---|---|
| Тактильная плитка | `taktilnaya-plitka-*` |
| Тактильные ленты/полосы | `napravlyayushchaya-taktilnaya-*`, `taktilnaya-lenta-*` |
| Алюминиевая грязезащита | `rubber*`, `pile*`, `brush*`, `scraper*` |
| Мебель, кашпо | `kashpo_*`, `pouf`, `corner-sofa` |
| Игровые конструкторы | `universal-cubes-*`, `cube-mini` (до решения заказчика) |

Фильтрация также по `excludedNamePatterns` (тактильн, алюминиев, кашпо и т.д.).

## Группировка вариантов

По `familySlug` — последний сегмент URL `/catalog/detail/factor/`.

## Размеры

Приоритет:
1. `<param name="Размеры" unit="мм">`
2. `<dimensions>` (сантиметры × 10)

## Единица цены

До подтверждения заказчиком: **`unknown`** для всех товаров.

## Аудит фида (2026-07-14)

- 916 предложений, 13 категорий
- 10 без `<dimensions>`, 9 без `<weight>`
- Нет `vendorCode` / артикула
- Нет поля единицы цены
