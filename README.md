# MarketingOS

**MarketingOS** es una aplicación web SaaS multi-tenant construida sobre **Google Apps Script + Google Sheets**.

El proyecto sigue un enfoque tipo **Together**: existe una hoja maestra para administrar las cuentas/clientes y una plantilla de Google Sheets que puede clonarse para cada cliente.

> **Estado actual:** el proyecto se encuentra en construcción. La interfaz base del Super Admin, el router, el motor de vistas, el modelo CRUD sobre Google Sheets, la pantalla de login y el sistema de sesión ya están preparados. La creación de clientes, la clonación del TEMPLATE y el sistema de tokens están pendientes.

---

## 0. Índice

1. [Objetivo](#1-objetivo)
2. [Arquitectura](#2-arquitectura)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Componentes principales](#4-componentes-principales)
5. [Motor de vistas](#5-motor-de-vistas)
6. [Router](#6-router)
7. [Punto de entrada](#7-punto-de-entrada)
8. [Autenticación](#8-autenticación)
9. [Patrón de redireccionamiento (GASVEL)](#9-patrón-de-redireccionamiento-gasvel)
10. [Super Admin](#10-super-admin)
11. [Modelo de datos](#11-modelo-de-datos)
12. [Flujo de creación de un cliente](#12-flujo-de-creación-de-un-cliente)
13. [Multi-tenancy](#13-multi-tenancy)
14. [Tokens](#14-tokens)
15. [Helpers](#15-helpers)
16. [Interfaz](#16-interfaz)
17. [Errores](#17-errores)
18. [Configuración de Google Apps Script](#18-configuración-de-google-apps-script)
19. [Instalación](#19-instalación)
20. [Desarrollo](#20-desarrollo)
21. [Estado actual](#21-estado-actual)
22. [Roadmap](#22-roadmap)
23. [Principios del proyecto](#23-principios-del-proyecto)
24. [Licencia](#24-licencia)
25. [Resumen](#25-resumen)

---

## 1. Objetivo

MarketingOS busca convertirse en una plataforma donde un administrador pueda:

1. Administrar clientes desde una cuenta maestra.
2. Crear una instancia independiente de MarketingOS para cada cliente.
3. Clonar automáticamente una plantilla de Google Sheets.
4. Asociar cada instancia a un cliente mediante un token.
5. Controlar acceso, vencimientos y estado de las cuentas.
6. Permitir que cada cliente gestione sus propios datos de marketing.
7. Evolucionar posteriormente hacia un modelo SaaS con billing y administración centralizada.

La idea principal es separar:

- **MASTER:** administración global del SaaS.
- **TEMPLATE:** plantilla base que se clona para cada cliente.
- **CLIENTE:** instancia independiente de cada cuenta.

---

## 2. Arquitectura

La aplicación utiliza una arquitectura sencilla inspirada en MVC:

```
Google Apps Script
│
├── Controllers
│   ├── Ctrl_Auth
│   ├── Ctrl_SuperAdmin
│   └── Ctrl_Cliente
│
├── Models
│   └── Base_Model
│
├── Router
│   └── Route / Router
│
├── View Engine
│   └── View.render()
│
├── Helpers
│   └── WebApp / formatos / tema
│
└── Google Sheets
    ├── MASTER
    └── TEMPLATE / instancias de clientes
```

### Flujo de una petición

```
Usuario
   │
   ▼
Web App
   │
   ▼
doGet() / doPost()
   │
   ▼
Router
   │
   ├── busca la ruta
   ├── encuentra el controlador
   └── ejecuta el método
   │
   ▼
Controller
   │
   ├── Model
   └── View
          │
          ▼
       HTML final
```

### Flujo de autenticación

```
Usuario abre la Web App
        ↓
Router → ?p='' → Auth@login → View_Login.html
        ↓
Usuario ingresa credenciales
        ↓
google.script.run.login()
        ↓
Ctrl_Auth.autenticar() valida contra MASTER!USERS (SHA-256)
        ↓
Guarda sesión en PropertiesService.getUserProperties()
        ↓
Devuelve { url: getWebAppUrl() + '?p=dashboard' }
        ↓
Cliente: window.top.location.href = data.url
        ↓
Ctrl_SuperAdmin@index valida sesión → renderiza Layout_Main + Dashboard
```

---

## 3. Estructura del proyecto

```
MarketingOS/
│
├── 0_Config.gs              # Config global + getWebAppUrl()
├── 0_Install.gs             # Instalador de MASTER
├── 1_Base_Controller.gs     # Clase padre de controladores
├── 2_Base_Model.gs          # CRUD genérico sobre Sheets
├── 3_Engine_View.gs         # Motor de vistas + layouts
│
├── 8_Ctrl_SuperAdmin.gs     # Controlador del Dashboard
├── 9_Routes.gs              # Router + definición de rutas
├── 10_Helpers.gs            # WebApp, formatos, tema
├── 11_Main.gs               # doGet / doPost / wrappers
├── 12_Ctrl_Auth.gs          # Login, logout, sesión
│
├── View_Dashboard.html
├── View_Error_404.html
├── View_Error_500.html
├── View_Layout_Main.html    # Layout Super Admin
├── View_Layout_Cliente.html # Layout cliente (pendiente)
├── View_Login.html
│
├── MarketingOS.md           # Este documento
└── appsscript.json
```

### Convención de archivos

| Archivo | Responsabilidad |
|---|---|
| `0_Config.gs` | Configuración global + `getWebAppUrl()` |
| `0_Install.gs` | Instalador de MASTER (USERS, SESSIONS, LOGS) |
| `1_Base_Controller.gs` | Funciones comunes para controladores |
| `2_Base_Model.gs` | Acceso CRUD genérico a Google Sheets |
| `3_Engine_View.gs` | Renderizado de vistas y layouts |
| `8_Ctrl_SuperAdmin.gs` | Controlador del panel Super Admin |
| `9_Routes.gs` | Definición y resolución de rutas |
| `10_Helpers.gs` | Utilidades globales |
| `11_Main.gs` | Entrada principal de la Web App |
| `12_Ctrl_Auth.gs` | Autenticación / login / logout / sesión |
| `View_*.html` | Interfaces HTML |
| `appsscript.json` | Configuración del proyecto Apps Script |

---

## 4. Componentes principales

### 4.1 Configuración (`0_Config.gs`)

Concentra la configuración de MarketingOS:

```javascript
var CONFIG = {
  APP_NAME: 'MarketingOS',
  APP_TAGLINE: 'Bolivia Saas',
  SPREADSHEET_ID: '...',   // ID del Spreadsheet MASTER
  DB: {
    USERS: 'USERS',
    SESSIONS: 'SESSIONS',
    LOGS: 'LOGS'
  },
  AUTH: {
    SALT: 'marketingos_salt_2026',
    SESSION_HOURS: 8
  },
  ROLES: {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    CLIENTE: 4
  }
};

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}
```

### 4.2 Base Controller (`1_Base_Controller.gs`)

Funcionalidades reutilizables para los controladores:

- Renderizado mediante `View.render()`.
- Redirecciones.
- Respuestas JSON estandarizadas.
- Integración con `WebApp`.

Los controladores concretos extienden:

```javascript
class Ctrl_Ejemplo extends Base_Controller {
  // ...
}
```

### 4.3 Base Model (`2_Base_Model.gs`)

Acceso genérico a Google Sheets con métodos estáticos:

```javascript
Base_Model.all(sheetName)
Base_Model.find(sheetName, id)
Base_Model.create(sheetName, data)
Base_Model.update(sheetName, id, data)
Base_Model.delete(sheetName, id)
Base_Model.getLastId(sheetName)
Base_Model.getNextId(sheetName)
Base_Model.createTable(sheetName, headers)
```

Transforma cada fila en un objeto JavaScript usando la primera fila como encabezados.

---

## 5. Motor de vistas

`3_Engine_View.gs` administra el renderizado HTML.

Convención de nombres:

```
View_Dashboard.html
View_Login.html
View_Error_404.html
View_Error_500.html
View_Layout_Main.html
```

**Renderizado con layout**

```javascript
View.render('Dashboard', data, 'Layout_Main');
```

**Vistas standalone (sin sidebar/header)**

```javascript
View.renderStandalone('Login', data);
```

Usado para Login, Error 404 y Error 500.

---

## 6. Router

`9_Routes.gs` contiene el sistema de rutas vía `?p=nombre-ruta`.

### Rutas actuales

```javascript
// Página inicial (raíz sin ?p=) → Login
Route.get('', 'Auth@login');

// Login y logout
Route.get('login',  'Auth@login');
Route.get('logout', 'Auth@logout');

// Panel del Super Admin
Route.get('dashboard', 'SuperAdmin@index');

// Dashboard del cliente (Marketing OS PRO)
Route.get('cliente', 'Cliente@index');
```

### Sintaxis

| Ruta | Método | Controlador |
|---|---|---|
| `?p=` | `Auth@login` | Muestra login |
| `?p=login` | `Auth@login` | Muestra login |
| `?p=logout` | `Auth@logout` | Cierra sesión |
| `?p=dashboard` | `SuperAdmin@index` | Dashboard Super Admin |
| `?p=cliente` | `Cliente@index` | Dashboard cliente |

### Soporte de parámetros dinámicos

```javascript
Route.get('productos/:id', 'Productos@get');
```

---

## 7. Punto de entrada

`11_Main.gs` contiene:

```javascript
doGet(e)
doPost(e)
```

Ambas funciones entregan la petición al `Router.resolve()`.

También incluye:

```javascript
ejecutarController(ruta, params)
```

que permite ejecutar un controlador desde el cliente con `google.script.run`.

---

## 8. Autenticación

`12_Ctrl_Auth.gs` maneja login, logout y sesión.

### Login

- Valida email + password contra `MASTER!USERS` con SHA-256 + salt.
- Guarda sesión en `PropertiesService.getUserProperties()`.
- Devuelve URL absoluta de redirección (`?p=dashboard`).

### Logout

- Borra `PropertiesService.getUserProperties()`.
- Registra log en `MASTER!LOGS`.
- Devuelve URL absoluta al login (`?p=login`).

### Hash SHA-256

```javascript
hashPassword_(password) {
  var raw = password + CONFIG.AUTH.SALT;
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );
  return digest.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}
```

### Puentes para `google.script.run`

```javascript
function login(data) {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.autenticar(data || {}));
}

function logout() {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.logout());
}
```

---

## 9. Patrón de redireccionamiento (GASVEL)

Este es el patrón oficial del proyecto. Todo login y logout debe usarlo.

### Problema

Google Apps Script ejecuta la Web App dentro de un `<iframe>` con sandbox en un dominio `*.googleusercontent.com`. Las redirecciones relativas como `window.top.location.href = '?p=login'` desde código asíncrono son bloqueadas o interpretadas mal → el usuario queda atrapado en el iframe o ve un 404.

### Regla de oro

**NUNCA** redirigir con rutas relativas desde código asíncrono. Siempre:

1. **En el servidor:** construir la URL absoluta con `getWebAppUrl() + '?p=...'` y devolverla en la respuesta.
2. **En el cliente:** usar `window.top.location.href = data.url` (nunca `window.location`).

### Implementación

**Servidor (`0_Config.gs`):**

```javascript
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}
```

**Servidor (`Ctrl_Auth.autenticar`):**

```javascript
return {
  success: true,
  url: getWebAppUrl() + '?p=dashboard'   // URL ABSOLUTA
};
```

**Servidor (`Ctrl_Auth.logout`):**

```javascript
return {
  success: true,
  url: getWebAppUrl() + '?p=login'       // URL ABSOLUTA
};
```

**Cliente (`View_Login.html` y `View_Layout_Main.html`):**

```javascript
window.top.location.href = data.url;      // top, no window
```

### Por qué funciona

| Pieza | Rol |
|---|---|
| `ScriptApp.getService().getUrl()` | Devuelve la URL pública absoluta de la Web App |
| `window.top.location.href` | Redirige la ventana completa, saliendo del iframe |
| `PropertiesService.getUserProperties()` | Sesión persistida del lado del servidor |

### Errores comunes (NO hacer)

- ❌ `window.location.href = '?p=login'` → atrapado en el iframe.
- ❌ `window.top.location.href = '?p=login'` → relativa rota desde async.
- ❌ Guardar tokens en `sessionStorage` y confiar en ellos para validar sesión.
- ❌ Redirigir con `data.redirect` que sea relativo.

---

## 10. Super Admin

`8_Ctrl_SuperAdmin.gs` maneja el panel administrativo.

Ruta actual: `?p=dashboard` → `SuperAdmin@index` → `View_Dashboard.html`

### Guard de sesión

Antes de renderizar, valida que exista `userEmail` en `PropertiesService`. Si no, redirige al login.

```javascript
index() {
  var userProps = PropertiesService.getUserProperties();
  var userEmail = userProps.getProperty('userEmail');

  if (!userEmail) {
    return HtmlService.createHtmlOutput(
      '<script>window.top.location.href="' + getWebAppUrl() + '?p=login";</script>'
    );
  }

  // ... render del dashboard
}
```

---

## 11. Modelo de datos

MarketingOS está diseñado alrededor de dos tipos principales de Spreadsheet.

### MASTER

Controla la plataforma SaaS.

| Tab | Propósito |
|---|---|
| `USERS` | Credenciales de administradores y clientes |
| `SESSIONS` | Sesiones activas (opcional, en PropertiesService) |
| `LOGS` | Registro de acciones |
| `Subscriptions` | Suscripciones de clientes |
| `Clients` | Datos de clientes |
| `Settings` | Configuración global |

Estructura de `USERS`:

| ID | EMAIL | PASSWORD_HASH | NOMBRE | ROL | ACTIVO | CREADO | ULTIMO_LOGIN |
|---|---|---|---|---|---|---|---|

### TEMPLATE

Plantilla que se clona para cada cliente.

| Tab | Propósito |
|---|---|
| `Leads` | Prospectos del cliente |
| `Sales` | Ventas |
| `Campaigns` | Campañas de marketing |
| `AdSets` | Conjuntos de anuncios |
| `Ads` | Anuncios individuales |
| `Budgets` | Presupuestos |
| `Reports` | Reportes |
| `Clients` | Clientes del cliente |
| `Tasks` | Tareas |
| `Settings` | Configuración de la instancia |
| `Tokens` | Tokens de acceso |

---

## 12. Flujo de creación de un cliente

```
+ Agregar Cliente
       │
       ▼
Crear registro del cliente en MASTER!Clients
       │
       ▼
Clonar TEMPLATE → MarketingOS_NombreCliente
       │
       ▼
Generar token único
       │
       ▼
Guardar token en Settings de la nueva instancia
       │
       ▼
Registrar instancia en MASTER!Subscriptions
       │
       ▼
Asignar acceso al cliente
       │
       ▼
Cliente listo
```

La clonación se hace con:

```javascript
DriveApp.getFileById(TEMPLATE_ID).makeCopy('MarketingOS_' + nombreCliente);
```

---

## 13. Multi-tenancy

Una instancia de Sheets por cliente:

```
MASTER
│
├── Cliente A
│      └── MarketingOS_ClienteA
│
├── Cliente B
│      └── MarketingOS_ClienteB
│
└── Cliente C
       └── MarketingOS_ClienteC
```

El MASTER mantiene la relación entre:

- cliente,
- email,
- instancia de Spreadsheet,
- token,
- estado,
- vencimiento.

---

## 14. Tokens

Cada instancia de cliente tiene un token asociado.

La plantilla contempla en `Settings`:

```
B1 = token
B2 = owner_email
B3 = vence
```

Además existe una hoja `Tokens` con:

```
token
email
expira
```

La validación del token determina qué instancia puede acceder.

---

## 15. Helpers

`10_Helpers.gs` contiene utilidades globales.

**URLs**

```javascript
WebApp.url(routeName)
WebApp.asset(path)
```

**JSON**

```javascript
json_encode(obj)
```

**Formateo**

```javascript
formatDate(date)
formatDateTime(date)
formatCurrency(amount)
```

**Tema**

```javascript
getTheme()
setTheme(theme)
```

El sistema contempla `light` y `dark`.

---

## 16. Interfaz

- Tailwind CSS (CDN)
- Lucide Icons (CDN)
- SweetAlert2 (CDN) con tema oscuro Tailwind
- HTML generado por Google Apps Script

Layout principal (`View_Layout_Main.html`):

- Sidebar con navegación.
- Header con buscador, calendario, mensajes, notificaciones.
- Perfil de usuario (email + iniciales dinámicas).
- Sidebar responsive para móvil con overlay.

### Tema oscuro SweetAlert2

Función `swalTheme()` compartida:

```javascript
function swalTheme() {
  return {
    buttonsStyling: false,
    customClass: {
      popup: '!bg-slate-900 !text-white !rounded-2xl !border !border-slate-800 !shadow-2xl',
      title: '!text-white !text-xl !font-bold',
      htmlContainer: '!text-slate-300 !text-sm',
      confirmButton: '!bg-indigo-600 hover:!bg-indigo-700 !text-white !px-5 !py-2 !rounded-lg !font-medium !transition-colors !ml-2',
      cancelButton: '!bg-slate-700 hover:!bg-slate-600 !text-white !px-5 !py-2 !rounded-lg !font-medium !transition-colors !mr-2',
      icon: '!border-0'
    }
  };
}
```

---

## 17. Errores

Dos vistas principales:

```
View_Error_404.html
View_Error_500.html
```

**404**: se usa cuando una ruta no existe.

```
?p=ruta-inexistente
```

**500**: se usa cuando ocurre una excepción durante la ejecución del Router, Controller, Web App o renderizado.

---

## 18. Configuración de Google Apps Script

El proyecto usa:

```json
{
  "runtimeVersion": "V8"
}
```

Configurado como Web App:

```
executeAs: USER_DEPLOYING
access: ANYONE_ANONYMOUS
```

---

## 19. Instalación

### 1. Crear el proyecto

Crear un proyecto nuevo en Google Apps Script y copiar los archivos.

### 2. Configurar el Spreadsheet MASTER

Crear un Spreadsheet y configurar su ID en `0_Config.gs` como `SPREADSHEET_ID`.

### 3. Ejecutar el instalador

Desde el editor:

1. Seleccionar la función `instalar` en el desplegable.
2. Ejecutar.
3. Autorizar permisos.
4. Revisar el Logger: obtendrás el email y la contraseña del admin inicial.

Credenciales por defecto:

```
Email:    admin@marketingos.bo
Password: 65765765
```

### 4. Deploy como Web App

```
Deploy → New deployment → Web app
```

---

## 20. Desarrollo

Para agregar un nuevo controlador:

```javascript
class Ctrl_Productos extends Base_Controller {
  index() {
    return this.view('Productos', {});
  }
}

globalThis.Ctrl_Productos = Ctrl_Productos;
```

Registrar la ruta:

```javascript
Route.get('productos', 'Productos@index');
```

Crear la vista:

```
View_Productos.html
```

Convención:

```
Ruta → Controller → Model → View
```

---

## 21. Estado actual

### Implementado

- ☑ Estructura base del proyecto
- ☑ Base Controller
- ☑ Base Model con CRUD genérico
- ☑ Motor de vistas
- ☑ Layout principal
- ☑ Router GET/POST con parámetros dinámicos
- ☑ Controlador Super Admin
- ☑ Controlador Auth
- ☑ Dashboard base
- ☑ Pantalla de login
- ☑ Páginas de error 404 y 500
- ☑ Helpers globales
- ☑ Configuración Web App
- ☑ Instalador inicial con hash SHA-256 + salt
- ☑ Modelo de usuarios (`MASTER!USERS`)
- ☑ Sesiones persistidas en PropertiesService
- ☑ Login funcional conectado al MASTER
- ☑ Logout funcional con SweetAlert2
- ☑ Redireccionamiento con URL absoluta (patrón GASVEL)
- ☑ Integración de SweetAlert2 con tema oscuro Tailwind
- ☑ Sidebar responsive con overlay móvil
- ☑ Rutas login, logout, dashboard, cliente
- ☑ Ruta raíz (`''`) → Login directo

### Pendiente

- ☐ Configuración definitiva `TEMPLATE_ID`
- ☐ Creación de clientes desde el Dashboard
- ☐ Clonación automática del TEMPLATE
- ☐ Generación de token único por cliente
- ☐ Guardado del token en Settings de la instancia
- ☐ Registro de instancia en `MASTER!Subscriptions`
- ☐ Modelo de datos completo para `MASTER!Subscriptions`
- ☐ Modelo de datos completo para `MASTER!Clients`
- ☐ Vista de Clientes (CRUD)
- ☐ Vista de Pagos
- ☐ Vista de Suscripciones
- ☐ Vista de Facturación
- ☐ Detección automática de clientes
- ☐ Acceso aislado por instancia
- ☐ Vencimientos
- ☐ Billing

---

## 22. Roadmap

### 🔥 Fase 1 — Core

**Objetivo:** Super Admin → Clientes → Clonación TEMPLATE → Instancia

**Implementado:**

- Estructura base, Base Controller, Base Model, Motor de vistas
- Router GET/POST, Layout principal, Controladores Auth y SuperAdmin
- Dashboard base, Login, Error 404/500, Helpers, Web App
- Instalador, Modelo de usuarios, Sesiones, Login, Logout
- Redireccionamiento GASVEL, SweetAlert2, Sidebar responsive

**Pendiente:**

- ☐ Configuración definitiva `TEMPLATE_ID`
- ☐ Creación de clientes desde el Dashboard
- ☐ Clonación automática del TEMPLATE
- ☐ Generación y guardado de token
- ☐ Registro de instancia en `MASTER!Subscriptions`

### 🎯 Fase 2 — Auto Detect

**Objetivo:** El Dashboard detecta automáticamente las instancias registradas en `MASTER!Subscriptions`.

- ☐ Lectura automática de `MASTER!Subscriptions`
- ☐ Renderizado de instancias activas
- ☐ Indicadores de estado (activo / vencido / bloqueado)
- ☐ Refresco en tiempo real
- ☐ Métricas reales (MRR, Pagados, Por Vencer, Bloqueados)

### 👤 Fase 3 — Cliente

**Objetivo:** El cliente accede a su propia instancia validando token + email + expiración.

- ☐ Modelo de usuarios por instancia
- ☐ Hash SHA-256 para clientes
- ☐ Login de cliente contra su instancia
- ☐ Sesiones por instancia
- ☐ Logout de cliente
- ☐ Validación de token
- ☐ Detección automática de instancias
- ☐ Acceso aislado por instancia
- ☐ Control de vencimientos
- ☐ Dashboard del cliente

### 💰 Fase 4 — SaaS

**Objetivo:** Convertir MarketingOS en plataforma SaaS completa.

- ☐ Sistema de logs centralizado
- ☐ Billing / facturación
- ☐ Administración de suscripciones
- ☐ Automatizaciones
- ☐ Métricas SaaS (MRR, churn, activos)
- ☐ Vencimientos automáticos
- ☐ Notificaciones de pago
- ☐ Exportación de reportes

---

## 23. Principios del proyecto

**Separación**

- MASTER administra el SaaS.
- TEMPLATE define la estructura de una nueva instancia.
- Cada cliente trabaja con su propia instancia.

**Reutilización**

La lógica común permanece en:

```
Base_Controller
Base_Model
View
Helpers
Router
```

Los módulos específicos se implementan como controladores y vistas independientes.

**Simplicidad**

Construido sobre Google Apps Script y Google Sheets para reducir infraestructura externa.

**Aislamiento**

Los datos de un cliente no deben quedar expuestos a otro cliente.

**Evolución**

El proyecto comienza como un núcleo sencillo y evoluciona hacia un SaaS completo.

---

## 24. Licencia

Este proyecto no define actualmente una licencia pública.

Hasta que se agregue una licencia explícita, el código debe considerarse propietario / todos los derechos reservados.

---

## 25. Resumen

MarketingOS tiene como objetivo convertirse en un SaaS de gestión de marketing multi-tenant sobre Google Apps Script y Google Sheets.

La arquitectura base separa:

```
Configuración
     ↓
Controllers
     ↓
Models
     ↓
Router
     ↓
View Engine
     ↓
Google Sheets
```

Y el modelo SaaS previsto añade:

```
MASTER
  │
  ├── Clientes
  ├── Suscripciones
  ├── Tokens
  └── Logs
        │
        ▼
     TEMPLATE
        │
        ├── Leads
        ├── Sales
        ├── Campaigns
        ├── Ads
        ├── Reports
        └── Tasks
```

El siguiente objetivo funcional es completar el Core del Super Admin: configuración MASTER/TEMPLATE, creación de clientes desde el Dashboard y clonación automática del TEMPLATE.

---

## 📅 Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-09-27 | Creación inicial del documento consolidado |
| 2026-09-27 | Login funcional contra `MASTER!USERS` con SHA-256 |
| 2026-09-27 | Sesión persistida en PropertiesService (patrón GASVEL) |
| 2026-09-27 | Redireccionamiento con URL absoluta documentado como principio oficial |
| 2026-09-27 | Logout funcional con SweetAlert2 + spinner |
| 2026-09-27 | Rutas login, logout, dashboard, cliente registradas |
| 2026-09-27 | Instalador `0_Install.gs` con hash SHA-256 + salt |
| 2026-09-27 | Layout responsive con sidebar móvil |
| 2026-09-27 | SweetAlert2 integrado con tema oscuro Tailwind |

**Última actualización:** 2026-09-27
