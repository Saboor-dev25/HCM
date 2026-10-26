const ascii = value => String(value ?? "—")
  .normalize("NFKD")
  .replace(/[^\x20-\x7E]/g, "")
  .replace(/[\\()]/g, "\\$&");

const money = value => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function renderPayslipPdf({ companyName, employee, period, row }) {
  const commands = [];
  const text = (value, x, y, size = 11, font = "F1", color = "0.16 0.19 0.26") => {
    commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET`);
  };
  const rect = (x, y, width, height, color) => {
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  };
  const line = (x, y, width, color = "0.88 0.89 0.92") => {
    commands.push(`${color} RG 0.7 w ${x} ${y} m ${x + width} ${y} l S`);
  };

  rect(0, 742, 612, 100, "0.13 0.16 0.23");
  rect(42, 777, 34, 34, "0.55 0.43 0.88");
  text("H", 54, 787, 18, "F2", "1 1 1");
  text(companyName || "HCM Lite", 88, 795, 16, "F2", "1 1 1");
  text("PAYSLIP", 430, 800, 9, "F2", "0.78 0.80 0.86");
  text(period, 430, 781, 13, "F2", "1 1 1");

  text("EMPLOYEE", 42, 710, 8, "F2", "0.42 0.45 0.52");
  text(employee?.name || row.name || "Employee", 42, 690, 15, "F2");
  text(employee?.email || "Confidential employee statement", 42, 672, 9, "F1", "0.42 0.45 0.52");
  text("PAY PERIOD", 410, 710, 8, "F2", "0.42 0.45 0.52");
  text(period, 410, 690, 12, "F2");

  rect(42, 586, 528, 57, "0.94 0.93 0.98");
  text("NET PAY", 58, 620, 8, "F2", "0.42 0.37 0.57");
  text(money(row.net), 58, 598, 19, "F2", "0.31 0.24 0.55");
  text("Finalized", 468, 608, 9, "F2", "0.23 0.52 0.40");

  text("EARNINGS", 42, 552, 9, "F2", "0.37 0.39 0.45");
  text("AMOUNT", 450, 552, 8, "F2", "0.42 0.45 0.52");
  line(42, 540, 528);
  const earnings = [
    ["Basic salary", row.basic],
    ["House rent allowance", row.hra],
    ["Medical allowance", row.medical],
    ["Gross earnings", row.gross],
  ];
  let y = 518;
  for (const [label, amount] of earnings) {
    text(label, 42, y, 10, label === "Gross earnings" ? "F2" : "F1");
    text(money(amount), 450, y, 10, label === "Gross earnings" ? "F2" : "F1");
    line(42, y - 10, 528);
    y -= 30;
  }

  y -= 5;
  text("DEDUCTIONS", 42, y, 9, "F2", "0.37 0.39 0.45");
  text("AMOUNT", 450, y, 8, "F2", "0.42 0.45 0.52");
  line(42, y - 12, 528);
  y -= 34;
  const deductions = [
    [`Attendance deduction · ${row.absenceDays ?? 0} absent, ${row.halfDays ?? 0} half days`, row.deduction],
    ["Income tax", row.tax],
  ];
  for (const [label, amount] of deductions) {
    text(label, 42, y, 10);
    text(money(amount), 450, y, 10);
    line(42, y - 10, 528);
    y -= 30;
  }

  rect(42, 80, 528, 1, "0.87 0.88 0.91");
  text("This payslip was generated electronically by HCM Lite.", 42, 62, 8, "F1", "0.48 0.50 0.56");
  text("CONFIDENTIAL", 477, 62, 8, "F2", "0.48 0.50 0.56");

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n% HCM Lite payslip\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}
