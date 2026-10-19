import QRCode from "qrcode";

/**
 * Matrice de modules du QR (vrai = module sombre), dessinée ensuite en
 * vectoriel dans le PDF. Niveau de correction M : lisible même imprimé en
 * petit et partiellement abîmé en vitrine.
 */
export const buildQrModules = (text: string): boolean[][] => {
  if (!text) return [];
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const rows: boolean[][] = [];
  for (let y = 0; y < size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x += 1) {
      row.push(Boolean(data[y * size + x]));
    }
    rows.push(row);
  }
  return rows;
};
