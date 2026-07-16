# Правила расчёта

## Модули

- `full` — полностью внутри рабочего контура
- `cut` — частичное пересечение → **1 модуль к покупке**
- Остатки не переиспользуются

## Запас

По умолчанию 5%:

```
modulesWithWasteCount = ceil(totalModulesCount × (1 + wastePercent / 100))
```

## Площадь покупки

```
purchaseAreaSqm = modulesWithWasteCount × moduleWidth × moduleLength / 1_000_000
```

## Стоимость

| priceUnit | Формула |
|---|---|
| `piece` | `modulesWithWasteCount × price` |
| `sqm` | `purchaseAreaSqm × price` |
| `unknown` | не рассчитывается, предупреждение |

## Вес

```
totalWeightKg = modulesWithWasteCount × weightKg
```

Только если вес одного модуля достоверно известен.

## Технологический зазор

По умолчанию 5 мм. Реализован как внутренний offset контура, не как уменьшение площади по формуле.
