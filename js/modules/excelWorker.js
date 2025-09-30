// excelWorker.js
self.importScripts("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");

self.onmessage = function (e) {
  const { fileData, isCSV } = e.data;
  let jsonData = [];

  try {
    if (isCSV) {
      const workbook = XLSX.read(fileData, { 
        type: "string", 
        raw: false, 
        codepage: 65001, 
        FS: ";" 
      });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    } else {
      const workbook = XLSX.read(fileData, { type: "array", codepage: 65001 });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    }

    // Fix acentos
    jsonData = jsonData.map(row => {
      const fixedRow = {};
      for (const key in row) {
        if (typeof row[key] === "string") {
          fixedRow[key] = row[key]
            .normalize("NFC")
            .replace(/Ã¡/g, "á")
            .replace(/Ã©/g, "é")
            .replace(/Ã­/g, "í")
            .replace(/Ã³/g, "ó")
            .replace(/Ãº/g, "ú")
            .replace(/Ã±/g, "ñ")
            .replace(/Ã/g, "Á")
            .replace(/Ã‰/g, "É")
            .replace(/Ã/g, "Í")
            .replace(/Ã“/g, "Ó")
            .replace(/Ãš/g, "Ú")
            .replace(/Ã‘/g, "Ñ");
        } else {
          fixedRow[key] = row[key];
        }
      }
      return fixedRow;
    });

    self.postMessage({ success: true, data: jsonData });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
