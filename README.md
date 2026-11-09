# Hex Planner

Лёгкий планировщик партии в Twilight Imperium 4: локальное веб-приложение (PWA) для планшета в альбомной ориентации. Игрок вручную строит план по раундам, а приложение считает ресурсы, жетоны приказа, лимиты и предупреждает о нарушениях правил, ничего не запрещая.

Открыть: https://asmazovec.github.io/hex-planner/

Это любительский проект, а не официальный материал. Он не связан с Fantasy Flight Games, Asmodee и Hobby World и не одобрен ими. Twilight Imperium и связанные с ней названия — товарные знаки их владельцев.

## Запуск

```bash
npm install
npm run dev
```

Остальные команды (тесты, линт, сквозные тесты, публикация) описаны в [CLAUDE.md](CLAUDE.md).

## Источники

- Игровые данные собраны из публичного репозитория [AsyncTI4/TI4_map_generator_bot](https://github.com/AsyncTI4/TI4_map_generator_bot); как именно, описано в [docs/data-verification.md](docs/data-verification.md). Описания карт пересказаны своими словами, арт игры в проект не входит.
- Иконки юнитов — [game-icons.net](https://game-icons.net), лицензия CC BY 3.0.

## Лицензия

Код проекта — [MIT](LICENSE).
