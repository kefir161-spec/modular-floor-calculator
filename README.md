# Калькулятор напольных покрытий «ПластФактор»

Онлайн-конфигуратор-калькулятор модульных напольных покрытий. SPA на React + TypeScript, независимое от CMS Битрикс.

## Запуск

```bash
cd plastfactor-calculator
npm install
npm run dev
```

Приложение: `http://localhost:5173/calculator/`

## Сборка

```bash
npm run build
npm run preview
```

## Тесты

```bash
npm run test
npm run typecheck
```

## Конфигурация

Файл `.env`:

| Переменная | Описание | По умолчанию |
|---|---|---|
| `VITE_CATALOG_MODE` | `local` или `remote` | `local` |
| `VITE_CATALOG_URL` | URL XML-фида | `/data/plastfactor_catalog.xml` |
| `VITE_PRODUCT_URL_PARAM` | Параметр предвыбора товара | `offerId` |

Пример: `/calculator/?offerId=5200`

## Возможности

- Загрузка каталога из YML/XML
- Выбор модульного покрытия и варианта
- Прямоугольное и сложное помещение (polygon)
- Технологический зазор (polygon offset)
- Раскладка модулей с классификацией full/cut
- Поворот 0°/90°, смещение, оптимизация
- Расчёт площади, количества, запаса
- Сохранение в localStorage
- Экспорт PNG, PDF, печать
- Адаптивный интерфейс (desktop / tablet / mobile)

## Документация

- [architecture.md](docs/architecture.md)
- [catalog-adapter.md](docs/catalog-adapter.md)
- [calculation-rules.md](docs/calculation-rules.md)
- [geometry.md](docs/geometry.md)
- [local-storage-schema.md](docs/local-storage-schema.md)
- [integration.md](docs/integration.md)
- [known-limitations.md](docs/known-limitations.md)

## Ограничения первой версии

- Единица цены в XML не указана — итоговая стоимость не рассчитывается (`priceUnit: unknown`)
- Тактильная продукция и алюминиевая грязезащита исключены из каталога
- Нет повторного использования обрезков
- Нет диагональной раскладки
