# Интеграция на plastfactor.com

## Production build

```bash
npm run build
```

Артефакты: `dist/`. Разместить на `/calculator/` (настроено `base: '/calculator/'` в Vite).

## Base path

Для другого пути измените `base` в `vite.config.ts` и пересоберите.

## Предвыбор товара

```
/calculator/?offerId=5200
```

Параметр настраивается через `VITE_PRODUCT_URL_PARAM`.

## XML в production

```env
VITE_CATALOG_MODE=remote
VITE_CATALOG_URL=https://plastfactor.com/bitrix/catalog_export/export_Q7r.xml
```

Рекомендуется fallback на локальный snapshot при недоступности remote.

## CORS / CSP

- Экспорт PDF/PNG: удалённые изображения товаров могут блокироваться CORS — PDF генерируется без изображения
- CSP: разрешить `connect-src` для URL каталога

## Варианты подключения

1. **Прямое** — статика в `dist/` на поддомене или подпути
2. **iframe** — резервный вариант: `<iframe src="/calculator/" />`

## Битрикс

Интеграция в Битрикс не входит в текущую версию. Приложение автономно.
