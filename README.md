# MarketingOS

**MarketingOS** es una aplicación web SaaS multi-tenant construida sobre **Google Apps Script + Google Sheets**.

El proyecto sigue un enfoque tipo **Together**: existe una hoja maestra para administrar las cuentas/clientes y una plantilla de Google Sheets que puede clonarse para cada cliente.

> **Estado actual:** el proyecto se encuentra en construcción. La interfaz base del Super Admin, el router, el motor de vistas, el modelo CRUD sobre Google Sheets y la pantalla de login ya están preparados, pero varias piezas de la lógica SaaS todavía están pendientes de implementación.

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

```text
Google Apps Script
│
├── Controllers
│   ├── Ctrl_Auth
│   └── Ctrl_SuperAdmin
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

```text
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
   │
   ├── encuentra el controlador
   │
   └── ejecuta el método
   │
   ▼
Controller
   │
   ├── Model
   │
   └── View
          │
          ▼
       HTML final
```

---

## 3. Estructura del proyecto

```text
MarketingOS/
│
├── 0_Config.gs
├── 1_Base_Controller.gs
├── 2_Base_Model.gs
├── 3_Engine_View.gs
│
├── 8_Ctrl_SuperAdmin.gs
├── 9_Routes.gs
├── 10_Helpers.gs
├── 11_Main.gs
├── 12_Ctrl_Auth.gs
│
├── View_Dashboard.html
├── View_Error_404.html
├── View_Error_500.html
├── View_Layout_Main.html
├── View_Login.html
│
├── DATA_MODEL.md
├── ROADMAP.md
├── TREE.md
├── README.md
│
└── appsscript.json
```

### Convención de archivos

| Archivo | Responsabilidad |
|---|---|
| `0_Config.gs` | Configuración global de la aplicación |
| `1_Base_Controller.gs` | Funciones comunes para controladores |
| `2_Base_Model.gs` | Acceso CRUD genérico a Google Sheets |
| `3_Engine_View.gs` | Renderizado de vistas y layouts |
| `8_Ctrl_SuperAdmin.gs` | Controlador del panel Super Admin |
| `9_Routes.gs` | Definición y resolución de rutas |
| `10_Helpers.gs` | Utilidades globales |
| `11_Main.gs` | Entrada principal de la Web App |
| `12_Ctrl_Auth.gs` | Autenticación / pantalla de login |
| `View_*.html` | Interfaces HTML |
| `DATA_MODEL.md` | Modelo de datos |
| `ROADMAP.md` | Plan de desarrollo |
| `TREE.md` | Árbol del proyecto |
| `appsscript.json` | Configuración del proyecto Apps Script |

---

## 4. Componentes principales

### 4.1 Configuración

`0_Config.gs` concentra la configuración de MarketingOS.

La arquitectura prevista contempla principalmente:

```text
MASTER_ID
TEMPLATE_ID
```

La idea es que estos identificadores permitan localizar:

- La hoja maestra del SaaS.
- La hoja utilizada como plantilla para nuevos clientes.

---

### 4.2 Base Controller

`1_Base_Controller.gs` contiene funcionalidades reutilizables para los controladores.

Entre ellas:

- Renderizado mediante `View.render()`.
- Redirecciones.
- Respuestas JSON estandarizadas.
- Integración con `WebApp`.

Los controladores concretos pueden extender:

```javascript
class Ctrl_Ejemplo extends Base_Controller {
  // ...
}
```

---

### 4.3 Base Model

`2_Base_Model.gs` proporciona acceso genérico a Google Sheets.

Actualmente contempla operaciones como:

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

El modelo utiliza la primera fila de cada hoja como encabezado y transforma los registros en objetos JavaScript.

Ejemplo conceptual:

```text
Google Sheet

