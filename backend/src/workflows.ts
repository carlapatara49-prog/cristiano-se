import type { Express, Request, Response } from "express";
import mongoose from "mongoose";\nimport path from "node:path";
import PDFDocument from "pdfkit";
import { v4 as uuid } from "uuid";

const model = (name: string) => mongoose.model(name);
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => fn(req, res).catch((e: any) => res.status(400).json({ error: e.message }));

function brand(doc: PDFDocument, subtitle: string) {
  try { doc.image(path.resolve("public/logo-cristiano-se.png"), 42, 24, { width: 185 }); }
  catch { doc.fillColor("#080808").fontSize(18).font("Helvetica-Bold").text("CRISTIANO", 42, 42, { continued: true }); doc.fillColor("#F29A55").text(" SILVA SE"); }
  doc.fillColor("#555").fontSize(10).font("Helvetica").text(subtitle, 42, 108);
  doc.moveTo(42, 124).lineTo(553, 124).strokeColor("#F29A55").lineWidth(2).stroke();
  doc.y = 138;
}
function money(n: number) { return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function createPdf(res: Response, title: string, render: (doc: PDFDocument) => void) {
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: title, Author: "Cristiano Silva SE" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  doc.on("end", () => { res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", 'inline; filename="' + title.replace(/[^a-z0-9-]/gi, "-") + '.pdf"'); res.send(Buffer.concat(chunks)); });
  render(doc); doc.end();
}
export function registerWorkflowRoutes(app: Express, base: string) {
  const Quote = model("Orcamento"), WorkOrder = model("OrdemServico"), Client = model("Cliente"), Property = model("ClienteImovel"), Service = model("Servico"), Material = model("Material"), Appointment = model("Agendamento"), Technician = model("Tecnico");
  app.get(base + "/tecnicos", asyncRoute(async (_req, res) => res.json(await Technician.find({ ativo: { $ne: false } }).select("-senha_demo"))));
  app.get(base + "/orcamentos/:id/pdf", asyncRoute(async (req, res) => {
    const q: any = await Quote.findById(req.params.id).populate("cliente_id").populate("imovel_id");
    if (!q) return res.status(404).json({ error: "Orçamento não encontrado" });
    const charged = (q.itens || []).filter((i: any) => i.cobrar_do_cliente !== false);
    const clientMaterials = (q.itens || []).filter((i: any) => i.cobrar_do_cliente === false);
    createPdf(res, q.codigo || "orcamento", (doc) => {
      brand(doc, "ORÇAMENTO DE SERVIÇOS ELÉTRICOS");
      doc.fontSize(15).fillColor("#080808").font("Helvetica-Bold").text(q.codigo || "Orçamento");
      doc.fontSize(10).font("Helvetica").text("Projeto: " + (q.titulo_projeto || "-"));
      doc.text("Cliente: " + (q.cliente_id?.nome_razao_social || q.cliente_avulso?.nome || "Cliente avulso"));
      const addr = q.imovel_id?.endereco;
      if (addr) doc.text("Local: " + [addr.logradouro, addr.numero, addr.bairro, addr.cidade, addr.uf].filter(Boolean).join(", "));
      doc.moveDown();
      doc.font("Helvetica-Bold").text("SERVIÇOS E MATERIAIS COBRADOS");
      doc.font("Helvetica");
      charged.forEach((i: any) => doc.text((i.ambiente ? i.ambiente + " · " : "") + i.descricao + " | " + i.quantidade + " " + (i.unidade || "") + " | " + money(i.subtotal)));
      doc.moveDown();
      if (clientMaterials.length) {
        doc.font("Helvetica-Bold").text("LISTA DE MATERIAIS PARA COMPRA PELO CLIENTE");
        doc.font("Helvetica");
        clientMaterials.forEach((i: any) => doc.text(i.descricao + " | " + i.quantidade + " " + (i.unidade || "")));
        doc.moveDown();
      }
      doc.font("Helvetica").text("Subtotal de serviços: " + money(q.subtotal_servicos));
      doc.text("Subtotal de materiais: " + money(q.subtotal_materiais));
      doc.text("Visita técnica: " + money(q.taxa_visita) + (q.abater_taxa_visita ? " (abatida)" : ""));
      doc.text("Desconto: " + money(q.desconto_valor));
      doc.font("Helvetica-Bold").fontSize(14).text("TOTAL: " + money(q.valor_total));
      doc.fontSize(10).font("Helvetica").moveDown().text("Validade: " + (q.validade_dias || 7) + " dias · Execução: " + (q.prazo_execucao || "A combinar"));
      doc.text("Pagamento: " + (q.condicoes_pagamento || "A combinar"));
      doc.text("Garantia: " + (q.garantia_texto || "Conforme legislação aplicável"));
      doc.moveDown().fillColor("#477E7B").text("Aprovação online: " + (process.env.PUBLIC_APP_URL || "http://localhost:5173") + "/aprovar/" + q.token_aprovacao_publica);
    });
  }));
  app.post(base + "/orcamentos/:id/converter-os", asyncRoute(async (req, res) => {
    const q: any = await Quote.findById(req.params.id);
    if (!q) return res.status(404).json({ error: "Orçamento não encontrado" });
    if (!q.cliente_id || !q.imovel_id) return res.status(422).json({ error: "Associe cliente e imóvel antes de converter em OS" });
    q.status = "APROVADO"; await q.save();
    const os = await WorkOrder.create({
      numero_os: "OS-" + new Date().getFullYear() + "-" + uuid().slice(0, 8).toUpperCase(),
      orcamento_id: q._id, cliente_id: q.cliente_id, imovel_id: q.imovel_id, status: "ORCAMENTO",
      prioridade: "NORMAL", tipo_servico: "INSTALACAO", itens: (q.itens || []).map((i: any) => ({
        tipo: i.tipo, referencia_id: i.referencia_id, descricao: i.descricao, quantidade: i.quantidade,
        valor_unitario: i.valor_unitario, fornecido_pelo_cliente: i.cobrar_do_cliente === false
      })), valor_total: q.valor_total, created_at: new Date()
    });
    res.status(201).json({ orcamento: q, os });
  }));
  app.get(base + "/os/:id/pdf", asyncRoute(async (req, res) => {
    const os: any = await WorkOrder.findById(req.params.id).populate("cliente_id").populate("imovel_id").populate("tecnico_id");
    if (!os) return res.status(404).json({ error: "OS não encontrada" });
    createPdf(res, os.numero_os || "ordem-servico", (doc) => {
      brand(doc, "ORDEM DE SERVIÇO");
      doc.fontSize(15).fillColor("#080808").font("Helvetica-Bold").text(os.numero_os);
      doc.fontSize(10).font("Helvetica").text("Cliente: " + (os.cliente_id?.nome_razao_social || "-"));
      doc.text("Técnico: " + (os.tecnico_id?.nome || "Não atribuído"));
      doc.text("Status: " + os.status + " · Prioridade: " + os.prioridade);
      doc.text("Problema: " + (os.descricao_problema || "-"));
      doc.moveDown().font("Helvetica-Bold").text("Itens");
      doc.font("Helvetica"); (os.itens || []).forEach((i: any) => doc.text(i.descricao + " · " + i.quantidade + " · " + money(i.quantidade * i.valor_unitario)));
      doc.moveDown().font("Helvetica-Bold").text("Checklist NR-10");
      doc.font("Helvetica").text(JSON.stringify(os.checklist_nr10 || {}, null, 2));
      doc.moveDown().text("Laudo: " + (os.laudo_tecnico || "Não informado"));
      doc.text("Valor: " + money(os.valor_total));
      doc.text("Garantia: " + (os.prazo_garantia_dias || 0) + " dias");
    });
  }));
  app.get(base + "/agenda/visual", asyncRoute(async (req, res) => {
    const filter: any = {};
    if (req.query.inicio || req.query.fim) filter.data_inicio = { ...(req.query.inicio ? { $gte: new Date(String(req.query.inicio)) } : {}), ...(req.query.fim ? { $lte: new Date(String(req.query.fim)) } : {}) };
    if (req.query.tecnico_id) filter.tecnico_id = req.query.tecnico_id;
    res.json(await Appointment.find(filter).populate("os_id tecnico_id").sort({ data_inicio: 1 }));
  }));
  app.post(base + "/os/:id/iniciar", asyncRoute(async (req, res) => {
    const os: any = await WorkOrder.findById(req.params.id);
    if (!os) return res.status(404).json({ error: "OS não encontrada" });
    os.status = "EM_ANDAMENTO"; os.iniciada_at = new Date(); await os.save(); res.json(os);
  }));
  app.post(base + "/os/:id/finalizacao-pdf", asyncRoute(async (req, res) => {
    const os: any = await WorkOrder.findByIdAndUpdate(req.params.id, { ...req.body, status: "CONCLUIDA", concluida_at: new Date() }, { new: true });
    if (!os) return res.status(404).json({ error: "OS não encontrada" });
    res.json({ ordem_servico: os, pdf: base + "/os/" + os._id + "/pdf" });
  }));
  app.get(base + "/clientes/:id/historico", asyncRoute(async (req, res) => {
    const [client, properties, orders, quotes] = await Promise.all([Client.findById(req.params.id), Property.find({ cliente_id: req.params.id }), WorkOrder.find({ cliente_id: req.params.id }).sort({ created_at: -1 }), Quote.find({ cliente_id: req.params.id }).sort({ created_at: -1 })]);
    res.json({ client, properties, orders, quotes });
  }));
  app.post(base + "/orcamentos/:id/reenviar-link", asyncRoute(async (req, res) => {
    const q: any = await Quote.findById(req.params.id); if (!q) return res.status(404).json({ error: "Orçamento não encontrado" });
    if (!q.token_aprovacao_publica) { q.token_aprovacao_publica = uuid(); await q.save(); }
    const link = (process.env.PUBLIC_APP_URL || "http://localhost:5173") + "/aprovar/" + q.token_aprovacao_publica;
    const phone = (q.cliente_id?.telefone_whatsapp || q.cliente_avulso?.telefone || "").replace(/\D/g, "");
    res.json({ link, whatsapp_url: "https://wa.me/" + phone + "?text=" + encodeURIComponent("Olá! Segue o orçamento " + q.codigo + " para aprovação: " + link) });
  }));
}
export async function seedWorkflowExamples() {
  const Client = model("Cliente"), Property = model("ClienteImovel"), Quote = model("Orcamento"), WorkOrder = model("OrdemServico"), Appointment = model("Agendamento"), Technician = model("Tecnico");
  if (await Client.countDocuments()) return;
  const clients = await Client.create([
    { tipo_pessoa:"PF", nome_razao_social:"Mariana Oliveira", cpf_cnpj:"12345678901", telefone_whatsapp:"11999990001", email:"mariana@example.com", ativo:true },
    { tipo_pessoa:"PJ", nome_razao_social:"Comercial Alfa Ltda", nome_fantasia_apelido:"Comercial Alfa", cpf_cnpj:"12345678000199", telefone_whatsapp:"1133334000", email:"contato@alfa.example", ativo:true }
  ]);
  const properties = await Property.create([
    { cliente_id:clients[0]._id, apelido_local:"Residência Principal", tipo_imovel:"RESIDENCIAL", endereco:{cep:"01001000",logradouro:"Praça da Sé",numero:"100",bairro:"Sé",cidade:"São Paulo",uf:"SP"}, ficha_tecnica:{padrao_entrada:"BIFASICO",tensao_rede:"127V_220V",disjuntor_geral:{amperagem:63,curva:"C"},sistema_aterramento:{possui_aterramento:true,esquema:"TN-S",possui_idr:true,possui_dps:true},localizacao_qdc:"Lavanderia"} },
    { cliente_id:clients[1]._id, apelido_local:"Unidade Comercial", tipo_imovel:"COMERCIAL", endereco:{cep:"01310000",logradouro:"Avenida Paulista",numero:"500",bairro:"Bela Vista",cidade:"São Paulo",uf:"SP"}, ficha_tecnica:{padrao_entrada:"TRIFASICO",tensao_rede:"380V",disjuntor_geral:{amperagem:100,curva:"C"},sistema_aterramento:{possui_aterramento:true,esquema:"TT",possui_idr:true,possui_dps:true},localizacao_qdc:"Sala técnica"} }
  ]);
  await Quote.create({codigo:"ORC-"+new Date().getFullYear()+"-001",cliente_id:clients[0]._id,imovel_id:properties[0]._id,titulo_projeto:"Adequação elétrica residencial",status:"ENVIADO",validade_dias:7,prazo_execucao:"2 dias",modalidade_material:"MISTO",subtotal_servicos:95,subtotal_materiais:30,taxa_visita:50,abater_taxa_visita:true,desconto_valor:0,valor_total:125,condicoes_pagamento:"50% início / 50% conclusão",garantia_texto:"90 dias sobre os serviços",token_aprovacao_publica:uuid(),created_at:new Date(),itens:[{ambiente:"Cozinha",tipo:"SERVICO",descricao:"Instalação de tomada 20A",unidade:"PONTO",quantidade:1,valor_unitario:95,subtotal:95,cobrar_do_cliente:true},{ambiente:"Cozinha",tipo:"MATERIAL",descricao:"Cabo 2,5mm²",unidade:"M",quantidade:3,valor_unitario:10,subtotal:30,cobrar_do_cliente:true}]});
  const orders = await WorkOrder.create([
    {numero_os:"OS-"+new Date().getFullYear()+"-0041",cliente_id:clients[0]._id,imovel_id:properties[0]._id,status:"AGENDADA",prioridade:"NORMAL",tipo_servico:"MANUTENCAO_PREVENTIVA",descricao_problema:"Inspeção preventiva do quadro",itens:[],valor_total:280,created_at:new Date()},
    {numero_os:"OS-"+new Date().getFullYear()+"-0042",cliente_id:clients[1]._id,imovel_id:properties[1]._id,status:"AGENDADA",prioridade:"NORMAL",tipo_servico:"INSPECAO",descricao_problema:"Inspeção de circuitos comerciais",itens:[],valor_total:350,created_at:new Date()}
  ]);
  const techs = await Technician.find({especialidade:{$ne:"Gestão"}});
  const start = new Date(); start.setDate(start.getDate()+1); start.setHours(9,0,0,0);
  const end = new Date(start); end.setHours(11);
  const start2 = new Date(start); start2.setHours(13);
  const end2 = new Date(start2); end2.setHours(15);
  await Appointment.create([{os_id:orders[0]._id,tecnico_id:techs[0]._id,data_inicio:start,data_fim:end,observacoes:"Confirmar acesso ao QDC"},{os_id:orders[1]._id,tecnico_id:techs[1]._id,data_inicio:start2,data_fim:end2,observacoes:"Atendimento comercial"}]);
}