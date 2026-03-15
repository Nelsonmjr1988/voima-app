import PDFDocument from 'pdfkit';

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

export async function generateOCPDF(ocData: OCData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Criar documento PDF
      const doc = new PDFDocument({ size: 'A4', margin: 20 });
      const chunks: Buffer[] = [];

      // Capturar output
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      // CABEÇALHO
      doc.fontSize(24).font('Helvetica-Bold').text('ORDEM DE COMPRA', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Sistema VOIMA de Gestão de Compras', { align: 'center' });
      doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke();
      doc.moveDown(10);

      // REGIÃO DE INFORMAÇÕES (4 colunas)
      const infoY = doc.y;
      const colWidth = (555 - 30) / 4;
      const colX = [30, 30 + colWidth, 30 + colWidth * 2, 30 + colWidth * 3];

      // Desenhar caixa de informações
      doc.rect(20, infoY - 5, 555, 65).stroke();
      doc.rect(20, infoY - 5, 555 / 4, 65).stroke();
      doc.rect(20 + 555 / 4, infoY - 5, 555 / 4, 65).stroke();
      doc.rect(20 + (555 / 4) * 2, infoY - 5, 555 / 4, 65).stroke();

      const infoBoxPair = (x: number, label1: string, value1: string, label2: string, value2: string, y: number) => {
        doc.fontSize(8).font('Helvetica-Bold').text(label1, x, y);
        doc.fontSize(11).font('Helvetica').text(value1, x, y + 12);
        doc.fontSize(8).font('Helvetica-Bold').text(label2, x, y + 30);
        doc.fontSize(11).font('Helvetica').text(value2, x, y + 42);
      };

      const dataEmissao = new Date(ocData.data_emissao).toLocaleDateString('pt-BR');
      const dataValidade = new Date(new Date(ocData.data_emissao).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

      infoBoxPair(30, 'Nº da OC', ocData.codigo, 'Nº do Pedido', ocData.pedido_codigo, infoY + 5);
      infoBoxPair(30 + colWidth, 'Data Emissão', dataEmissao, 'Data Validade', dataValidade, infoY + 5);
      infoBoxPair(30 + colWidth * 2, 'Empresa', ocData.empresa_nome || 'VOIMA', 'Obra', ocData.obra_nome || 'Obra', infoY + 5);
      infoBoxPair(30 + colWidth * 3, 'Fornecedor', ocData.fornecedor || 'A Definir', 'Status', 'EMITIDA', infoY + 5);

      doc.moveDown(60);

      // TABELA DE ITENS
      doc.fontSize(10).font('Helvetica-Bold').text('DETALHAMENTO DOS ITENS', { underline: true });
      doc.moveDown(8);

      const table: any = {
        title: '',
        headers: ['Descrição', 'Qtd', 'Un.', 'Preço Un.', 'Total'],
        rows: ocData.itens.map((item) => [
          item.descricao,
          item.quantidade.toFixed(2),
          item.unidade,
          `R$ ${item.preco_unitario.toFixed(2)}`,
          `R$ ${item.preco_total.toFixed(2)}`,
        ]),
      };

      // Desenhar cabeçalho da tabela
      const tableY = doc.y;
      const colWidths = [200, 50, 50, 100, 100];
      const startX = 30;

      // Background do header
      doc.rect(startX, tableY, 555, 20).fill('#003366');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');

      let x = startX + 5;
      table.headers.forEach((header: string, i: number) => {
        doc.text(header, x, tableY + 5, { width: colWidths[i] - 10, align: i > 1 ? 'right' : 'left' });
        x += colWidths[i];
      });

      // Desenhar linhas da tabela
      doc.fillColor('black').font('Helvetica');
      let y = tableY + 22;
      let rowIndex = 0;

      table.rows.forEach((row: string[]) => {
        // Background alternado
        if (rowIndex % 2 === 0) {
          doc.rect(startX, y - 2, 555, 18).fill('#f9f9f9');
          doc.fillColor('black');
        }

        doc.fontSize(8);
        x = startX + 5;
        row.forEach((cell: string, i: number) => {
          doc.text(cell, x, y, { width: colWidths[i] - 10, align: i > 1 ? 'right' : 'left' });
          x += colWidths[i];
        });

        y += 18;
        rowIndex++;
      });

      doc.moveDown(10);

      // TOTALIZADOR
      y = doc.y;
      doc.rect(20, y, 555, 50).stroke('#003366').lineWidth(2);

      doc.fontSize(10).font('Helvetica').fillColor('black');
      doc.text(`Subtotal: R$ ${(ocData.valor_total * 0.95).toFixed(2)}`, 30, y + 5, { width: 250 });
      doc.text(`Total de Itens: ${ocData.itens.length}`, 350, y + 5, { width: 200 });

      // Valor total em destaque
      doc.rect(20, y + 20, 555, 25).fill('#FF6600');
      doc.fontSize(14).font('Helvetica-Bold').fillColor('white');
      doc.text('VALOR TOTAL DA ORDEM', 30, y + 24, { width: 250 });
      doc.text(`R$ ${ocData.valor_total.toFixed(2)}`, 350, y + 24, { width: 200, align: 'right' });

      doc.moveDown(50);

      // OBSERVAÇÕES
      doc.fillColor('black').fontSize(9).font('Helvetica-Bold');
      doc.text('⚠️ IMPORTANTE:', { underline: true });
      doc.fontSize(8).font('Helvetica');
      doc.text('Confirme o recebimento desta OC e informe qualquer dúvida ao representante da empresa.');
      doc.text('Esta OC é válida por 7 dias a partir da data de emissão.');

      doc.moveDown(15);

      // RODAPÉ
      doc.fontSize(8).font('Helvetica');
      doc.text('Condições de Pagamento: Conforme acordado', 30);
      doc.text(`Local de Entrega: ${ocData.obra_nome || 'Obra'}`, 30);
      doc.text('Contato: Equipe VOIMA - Sistema de Gestão de Compras', 30);
      doc.moveTo(30, doc.y).lineTo(575, doc.y).stroke();
      doc.fontSize(7).fillColor('#666');
      doc.text(`Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}.`, 30);
      doc.text('Válido apenas com identificação da empresa.', 30);

      // Finalizar o documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
