# Cristiano Silva SE — Plataforma de Gestão

Aplicação para gestão de clientes/imóveis, catálogo elétrico, orçamentos, ordens de serviço e agenda.

## Stack e execução
Node.js 20+, Express + TypeScript, Mongoose, MongoDB em memória (`mongodb-memory-server`), React + Vite + Tailwind e OpenAPI/Swagger.

`npm install` e `npm run dev` iniciam API e frontend. Frontend: http://localhost:5173 · API: http://localhost:4000/api/v1 · Swagger: http://localhost:4000/api-docs. `npm run build` compila os workspaces. O banco é volátil e o seed é recriado ao reiniciar.

## Seed de demonstração
Admin: admin@cristianose.local / CristianoSE@2026; dois técnicos com especialidades e cores distintas. Protótipo sem autenticação real; não usar dados pessoais em produção.

## Identidade visual
Preto #080808, laranja #F29A55, teal #477E7B, fundo #F7F8F8. Logo SVG na pasta pública do frontend e backend. A versão vetorial representa visualmente o logotipo recebido.

## Restrição
Nenhuma suíte de testes automatizados foi adicionada, conforme solicitado.

Branch: feat/cristiano-se-fullstack-platform