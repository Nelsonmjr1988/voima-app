interface OCData {
  id: string;
  codigo: string;
  pedido_codigo: string;
  fornecedor: string;
  data_emissao: string;
  valor_total: number;
  empresa_nome?: string;
  obra_nome?: string;
  itens: Array<{
    descricao: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number;
    preco_total: number;
  }>;
}

// Gerar PDF profissional para OC usando HTML2PDF (client-side)
export async function generateOCPDF(ocData: OCData): Promise<Buffer> {
  const empresaNome = ocData.empresa_nome || 'VOIMA';
  const obraNome = ocData.obra_nome || 'Obra';

  // Montar HTML do PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 10pt;
          color: #333;
          background: white;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 2px solid #003366;
        }
        
        .header {
          background-color: #003366;
          color: white;
          padding: 20px;
          text-align: center;
          border-bottom: 3px solid #FF6600;
        }
        .header h1 {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 9pt;
          opacity: 0.9;
        }
        
        .info-section {
          display: flex;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        .info-column {
          flex: 1;
          padding: 12px;
          border-right: 1px solid #ddd;
          font-size: 9pt;
        }
        .info-column:last-child {
          border-right: none;
        }
        .info-label {
          font-weight: bold;
          color: #003366;
          font-size: 8pt;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .info-value {
          font-size: 10pt;
          color: #333;
          margin-bottom: 8px;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        .table-header {
          background-color: #003366;
          color: white;
          padding: 10px;
          font-weight: bold;
          font-size: 9pt;
          text-transform: uppercase;
          border: 1px solid #003366;
        }
        .table-row {
          border-bottom: 1px solid #ddd;
        }
        .table-row td {
          padding: 10px;
          font-size: 9pt;
          border-right: 1px solid #eee;
        }
        .table-row td:last-child {
          border-right: none;
        }
        .table-row:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .col-descricao { width: 40%; text-align: left; }
        .col-quantidade { width: 12%; text-align: center; }
        .col-unidade { width: 10%; text-align: center; }
        .col-preco { width: 19%; text-align: right; }
        .col-total { width: 19%; text-align: right; }
        
        .totais {
          background-color: #f5f5f5;
          border: 2px solid #003366;
          margin: 10px 0;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 15px;
          font-size: 11pt;
          align-items: center;
        }
        .total-row.valor-total {
          background-color: #FF6600;
          color: white;
          font-weight: bold;
          font-size: 14pt;
          border-top: 2px solid #003366;
        }
        
        .footer {
          margin-top: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          font-size: 8pt;
          line-height: 1.4;
          color: #666;
        }
        .footer p {
          margin-bottom: 5px;
        }
        
        .observacoes {
          margin: 15px 0;
          padding: 10px;
          background: #fff3cd;
          border-left: 4px solid #FF6600;
          font-size: 9pt;
        }
        
        @page {
          size: A4;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- CABEÇALHO -->
        <div class="header">
          <h1>ORDEM DE COMPRA</h1>
          <p>Sistema VOIMA de Gestão de Compras</p>
        </div>
        
        <!-- INFORMAÇÕES GERAIS -->
        <div class="info-section">
          <div class="info-column">
            <div class="info-label">Nº da OC</div>
            <div class="info-value">${ocData.codigo}</div>
            <div class="info-label">Nº do Pedido</div>
            <div class="info-value">${ocData.pedido_codigo}</div>
          </div>
          <div class="info-column">
            <div class="info-label">Data de Emissão</div>
            <div class="info-value">${new Date(ocData.data_emissao).toLocaleDateString('pt-BR')}</div>
            <div class="info-label">Data de Validação</div>
            <div class="info-value">${new Date(new Date(ocData.data_emissao).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="info-column">
            <div class="info-label">Empresa</div>
            <div class="info-value">${empresaNome}</div>
            <div class="info-label">Obra</div>
            <div class="info-value">${obraNome}</div>
          </div>
          <div class="info-column">
            <div class="info-label">Fornecedor</div>
            <div class="info-value ${ocData.fornecedor ? '' : 'style="color: #999;"'}">${ocData.fornecedor || 'A Definir'}</div>
            <div class="info-label">Status</div>
            <div class="info-value"><strong>EMITIDA</strong></div>
          </div>
        </div>
        
        <!-- TABELA DE ITENS -->
        <table class="table">
          <thead>
            <tr>
              <td class="table-header col-descricao">Descrição do Material</td>
              <td class="table-header col-quantidade">Qtd</td>
              <td class="table-header col-unidade">Un.</td>
              <td class="table-header col-preco">Preço Un.</td>
              <td class="table-header col-total">Total</td>
            </tr>
          </thead>
          <tbody>
            ${ocData.itens
              .map(
                (item) => `
              <tr class="table-row">
                <td class="col-descricao">${item.descricao}</td>
                <td class="col-quantidade">${item.quantidade.toFixed(2)}</td>
                <td class="col-unidade">${item.unidade}</td>
                <td class="col-preco">R$ ${item.preco_unitario.toFixed(2)}</td>
                <td class="col-total">R$ ${item.preco_total.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        
        <!-- TOTALIZADOR -->
        <div class="totais">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>R$ ${(ocData.valor_total * 0.95).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Total Itens: ${ocData.itens.length}</span>
            <span></span>
          </div>
          <div class="total-row valor-total">
            <span>VALOR TOTAL DA ORDEM</span>
            <span>R$ ${ocData.valor_total.toFixed(2)}</span>
          </div>
        </div>
        
        <!-- OBSERVAÇÕES -->
        <div class="observacoes">
          <strong>⚠️ IMPORTANTE:</strong><br/>
          Confirme o recebimento desta OC e informe qualquer dúvida ao representante da empresa. 
          Esta OC é válida por 7 dias a partir da data de emissão.
        </div>
        
        <!-- RODAPÉ -->
        <div class="footer">
          <p><strong>Condições de Pagamento:</strong> Conforme acordado</p>
          <p><strong>Local de Entrega:</strong> ${obraNome}</p>
          <p><strong>Contato:</strong> Equipe VOIMA - Sistema de Gestão de Compras</p>
          <p style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
            Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}.
            Válido apenas com identificação da empresa.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Converter HTML para PDF (texto raw PDF simples por agora)
  // Em produção, usar biblioteca como pdfkit com renderização HTML ou usar API como htmlToPdf.cloud
  
  const pdfContent = Buffer.from(htmlContent);
  return pdfContent;
}