ID | Nombre | Email
1  | Juan   | juan@email.com
2  | Ana    | ana@email.com
```

se convierte en:

```javascript
[
  {
    ID: 1,
    Nombre: "Juan",
    Email: "juan@email.com"
  },
  {
    ID: 2,
    Nombre: "Ana",
    Email: "ana@email.com"
  }
]
```

---

## 5. Motor de vistas

`3_Engine_View.gs` administra el renderizado HTML.

Las vistas siguen la convención:

```text
View_Nombre.html
```

Por ejemplo:

```text
View_Dashboard.html
View_Login.html
View_Error_404.html
View_Error_500.html
```

También existe un layout principal:

```text
View_Layout_Main.html
```

### Renderizado con layout

```javascript
View.render(
  'Dashboard',
  data,
  'Layout_Main'
);
```

El motor:

1. Carga la vista.
2. Inserta los datos.
3. Evalúa el HTML.
4. Inserta el contenido dentro del layout.
5. Devuelve el resultado final al navegador.

### Vistas standalone

Para páginas que no necesitan sidebar ni navegación se utiliza:

```javascript
View.renderStandalone('Login', data);
```

Actualmente este mecanismo se utiliza para pantallas como:

- Login.
- Error 404.
- Error 500.

---

## 6. Router

`9_Routes.gs` contiene el sistema de rutas.

Las rutas utilizan el parámetro:

```text
?p=nombre-ruta
```

Ejemplo:

```text
?p=dashboard
```

Una ruta se registra así:

```javascript
Route.get('dashboard', 'SuperAdmin@index');
```

Esto significa:

```text
dashboard
   ↓
Ctrl_SuperAdmin
   ↓
index()
```

También existe soporte para rutas POST:

```javascript
Route.post('productos/crear', 'Productos@create');
```

Y rutas con parámetros:

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

Estas funciones reciben las peticiones de Google Apps Script y las entregan al Router.

También existe:

```javascript
ejecutarController(ruta, params)
```

que permite ejecutar un controlador directamente desde llamadas del lado cliente mediante `google.script.run`.

---

## 8. Autenticación

`12_Ctrl_Auth.gs` contiene actualmente el controlador de autenticación.

En el estado actual, el controlador principalmente muestra la pantalla de login:

```text
View_Login.html
```

La lógica completa de:

- validación de credenciales,
- sesiones,
- autorización,
- hash de contraseñas,
- logout,

forma parte de las siguientes etapas del proyecto.

La autenticación definitiva debe integrarse con la hoja maestra `MASTER`.

---

## 9. Super Admin

`8_Ctrl_SuperAdmin.gs` contiene el controlador del panel administrativo.

Ruta actual:

```text
?p=dashboard
```

que apunta a:

```text
SuperAdmin@index
```

y termina renderizando:

```text
View_Dashboard.html
```

El dashboard representa la interfaz desde la cual se administrarán posteriormente los clientes del SaaS.

---

## 10. Modelo de datos

MarketingOS está diseñado alrededor de dos tipos principales de Spreadsheet.

### MASTER

La hoja maestra controla la plataforma SaaS.

Tabs previstas:

```text
Subscriptions
Clients
Logs
Settings
```

### TEMPLATE

Es la plantilla que se clonará para cada cliente.

Tabs previstas:

```text
Leads
Sales
Campaigns
AdSets
Ads
Budgets
Reports
Clients
Tasks
Settings
Tokens
```

El detalle completo se encuentra en:

```text
DATA_MODEL.md
```

---

## 11. Flujo de creación de un cliente

El objetivo final del sistema es que el Super Admin pueda hacer algo similar a:

```text
+ Agregar Cliente
       │
       ▼
Crear registro del cliente
       │
       ▼
Clonar TEMPLATE
       │
       ▼
MarketingOS_NombreCliente
       │
       ▼
Generar token
       │
       ▼
Guardar token en Settings
       │
       ▼
Registrar instancia en MASTER
       │
       ▼
Asignar acceso al cliente
       │
       ▼
