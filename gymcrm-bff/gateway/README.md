# API Gateway (AWS API Gateway — HTTP API)

O gateway é o **ponto único de entrada** do sistema: o Microfrontend chama o gateway, o gateway encaminha para o BFF.

```
Microfrontend  ->  API Gateway (AWS)  ->  BFF  ->  MS Estoque | MS Matrículas | Azure Function
```

| Responsabilidade | Como é atendida |
|---|---|
| **Roteamento** | Rota `ANY /{proxy+}` com integração HTTP proxy para a URL pública do BFF |
| **Segurança** | O gateway injeta o header `x-gateway-secret`; o BFF (com `GATEWAY_SECRET` definido) rejeita com 403 qualquer chamada que não passou pelo gateway |
| **Centralização / proteção** | *Throttling* (limite de taxa e de rajada) e CORS configurados no gateway |

> **Observação sobre o enunciado:** ele cita AWS Gateway, enquanto os demais recursos estão no Azure. Funciona normalmente (o gateway só precisa alcançar a URL pública HTTPS do BFF). Se o professor aceitar, **Azure API Management** é a alternativa (ver o final deste arquivo).

## Pré-requisitos
- BFF já publicado com URL pública HTTPS (ex.: `https://gymcrm-bff.exemplo.com`).
- Conta AWS e [AWS CLI](https://aws.amazon.com/cli/) configurado (`aws configure`) — ou use o console web (seção "Pelo console").
- Escolha um segredo longo e aleatório (ex.: `openssl rand -hex 24`) para o `x-gateway-secret`.

## Pela AWS CLI (bash)

```bash
BFF_URL="https://gymcrm-bff.exemplo.com"      # sem barra no final
SECRET="troque-por-um-segredo-longo"
REGION="us-east-1"

# 1) cria a API HTTP com CORS
API_ID=$(aws apigatewayv2 create-api --region $REGION --name gymcrm-gateway --protocol-type HTTP \
  --cors-configuration 'AllowOrigins=*,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=content-type,x-correlation-id,ExposeHeaders=x-correlation-id,MaxAge=3600' \
  --query ApiId --output text)

# 2) integração HTTP proxy com o BFF, injetando o segredo
INTEGRATION_ID=$(aws apigatewayv2 create-integration --region $REGION --api-id $API_ID \
  --integration-type HTTP_PROXY --integration-method ANY \
  --integration-uri "$BFF_URL/{proxy}" --payload-format-version 1.0 \
  --request-parameters "overwrite:header.x-gateway-secret=$SECRET" \
  --query IntegrationId --output text)

# 3) rota que captura tudo
aws apigatewayv2 create-route --region $REGION --api-id $API_ID \
  --route-key 'ANY /{proxy+}' --target "integrations/$INTEGRATION_ID"

# 4) stage com deploy automático e throttling
aws apigatewayv2 create-stage --region $REGION --api-id $API_ID --stage-name '$default' --auto-deploy \
  --default-route-settings ThrottlingBurstLimit=50,ThrottlingRateLimit=20

echo "Gateway: https://$API_ID.execute-api.$REGION.amazonaws.com"
```

No **PowerShell**, use as mesmas chamadas trocando a sintaxe de variáveis (`$API_ID = aws ... --output text`) e prefira as aspas duplas externas para os argumentos que contêm `{proxy}` e `$default` (com crase para escapar o `$`).

## Pelo console web (alternativa)
1. **API Gateway → Create API → HTTP API → Build**.
2. *Integrations → Add integration → HTTP*: método **ANY**, URL `https://<seu-bff>/{proxy}`.
3. *Routes*: `ANY /{proxy+}` apontando para a integração.
4. *Integrations → Manage → Parameter mappings*: adicionar `Request → Overwrite → header.x-gateway-secret = <segredo>`.
5. *CORS*: origem `*` (ou a URL do frontend), métodos `GET,POST,PUT,DELETE,OPTIONS`, headers `content-type,x-correlation-id`, expose `x-correlation-id`.
6. *Stages → $default*: *Throttling* → rate 20 / burst 50. Habilitar *Auto-deploy*.

## Depois de criar
1. No **BFF**, definir `GATEWAY_SECRET` com o **mesmo** segredo e reiniciar o serviço.
2. Testar:
   ```bash
   curl -i https://<api-id>.execute-api.<regiao>.amazonaws.com/health           # 200 (livre)
   curl -i https://<api-id>.execute-api.<regiao>.amazonaws.com/aggregated-data  # 200 via gateway
   curl -i https://<url-direta-do-bff>/aggregated-data                          # 403: só passa pelo gateway
   ```
3. Swagger do BFF **via gateway**: `https://<api-id>.execute-api.<regiao>.amazonaws.com/swagger` (o "Try it out" também passa pelo gateway).
4. Apontar o frontend: `VITE_API_BASE_URL=https://<api-id>.execute-api.<regiao>.amazonaws.com` e refazer o build.
5. **Prints para o ARC42:** (a) tela da API no console (Routes e Integrations), (b) *Stage → Throttling*, (c) uma chamada bem-sucedida via gateway e a mesma chamada direta ao BFF dando 403.

## Alternativa: Azure API Management
Criar uma instância (SKU *Consumption*), importar a API a partir de `https://<bff>/swagger-json`, e adicionar na política de entrada:
```xml
<inbound>
  <base />
  <set-header name="x-gateway-secret" exists-action="override"><value>SEGREDO</value></set-header>
  <rate-limit calls="20" renewal-period="1" />
  <cors><allowed-origins><origin>*</origin></allowed-origins><allowed-methods><method>*</method></allowed-methods><allowed-headers><header>*</header></allowed-headers></cors>
</inbound>
```
