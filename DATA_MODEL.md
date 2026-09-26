# MarketingOS - DATA MODEL

## MASTER SHEET (ID: MASTER_ID)
Control tuyo. 4 tabs:

**Subscriptions**
| fecha | nombre_agencia | email | sheet_id_clon | token | estado |
| 2025-10-08 | Agencia X | x@gmail.com | 1a2b3c... | uuid-123 | Activo |

**Clients**
| email | password_hash | role |
| MASTER@gmail.com | sha256(MASTER123) | superadmin |

**Logs**
| fecha | accion | email |

**Settings**
| key | value |
| MASTER_ID |... |
| TEMPLATE_ID |... |

## TEMPLATE SHEET (ID: TEMPLATE_ID)
Molde que se clona. 11 tabs:

**Leads** | id | nombre | email | telefono | campaña | fecha |
**Sales** | id | lead_id | monto | fecha | estado |
**Campaigns** | id | nombre | presupuesto | estado |
**AdSets** | id | campaign_id | nombre |
**Ads** | id | adset_id | nombre | ctr |
**Budgets** | mes | monto | gastado |
**Reports** | fecha | leads | ventas | roas |
**Clients** | id | nombre | email |
**Tasks** | id | titulo | estado |
**Settings** | key | value |
  B1 = token (uuid)
  B2 = owner_email
  B3 = vence (hoy+30)
**Tokens** | token | email | expira |

## SHARED - Pattern Together
Vive identico en MASTER y TEMPLATE:
- 0_Config.gs: isMaster(), getDB()
- 2_Base_Model.gs: all(), find(), create()
- 1_Base_Controller.gs: checkToken(), checkLogin(), hash()

Flujo clonación:
DriveApp.getFileById(TEMPLATE_ID).makeCopy("MarketingOS_"+nombre) -> escribe token en Settings B1 -> escribe fila en MASTER!Subscriptions -> addEditor(email)