Cliente listo
```

La clonación está prevista mediante:

```javascript
DriveApp.getFileById(TEMPLATE_ID).makeCopy(...)
```

El objetivo es que cada cliente tenga su propia instancia de Google Sheets sin compartir directamente los datos con otros clientes.

---

## 12. Multi-tenancy

El modelo de MarketingOS utiliza una estrategia de **una instancia de Sheets por cliente**.

Conceptualmente:

```text
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

Esto permite aislar los datos de cada cliente.

El `MASTER` mantiene la relación entre:

- cliente,
- email,
- instancia de Spreadsheet,
- token,
- estado,
- vencimiento.

---

## 13. Tokens

Cada instancia de cliente tendrá un token asociado.

La plantilla contempla:

```text
Settings

B1 = token
B2 = owner_email
B3 = vence
```

Además existe una hoja:

```text
Tokens
```

con información relacionada con:

```text
token
email
expira
```

La validación del token será utilizada posteriormente para determinar qué instancia puede acceder a la aplicación.

---

## 14. Helpers

`10_Helpers.gs` contiene utilidades globales.

### URLs

```javascript
WebApp.url(routeName)
WebApp.asset(path)
```

### JSON

```javascript
json_encode(obj)
```

### Formateo

```javascript
formatDate(date)
formatDateTime(date)
formatCurrency(amount)
```

### Tema

```javascript
getTheme()
setTheme(theme)
```

El sistema contempla actualmente:

```text
light
dark
```

---

## 15. Interfaz

La interfaz utiliza principalmente:

- **Tailwind CSS**
- **Lucide Icons**
- HTML generado por Google Apps Script

El layout principal utiliza una interfaz administrativa con:

- Sidebar.
- Navegación.
- Header.
- Buscador.
- Calendario.
- Mensajes.
- Notificaciones.
- Perfil.
- Área de contenido.

La interfaz está preparada para adaptarse a pantallas móviles mediante un sidebar responsive.

---

## 16. Errores

El proyecto contempla dos vistas principales de error:

```text
View_Error_404.html
View_Error_500.html
```

### 404

Se utiliza cuando una ruta no existe.

Ejemplo:

```text
?p=ruta-inexistente
```

### 500

Se utiliza cuando ocurre una excepción durante la ejecución de:

- Router.
- Controller.
- Web App.
- Renderizado.

La vista puede mostrar el mensaje técnico del error durante el desarrollo.

---

## 17. Configuración de Google Apps Script

El proyecto utiliza:

```json
{
  "runtimeVersion": "V8"
}
```

y está configurado como Web App.

Actualmente:

```text
executeAs: USER_DEPLOYING
access: ANYONE_ANONYMOUS
```

La configuración definitiva de acceso y autenticación deberá revisarse cuando se implemente el sistema de usuarios y seguridad completo.

---

## 18. Instalación

### 1. Crear el proyecto

Crear un proyecto nuevo en:

**Google Apps Script**

y copiar los archivos del proyecto.

### 2. Configurar el Spreadsheet

Crear o seleccionar:

```text
MASTER
TEMPLATE
```

y configurar sus IDs en `0_Config.gs`.

### 3. Revisar permisos

MarketingOS utiliza servicios de Google como:

```text
SpreadsheetApp
DriveApp
PropertiesService
HtmlService
ScriptApp
```

Por lo tanto, Google Apps Script solicitará los permisos correspondientes.

### 4. Ejecutar como Web App

Desde Apps Script:

```text
Deploy
   ↓
New deployment
   ↓
Web app
```

Configurar el acceso según el modelo de autenticación que se implemente.

---

## 19. Desarrollo

Para agregar un nuevo controlador:

```text
Ctrl_Productos
Ctrl_Clientes
Ctrl_Campaigns
```

por ejemplo:

```javascript
class Ctrl_Productos extends Base_Controller {

  index() {
    return this.view('Productos', {});
  }
}

globalThis.Ctrl_Productos = Ctrl_Productos;
```

Después registrar la ruta:

```javascript
Route.get('productos', 'Productos@index');
```

Y crear:

```text
View_Productos.html
```

La convención general es:

```text
Ruta
 ↓
Controller
 ↓
Model
 ↓
View
```

