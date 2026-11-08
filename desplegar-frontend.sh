#!/usr/bin/env bash
# Despliega el frontend en AWS Amplify Hosting (despliegue manual: sin conectar GitHub).
#   1. Lee las URLs de las 5 APIs de CloudFormation y escribe .env.production
#   2. Compila (vite build)
#   3. Empaqueta dist/ en un zip
#   4. Crea la app de Amplify (la primera vez), sube el zip y espera a que quede publicada
#
# Uso (en la EC2, junto a crm-grupo1-infra):  ./desplegar-frontend.sh
#      Otro stage:                            STAGE=prod ./desplegar-frontend.sh
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PAGER=""

STAGE="${STAGE:-dev}"
APP="crm-grupo1-frontend"
RAMA="main"
# Reescritura de SPA: toda ruta sin extensión (/leads, /cuentas/12) sirve index.html.
REGLAS='[{"source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>","target":"/index.html","status":"200"}]'

salida() {  # salida <stack> <OutputKey>
  aws cloudformation describe-stacks --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text
}

echo "=== URLs de las APIs (CloudFormation, stage $STAGE) ==="
: > .env.production
for par in 1:ms1-usuarios 2:ms2-clientes 3:ms3-leads 4:ms4-oportunidades 5:ms5-actividades; do
  n="${par%%:*}"; ms="${par#*:}"
  url="$(salida "crm-$ms-$STAGE" HttpApiUrl)"
  if [ -z "$url" ] || [ "$url" = "None" ]; then echo "Falta el stack crm-$ms-$STAGE: despliega el backend primero" >&2; exit 1; fi
  echo "VITE_MS${n}_URL=${url%/}" >> .env.production
done
cat .env.production

echo -e "\n=== Build ==="
if [ ! -d node_modules ]; then npm ci --no-fund --no-audit; fi
npm run build

echo -e "\n=== Empaquetar dist/ ==="
rm -f frontend.zip
(cd dist && python3 -m zipfile -c ../frontend.zip .)
ls -lh frontend.zip

echo -e "\n=== Amplify ==="
APP_ID="$(aws amplify list-apps --query "apps[?name=='$APP'].appId | [0]" --output text)"
if [ -z "$APP_ID" ] || [ "$APP_ID" = "None" ]; then
  APP_ID="$(aws amplify create-app --name "$APP" --platform WEB --custom-rules "$REGLAS" --query app.appId --output text)"
  echo "App creada: $APP_ID"
else
  aws amplify update-app --app-id "$APP_ID" --custom-rules "$REGLAS" > /dev/null
  echo "App existente: $APP_ID"
fi
if ! aws amplify get-branch --app-id "$APP_ID" --branch-name "$RAMA" > /dev/null 2>&1; then
  aws amplify create-branch --app-id "$APP_ID" --branch-name "$RAMA" --stage PRODUCTION > /dev/null
  echo "Rama creada: $RAMA"
fi

read -r JOB URL_SUBIDA < <(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$RAMA" \
  --query '[jobId, zipUploadUrl]' --output text)
curl -sS --fail -T frontend.zip "$URL_SUBIDA"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$RAMA" --job-id "$JOB" > /dev/null
echo "Despliegue $JOB iniciado"

for _ in $(seq 1 60); do
  ESTADO="$(aws amplify get-job --app-id "$APP_ID" --branch-name "$RAMA" --job-id "$JOB" --query job.summary.status --output text)"
  echo "  estado: $ESTADO"
  case "$ESTADO" in
    SUCCEED) break ;;
    FAILED|CANCELLED) echo "El despliegue falló: revisa la consola de Amplify" >&2; exit 1 ;;
  esac
  sleep 5
done

echo -e "\nFrontend publicado: https://$RAMA.$APP_ID.amplifyapp.com"
