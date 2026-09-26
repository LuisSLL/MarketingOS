# MarketingOS - ROADMAP

## FASE 1 - CORE (AHORA)
- [x] Super Admin Dashboard front
- [ ] 0_Config.gs con MASTER_ID / TEMPLATE_ID
- [ ] 2_Base_Model.gs - all, find, create, update
- [ ] 1_Base_Controller.gs - checkToken, hash, checkLogin
- [ ] 0_Install.gs - installMaster() + crearClienteHibrido()
- [ ] Login conectado a MASTER!Clients (MASTER@gmail.com / MASTER123 hash SHA256)
- [ ] Botón +Agregar Cliente -> clona TEMPLATE con makeCopy()

## FASE 2 - AUTO-DETECT
- [ ] Dashboard lee MASTER!Subscriptions cada 5s
- [ ] Muestra tarjetas clientes auto
- [ ] Botón Ver Sheet + Copiar Link con?token=

## FASE 3 - CLIENTE
- [ ] 11_Main.gs doGet con validación token vs Settings B1
- [ ] Cliente ve solo su Sheet: Leads, Sales, Campaigns, AdSets, Ads
- [ ] Email automático con link dashboard

## FASE 4 - SAAS
- [ ] Vencimiento 30 días en Subscriptions
- [ ] Logs de creación
- [ ] Billing

Objetivo: Botón +Agregar crea Sheet + Dashboard listo.
