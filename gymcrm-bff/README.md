# GymCRM — BFF (Backend for Frontend)

**Integrantes:** Igor Thiago Lara da Silva · Leonardo Ceccon Sobol · Leonardo Godoi Siemens · Rafael Augusto de Oliveira Souza

Único ponto de acesso do Microfrontend: agrega dados dos microsserviços e da Azure Function e faz proxy do CRUD.
`Microfrontend → API Gateway → BFF → MS Estoque (MongoDB) | MS Matrículas (Azure SQL) | Azure Function`

## Responsabilidades
- **Agregação:** `GET /aggregated-data` consulta MS Estoque e MS Matrículas **em paralelo**, depois chama a Azure Function com as matrículas **ativas** e devolve **um único JSON**. Falha parcial não derruba a resposta (`meta.partial = true` + `meta.errors`).
- **Proxy CRUD:** `/products` (estoque) e `/enrollments` (matrículas, incl. `POST /enrollments/:id/renew`).
- **Transversais:** `x-correlation-id` propagado aos serviços a jusante; `GATEWAY_SECRET` opcional (só aceita tráfego vindo do API Gateway); erros a jusante viram 502 `UPSTREAM_UNAVAILABLE`.

### Resposta de `GET /aggregated-data`
```json
{
  "products": [ { "id": "665f...", "name": "Whey Protein 900g", "stock": 2, "minStock": 5, "lowStock": true, "...": "..." } ],
  "lowStockProducts": [ { "id": "665f...", "name": "Whey Protein 900g", "...": "..." } ],
  "enrollments": [ { "id": 1, "studentName": "Maria Souza", "period": "QUARTERLY", "monthlyPrice": 100, "status": "ACTIVE", "...": "..." } ],
  "enrichment": { "enrollmentCount": 1, "grossTotal": 300, "discount": 15, "discountedTotal": 285, "gatewayFee": 8.52, "netTotal": 276.48, "monthlyRecurring": 95 },
  "meta": { "generatedAt": "2026-11-08T12:00:00.000Z", "partial": false, "errors": [] }
}
```
`lowStockProducts` é derivado pelo BFF a partir de `lowStock`. Matrículas fora de `ACTIVE` (trancadas/canceladas) não entram no cálculo financeiro.

## Arquitetura
**Clean Architecture:** `domain` (modelos, portas `ProductsGateway`/`EnrollmentsGateway`/`EnrichmentGateway`) · `application` · `infrastructure` (clientes HTTP) · `api` (controllers). **Vertical Slice:** `aggregated-data`, `products-proxy`, `enrollments-proxy`.

## Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/aggregated-data` | **Obrigatório.** Estoque + Matrículas + Function em um JSON |
| GET/POST | `/products` · `/enrollments` | Lista / cria |
| GET/PUT/DELETE | `/products/:id` · `/enrollments/:id` | Busca / atualiza / remove |
| POST | `/enrollments/:id/renew` | Renova a matrícula |
| GET | `/health` · `/swagger` | Health · Swagger UI |

## Variáveis de ambiente
| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta | `3000` |
| `PRODUCTS_URL` | URL do MS Estoque | `http://localhost:3001` |
| `ENROLLMENTS_URL` | URL do MS Matrículas | `http://localhost:3002` |
| `FUNCTION_URL` / `FUNCTION_KEY` | HTTP Trigger da Function e function key | `http://localhost:7071/api/enrich` / vazio |
| `REQUEST_TIMEOUT_MS` | Timeout por chamada | `8000` |
| `CORS_ORIGIN` | Origens permitidas | `*` |
| `GATEWAY_SECRET` | Segredo injetado pelo API Gateway (opcional) | vazio |

## Rodar
```bash
npm install && cp .env.example .env && npm run start:dev   # Swagger: http://localhost:3000/swagger
```
Docker: `docker build -t <usuario>/gymcrm/bff:v1 .` → `docker login` → `docker push <usuario>/gymcrm/bff:v1`
API Gateway (AWS): ver `gateway/README.md`.

## Testes
`npm test` · `npm run test:unit` · `npm run test:e2e` (BFF completo contra 3 servidores falsos) · `npm run test:arch`

## Links (preencher após o deploy)
BFF: [URL] · Swagger: [URL]/swagger · Gateway: [URL] · Docker Hub: [URL] · Repositório: [URL]
