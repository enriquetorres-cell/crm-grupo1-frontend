// URLs de las 5 APIs. Vienen de .env.production (lo genera desplegar-frontend.sh desde CloudFormation).
export const URLS = {
  ms1: import.meta.env.VITE_MS1_URL as string,
  ms2: import.meta.env.VITE_MS2_URL as string,
  ms3: import.meta.env.VITE_MS3_URL as string,
  ms4: import.meta.env.VITE_MS4_URL as string,
  ms5: import.meta.env.VITE_MS5_URL as string,
}

export type Ms = keyof typeof URLS

export const FALTAN_URLS = Object.entries(URLS)
  .filter(([, url]) => !url)
  .map(([ms]) => ms)
