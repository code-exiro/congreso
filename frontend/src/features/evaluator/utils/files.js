// PDF de ejemplo para el visor en modo de prueba (sin backend).

const LOREM =
  'Este es un extenso de ejemplo generado en modo de prueba. El texto solo sirve para revisar que el visor ' +
  'muestre el documento completo, que se pueda desplazar entre paginas y que el formulario de evaluacion ' +
  'quede a un lado mientras se lee el trabajo.';

const clean = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, '');

function wrap(text, width = 88) {
  const lines = [];
  let line = '';
  for (const word of clean(text).split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pageStream({ title, authors, sections, pageNumber }) {
  const ops = ['BT', '72 730 Td'];
  if (title) {
    wrap(title, 52).forEach((l) => ops.push('/F2 16 Tf', `(${l}) Tj`, '0 -22 Td'));
    ops.push('/F1 11 Tf', `(${clean(authors)}) Tj`, '0 -34 Td');
  }
  sections.forEach((s) => {
    ops.push('/F2 12 Tf', `(${clean(s)}) Tj`, '0 -18 Td', '/F1 10 Tf');
    [...wrap(LOREM), ...wrap(LOREM)].forEach((l) => ops.push(`(${l}) Tj`, '0 -14 Td'));
    ops.push('0 -12 Td');
  });
  ops.push('ET', 'BT /F1 9 Tf 300 40 Td', `(${pageNumber}) Tj`, 'ET');
  return ops.join('\n');
}

export function samplePdf({ titulo = 'Extenso de ejemplo', autores = [] } = {}) {
  const pages = [
    { title: titulo, authors: autores.join(', '), sections: ['Resumen', '1. Introduccion', '2. Antecedentes'] },
    { sections: ['3. Metodologia', '4. Resultados', '5. Discusion'] },
    { sections: ['6. Conclusiones', 'Referencias'] },
  ];
  const objs = [];
  const add = (body) => objs.push(body) && objs.length;

  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // Pages, se llena al final
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const kids = pages.map((p, i) => {
    const stream = pageStream({ ...p, pageNumber: i + 1 });
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${content} 0 R ` +
        `/Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`
    );
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = objs.map((o, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
