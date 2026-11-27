# Cristiano Silva SE — Sistema de Gestão de Serviços Elétricos

Aplicação web full-stack para gestão de serviços elétricos residenciais, prediais, manutenção e automação.

## Funcionalidades

- Cadastro de clientes PF/PJ, cadastro rápido e múltiplos imóveis por cliente.
- Ficha técnica elétrica do imóvel: padrão de entrada, tensão, disjuntor, aterramento, IDR, DPS e localização do QDC.
- Busca de CEP por ViaCEP e consulta de CNPJ/Razão Social por BrasilAPI.
- Catálogo de categorias, materiais e serviços com composição de kits.
- Orçamento com itens por ambiente, snapshot de descrição/preço, validade, prazo, taxa de visita, abatimento, desconto e condição de pagamento.
- Itens não cobrados destacados como lista de compra do cliente e excluídos do total da empresa.
- PDF de orçamento e OS com logotipo, resumo de valores, garantia e detalhes do atendimento.
- Link público com token UUID para aprovação de orçamento e compartilhamento via WhatsApp.
- Conversão de orçamento aprovado em ordem de serviço.
- OS com status, prioridade, técnico, itens, evidências, laudo e checklist NR-10.
- Kanban, agenda visual Dia/Semana/Mês, filtro por técnico e reagendamento com validação de conflito.
- Tela de execução em campo com fotos antes/depois e assinatura digital.
- Swagger/OpenAPI em `/api-docs` e arquivo `backend/swagger.yaml`.

## Stack

- Backend: Node.js 20+, Express, TypeScript, Mongoose, MongoDB Memory Server, PDFKit, Swagger UI.
- Frontend: React, Vite, Tailwind CSS e lucide-react.
- Banco: MongoDB em memória. **Os dados são apagados quando o processo encerra/reinicia.** Para produção, configure MongoDB persistente, autenticação, autorização, armazenamento de fotos e variáveis de ambiente.

## Instalação e execução

Na raiz do repositório:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API Base: http://localhost:4000/api/v1
- Swagger UI: http://localhost:4000/api-docs
- OpenAPI YAML: http://localhost:4000/swagger.yaml
- Health check: http://localhost:4000/api/v1/health

Build:

```bash
npm run build
```

## Seed de demonstração

O servidor popula automaticamente catálogo e demonstração na primeira inicialização do banco em memória:

- 1 usuário de demonstração/administrador e 2 técnicos com especialidades e cores de agenda.
- 11 materiais de instalação elétrica (cabos, disjuntores, IDR, DPS, QDC, tomada, Wago e fita).
- 5 serviços com kits de materiais.
- 2 clientes de demonstração (PF e PJ), 2 imóveis com ficha técnica, 1 orçamento enviado e 2 OS agendadas.

Credencial de demonstração exibida no seed: `admin@cristianose.local` / `CristianoSE@2026`.

**Nota de segurança:** esta entrega é um ambiente demonstrativo. A autenticação real e a proteção de rotas não estão habilitadas; não use essa credencial em produção nem insira dados reais.

## Regras de negócio

1. Kits de materiais são sugeridos ao adicionar serviços (frontend e inclusão de serviço na OS), com quantidades proporcionais.
2. Itens com `cobrar_do_cliente: false` ou `fornecido_pelo_cliente: true` são excluídos do total da empresa e aparecem em seção separada no PDF.
3. A taxa de visita é abatida automaticamente quando `abater_taxa_visita` está habilitado.
4. Agenda impede sobreposição de horários para o mesmo técnico no mesmo intervalo.
5. A OS acumula tempo estimado de serviços e retorna duração sugerida ao inserir serviço.
6. Finalização de OS exige confirmação de desenergização, bloqueio/etiquetagem, ausência de tensão e EPIs (NR-10).
7. Orçamentos guardam valores e descrições dos itens no momento da emissão, mantendo o snapshot.

## Principais rotas

| Área | Rotas |
|---|---|
| Catálogo | `GET/POST /categorias`, `GET/POST /materiais`, `PUT/DELETE /materiais/:id`, `GET/POST /servicos`, `GET /servicos/:id` |
| Clientes | `GET/POST /clientes`, `GET/PUT /clientes/:id`, `POST /clientes/:id/imoveis`, `PATCH /imoveis/:imovel_id/ficha-tecnica` |
| Orçamentos | `GET/POST /orcamentos`, `POST /orcamentos/:id/duplicar`, `POST /orcamentos/:id/converter-os`, `GET /orcamentos/:id/pdf`, `POST /orcamentos/publico/:token/aprovar` |
| OS | `GET/POST /os`, `POST /os/:id/itens`, `PATCH /os/:id/status`, `POST /os/:id/iniciar`, `POST /os/:id/finalizar`, `GET /os/:id/pdf` |
| Agenda | `GET/POST /agenda`, `PATCH /agenda/:id/reagendar`, `GET /agenda/visual` |

## Identidade visual

Paleta extraída do logotipo fornecido:
- Preto `#080808`
- Laranja `#F29A55`
- Verde-azulado `#477E7B`
- Fundo `#F7F8F8`

O PNG do logotipo está disponível em `frontend/public/logo-cristiano-se.png` e `backend/public/logo-cristiano-se.png`, para uso na aplicação, favicon e documentos PDF.

## Restrição de testes

Conforme solicitado, **não foram adicionadas suítes de testes automatizados unitários, de integração ou E2E**.

## Pull Request

A implementação complementar é desenvolvida na branch `feat/complete-business-workflows`.
