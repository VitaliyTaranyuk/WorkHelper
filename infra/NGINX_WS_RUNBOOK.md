# Runbook: WebSocket-сигналинг Meet через nginx (ТП-181)

## Что это

Локация `/work-task/ws/` (upgrade-заголовки, длинные таймауты) проксирует
WSS-сигналинг Meet на backend :8080. **Config as code**: эталон живёт в
`infra/nginx-vds.conf`, применяется скриптом `infra/apply-nginx-ws.sh`
из пайплайна деплоя (`deploy-main.mjs`, шаг «Apply nginx WS location»)
после `git pull` на VDS. Ручные правки прод-nginx не используются.

## Как применяется (автоматически при каждом деплое)

1. Скрипт извлекает эталонный блок из `infra/nginx-vds.conf` (один источник).
2. Идемпотентность: блок уже в конфиге → no-op (повторный запуск безопасен).
3. Изменение: бэкап `*.bak-ws` → вставка перед `location /work-task/` во всех
   server-блоках wowoffcata (http:80 и https:443/certbot) → `nginx -t` →
   `nginx -s reload` (reload, не restart — активные звонки не рвутся).
4. Автооткат: провал `nginx -t` или post-check возвращает бэкап + reload.
5. Post-check: запрос с Upgrade-заголовками через nginx обязан дойти до
   backend-интерцептора (HTTP 400/401 без токена = прокси жив; 404/5xx = откат).
6. Аудит-след: `/var/log/workhelper-nginx-ws.log` — дата, commit, результат.

## Сквозная проверка (доказательство «звонки соединяются»)

`nginx -t` подтверждает синтаксис, post-check — проксирование; полный E2E —
хендшейк 101 + живой обмен с валидным JWT (секреты в скрипт не зашиты,
поэтому запускается снаружи ответственным):

```bash
node - <<'EOF'
const BASE='https://wowoffcata.hlab.kz/work-task/api/v1'
const login = await fetch(BASE+'/auth/login',{method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:'<user>',password:'<pass>'})}).then(r=>r.json())
const room = await fetch(BASE+'/meet/rooms/project/<projectId>',{method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.accessToken},
  body:JSON.stringify({title:'ws-e2e'})}).then(r=>r.json())
const ws = new WebSocket(`wss://wowoffcata.hlab.kz/work-task/ws/meet?room=${room.token}&token=${login.accessToken}`)
ws.onopen = () => console.log('HANDSHAKE 101 OK')
ws.onmessage = e => { const m=JSON.parse(e.data);
  if(m.type==='hello'){ console.log('HELLO OK'); ws.send('{"type":"ping"}') }
  if(m.type==='pong'){ console.log('PING/PONG OK — сигналинг живой'); ws.close(); process.exit(0) } }
ws.onclose = e => { if(e.code!==1000&&e.code!==1005){ console.error('FAIL close',e.code); process.exit(1) } }
EOF
```

Ожидаемо: `HANDSHAKE 101 OK → HELLO OK → PING/PONG OK`.

## Наблюдаемость

- Доля успешных установок/ICE-фейлы/реконнекты пишутся backend'ом:
  `docker logs workhelper-backend-1 | grep MEET_STATS`.
- Хендшейки в nginx: `grep "work-task/ws" /var/log/nginx/access.log`
  (101 = успех). Алертинг-стека нет — вопрос выбора мониторинга открыт
  (задача T5/ТП-175, решение владельца).

## Staging

Отдельного staging-окружения у проекта нет (один VDS). Эквивалент паритета:
идемпотентный прогон с бэкапом/автооткатом + обязательный post-check +
внешний E2E; сам скрипт покрыт «сухим» повторным запуском (no-op).

## Откат вручную (аварийный)

```bash
cp /etc/nginx/sites-enabled/<file>.bak-ws /etc/nginx/sites-enabled/<file>
nginx -t && nginx -s reload
```
