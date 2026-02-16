# No puedo acceder por el dominio (padelfuentepalmera.com)

## 1. Qué error te sale

- **"Este sitio no puede proporcionar una conexión segura"** → Problema de SSL o el dominio aún no apunta a Vercel.
- **"No se puede acceder a este sitio" / "No responde"** → El dominio no está resolviendo a la IP de Vercel (DNS).
- **Página de Vercel "404" o "Project not found"** → El dominio no está bien asignado al proyecto en Vercel.
- **Timeout / carga infinita** → DNS mal configurado o propagación incompleta.

Anota el mensaje exacto (o haz una captura) para afinar.

---

## 2. Comprobar DNS (¿apunta a Vercel?)

En **Windows** (CMD o PowerShell):
```bash
nslookup padelfuentepalmera.com
```

En **Mac/Linux** (Terminal):
```bash
dig padelfuentepalmera.com +short
```

- Si sale la IP **76.76.21.21** (o similar de Vercel) → DNS está bien.
- Si sale otra IP o no resuelve → el problema es DNS en IONOS (registro A o CNAME).

También puedes usar: https://dnschecker.org → pon `padelfuentepalmera.com` y mira si resuelve a la IP de Vercel en varios países.

---

## 3. Comprobar en Vercel

1. **vercel.com** → tu proyecto (Fuente Palmera Pádel).
2. **Settings** → **Domains**.
3. Comprueba:
   - Que **padelfuentepalmera.com** esté en la lista.
   - Que tenga un **tick verde** (Verified). Si pone "Generating SSL" o "Pending", espera unos minutos.
   - Que **no** diga "Invalid Configuration" ni "Wrong project".
4. Si el dominio está en otro proyecto de Vercel, quítalo de ese y añádelo solo a este.

---

## 4. Comprobar en IONOS (registro A)

1. IONOS → **Dominios** → **padelfuentepalmera.com** → pestaña **DNS**.
2. Debe haber un registro **A**:
   - **Nombre/Host:** `@` (o vacío).
   - **Valor/Destino:** `76.76.21.21`.
3. Si hay otro registro A para `@` que apunte a otra IP (ej. parking de IONOS), **bórralo o cámbialo** a `76.76.21.21`, o el dominio no irá a Vercel.

---

## 5. Probar con y sin www

- Prueba: **https://padelfuentepalmera.com** (sin www).
- Prueba: **https://www.padelfuentepalmera.com** (con www).

Usa **https://** (no http). Si solo uno funciona, el fallo está en el registro del otro (A vs CNAME).

---

## 6. Caché del navegador

Prueba en **modo incógnito** o en otro navegador. Si en incógnito sí carga, era caché.

---

## Resumen rápido

| Comprobación | Qué hacer |
|--------------|-----------|
| DNS | `nslookup padelfuentepalmera.com` o dnschecker.org → debe dar 76.76.21.21. |
| IONOS | Registro A para `@` = 76.76.21.21, sin otro A que apunte a otra IP. |
| Vercel Domains | padelfuentepalmera.com con tick verde en el proyecto correcto. |
| URL | Probar https://padelfuentepalmera.com (y https://www...). |

Cuando tengas el mensaje de error exacto o el resultado del nslookup/dig, se puede afinar más.
