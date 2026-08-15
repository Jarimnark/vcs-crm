import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['node_modules/**', '.next/**', 'pdf-service/**', 'src/db/migrations/**'] },
  ...coreWebVitals,
  ...nextTypescript,
]

export default config
