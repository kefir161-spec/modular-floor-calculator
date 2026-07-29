# UI-примитивы (Фаза 1)

Общий набор компонентов в `src/shared/ui`. Экраны калькулятора пока не переведены —
подключать по мере Фаз 2–4.

| Компонент | Назначение |
|---|---|
| `IconButton` | Кнопка только с иконкой (`aria-label` обязателен) |
| `Tooltip` | Подсказка по hover/focus (не для критичной информации) |
| `SegmentedControl` | Выбор из 2–4 вариантов (0°/90°, единицы и т.п.) |
| `Switch` | Вкл/выкл отображения |
| `Drawer` | Боковая/нижняя панель: Escape, focus trap, backdrop |
| `Popover` | Всплывающая панель у якоря; на ≤768px — bottom sheet |
| `Dialog` | Модальное окно для подтверждений |
| `Toast` / `useToast` | Краткие уведомления (`ToastProvider` уже в `AppProviders`) |
| `Skeleton` | Плейсхолдер загрузки |
| `EmptyState` | Пустое состояние с CTA |
| `ErrorState` | Ошибка с опциональными подробностями |
| `icons/*` | Tree-shakable SVG-иконки |

Motion: токены `--pf-motion-*`, хук `usePrefersReducedMotion`, глобальный
`prefers-reduced-motion` в `global.scss`.
