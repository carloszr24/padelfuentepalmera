# Registros DNS para SendGrid (padelfuentepalmera.com)

Añade estos registros en el panel DNS de donde esté gestionado **padelfuentepalmera.com** (Cloudflare, GoDaddy, 1&1, etc.). Así SendGrid puede enviar correos desde `info@padelfuentepalmera.com` y mejorar la entrega (menos spam).

---

## Registros a crear

### 1. CNAME – Envío (link branding)
| Tipo | Nombre / Host | Valor / Apunta a / Target |
|------|----------------|---------------------------|
| CNAME | `em5338` | `u59898151.wl152.sendgrid.net` |

**Nota:** Si tu proveedor pide el host “completo”, usa `em5338.padelfuentepalmera.com`. Si pide “solo el subdominio”, usa `em5338`.

---

### 2. CNAME – DKIM 1
| Tipo | Nombre / Host | Valor / Apunta a / Target |
|------|----------------|---------------------------|
| CNAME | `s1._domainkey` | `s1.domainkey.u59898151.wl152.sendgrid.net` |

**Nota:** Host completo: `s1._domainkey.padelfuentepalmera.com`. Solo subdominio: `s1._domainkey`.

---

### 3. CNAME – DKIM 2
| Tipo | Nombre / Host | Valor / Apunta a / Target |
|------|----------------|---------------------------|
| CNAME | `s2._domainkey` | `s2.domainkey.u59898151.wl152.sendgrid.net` |

**Nota:** Host completo: `s2._domainkey.padelfuentepalmera.com`. Solo subdominio: `s2._domainkey`.

---

### 4. TXT – DMARC (política de correo)
| Tipo | Nombre / Host | Valor |
|------|----------------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

**Nota:** Host completo: `_dmarc.padelfuentepalmera.com`. Solo subdominio: `_dmarc`.

---

## Pasos genéricos en cualquier panel DNS

1. Entra donde gestionas el DNS de **padelfuentepalmera.com** (registrador o Cloudflare, etc.).
2. Busca la sección **DNS**, **DNS Records**, **Zona DNS** o similar.
3. Pulsa **Añadir registro** / **Add record**.
4. Para cada fila de la tabla de arriba:
   - **Tipo:** CNAME o TXT según corresponda.
   - **Nombre/Host:** el de la columna “Nombre / Host” (a veces hay que poner solo el subdominio, sin `.padelfuentepalmera.com`; si no acepta `_domainkey`, prueba `s1._domainkey.padelfuentepalmera.com` o lo que permita el panel).
   - **Valor/Objetivo:** el de la columna “Valor” (sin espacios extra; en CNAME suele ser un dominio como `u59898151.wl152.sendgrid.net`; en TXT, el texto `v=DMARC1; p=none;`).
5. Guarda cada registro. TTL puede quedarse por defecto (ej. 3600 o “Auto”).
6. En SendGrid, cuando quieras, usa **Verify** para comprobar que los registros se ven bien. La propagación puede tardar unos minutos o hasta 24–48 h.

---

## Cómo hacerlo en IONOS

1. Entra en **[ionos.com](https://www.ionos.com)** → inicia sesión.
2. Ve a **Dominios y SSL** (o **Domains & SSL**).
3. Localiza **padelfuentepalmera.com** → clic en el **engranaje** (Acciones) → **DNS** (o **Gestionar zona DNS**).
4. Añade los 4 registros con **Añadir registro** / **Add record**:

| # | Tipo | En IONOS: Host name / Hostname | En IONOS: Valor / Point to |
|---|------|-------------------------------|----------------------------|
| 1 | CNAME | `em5338` | `u59898151.wl152.sendgrid.net` |
| 2 | CNAME | `s1._domainkey` | `s1.domainkey.u59898151.wl152.sendgrid.net` |
| 3 | CNAME | `s2._domainkey` | `s2.domainkey.u59898151.wl152.sendgrid.net` |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none;` |

- **CNAME:** elige tipo **CNAME**, en *Host name* / *Hostname* pon solo el subdominio (ej. `em5338`), en *Point to* / *Destino* el valor de la tabla. Sin `https://`.
- **TXT:** elige tipo **TXT**, en *Host name* pon `_dmarc`, en *Value* / *Contenido* pon `v=DMARC1; p=none;`.
5. Guarda cada registro. TTL puede quedar por defecto.
6. Los cambios en IONOS suelen verse en poco rato; la propagación global puede tardar hasta 1 hora. Luego verifica en SendGrid.

---

## Ejemplo rápido (Cloudflare)

- **Type:** CNAME → **Name:** `em5338` → **Target:** `u59898151.wl152.sendgrid.net` → Proxy status: **DNS only** (gris).
- Repite para `s1._domainkey` y `s2._domainkey` con sus valores.
- **Type:** TXT → **Name:** `_dmarc` → **Content:** `v=DMARC1; p=none;`

---

## Si algo no cuadra

- Algunos paneles no permiten `_` en el nombre; en ese caso prueba solo `_dmarc` o el formato que sugiera el proveedor para DMARC.
- CNAME: el valor debe ser un **dominio** (ej. `u59898151.wl152.sendgrid.net`), sin `https://` ni barra final.
- TXT: el valor es solo el texto `v=DMARC1; p=none;` (con el punto y coma al final).

Cuando los cuatro estén creados y SendGrid los verifique, el envío desde `info@padelfuentepalmera.com` quedará autenticado correctamente.