---

## 20. Estado actual

### Implementado

- [x] Estructura base del proyecto.
- [x] Base Controller.
- [x] Base Model.
- [x] CRUD genérico sobre Google Sheets.
- [x] Motor de vistas.
- [x] Layout principal.
- [x] Router GET/POST.
- [x] Parámetros dinámicos en rutas.
- [x] Controlador Super Admin.
- [x] Dashboard base.
- [x] Pantalla de login.
- [x] Páginas de error 404 y 500.
- [x] Helpers globales.
- [x] Configuración Web App.
- [x] Documentación inicial del modelo de datos.
- [x] Roadmap inicial.

### Pendiente

- [ ] Configuración definitiva `MASTER_ID`.
- [ ] Configuración definitiva `TEMPLATE_ID`.
- [ ] Instalador inicial.
- [ ] Modelo de usuarios.
- [ ] Hash SHA-256.
- [ ] Login conectado al MASTER.
- [ ] Sesiones.
- [ ] Logout.
- [ ] Creación de clientes desde el Dashboard.
- [ ] Clonación automática del TEMPLATE.
- [ ] Generación y validación de tokens.
- [ ] Detección automática de clientes.
- [ ] Acceso aislado por instancia.
- [ ] Vencimientos.
- [ ] Logs.
- [ ] Billing.

---

## 21. Roadmap

El desarrollo está dividido en cuatro fases principales.

### Fase 1 — Core

Construir el núcleo administrativo:

```text
Super Admin
    ↓
Clientes
    ↓
Clonación de TEMPLATE
    ↓
Instancia del cliente
```

### Fase 2 — Auto Detect

El Dashboard deberá detectar y mostrar automáticamente las instancias registradas en:

```text
MASTER!Subscriptions
```

### Fase 3 — Cliente

Implementar el acceso del cliente y validar:

```text
token
email
expiración
instancia
```

El cliente solo deberá acceder a los datos correspondientes a su propia instancia.

### Fase 4 — SaaS

Agregar:

- vencimientos,
- logs,
- billing,
- administración de suscripciones,
- automatizaciones.

El detalle operativo se mantiene en:

```text
ROADMAP.md
```

---

## 22. Principios del proyecto

MarketingOS debe mantenerse bajo algunos principios simples:

### Separación

El MASTER administra el SaaS.

El TEMPLATE define la estructura de una nueva instancia.

Cada cliente trabaja con su propia instancia.

### Reutilización

La lógica común debe permanecer en:

```text
Base_Controller
Base_Model
View
Helpers
Router
```

Los módulos específicos deben implementarse como controladores y vistas independientes.

### Simplicidad

La aplicación está construida sobre Google Apps Script y Google Sheets para reducir infraestructura externa y facilitar el despliegue.

### Aislamiento

Los datos de un cliente no deben quedar expuestos a otro cliente.

### Evolución

El proyecto comienza como un núcleo sencillo y puede evolucionar progresivamente hacia una plataforma SaaS completa.

---

## 23. Documentación relacionada

Además de este README:

- [`DATA_MODEL.md`](DATA_MODEL.md) — estructura de MASTER, TEMPLATE y datos.
- [`ROADMAP.md`](ROADMAP.md) — fases y tareas pendientes.
- [`TREE.md`](TREE.md) — estructura de archivos.

---

## 24. Licencia

Este proyecto no define actualmente una licencia pública.

Hasta que se agregue una licencia explícita, el código debe considerarse **propietario / todos los derechos reservados**.

---

## 25. Resumen

MarketingOS tiene como objetivo convertirse en un **SaaS de gestión de marketing multi-tenant sobre Google Apps Script y Google Sheets**.

La arquitectura base ya separa:

```text
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

y el modelo SaaS previsto añade:

```text
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

El siguiente objetivo funcional es completar el **Core del Super Admin**, especialmente la configuración MASTER/TEMPLATE, autenticación y creación automática de nuevas instancias de clientes.
