let invoiceNumber = localStorage.getItem("lastInvoice") || 1;

// Ajouter service depuis formulaire
function addService(event) {
  event.preventDefault();

  let desc = document.getElementById("desc").value;
  let qty = parseFloat(document.getElementById("qty").value) || 0;
  let price = parseFloat(document.getElementById("price").value) || 0;
  let total = qty * price;

  const tbody = document.getElementById("serviceBody");
  let row = document.createElement("tr");

  row.innerHTML = `
    <td>${desc}</td>
    <td>${qty}</td>
    <td>${price.toFixed(2)}</td>
    <td>${total.toFixed(2)}</td>
    <td><button onclick="this.parentElement.parentElement.remove()">❌</button></td>
  `;

  tbody.appendChild(row);

  document.getElementById("serviceForm").reset();
  document.getElementById("qty").value = 1;
  document.getElementById("price").value = 0;
}

// Génération PDF
async function generateInvoice() {
  const { jsPDF } = window.jspdf;
  let client = document.getElementById("clientName").value;
  let date = document.getElementById("invoiceDate").value;
  let rows = document.querySelectorAll("#serviceBody tr");

  if (!client || !date || rows.length === 0) {
    alert("Veuillez remplir tous les champs et ajouter au moins un service ✍️");
    return;
  }

  let doc = new jsPDF();

  // Charger logo
  let logoBase64 = await toBase64("img/logo.png");
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 160, 10, 30, 30);
  }

  // Infos facture
  doc.setFontSize(16);
  doc.text("Facture de service", 20, 20);

  let invCode = "INV-" + String(invoiceNumber).padStart(3, "0");
  doc.setFontSize(12);
  doc.text(`Facture N° : ${invCode}`, 20, 35);
  doc.text(`Client : ${client}`, 20, 45);
  doc.text(`Date : ${date}`, 180, 35, { align: "right" });

  // Préparer tableau
  let data = [];
  let totalAmount = 0;
  let counter = 1;

  rows.forEach(row => {
    let desc = row.cells[0].innerText;
    let qty = parseFloat(row.cells[1].innerText);
    let price = parseFloat(row.cells[2].innerText);
    let total = parseFloat(row.cells[3].innerText);
    totalAmount += total;

    data.push([counter, desc, qty, price.toFixed(2), total.toFixed(2)]);
    counter++;
  });

  // AutoTable
  doc.autoTable({
    startY: 60,
    head: [["N°", "Description", "Quantité", "Prix (DZD)", "Total"]],
    body: data,
    theme: "grid",
  });

  // Total général
  let finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`Total général : ${totalAmount.toFixed(2)} DZD`, 20, finalY);

  // Total en lettres
  doc.setFontSize(12);
  doc.text(`(${numberToWords(totalAmount)} dinars algériens)`, 20, finalY + 10);

  // Phrase explicative
  doc.setFontSize(9);
  doc.text(
    "Devis estimatif et quantitatif – Ce document est une estimation et n’a pas valeur contractuelle.",
    20,
    290
  );

  doc.save(`${invCode}.pdf`);

  invoiceNumber++;
  localStorage.setItem("lastInvoice", invoiceNumber);
}

// Convertir image en Base64
function toBase64(url) {
  return fetch(url)
    .then(res => res.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);
}

// Conversion nombre → texte (jusqu'aux millions)
function numberToWords(n) {
  if (n === 0) return "zéro";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function under100(n) {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    let t = Math.floor(n / 10), u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + "-" + teens[u];
    } else if (t === 8 && u === 0) {
      return "quatre-vingts";
    }
    return tens[t] + (u ? "-" + units[u] : "");
  }

  function under1000(n) {
    if (n < 100) return under100(n);
    let c = Math.floor(n / 100), rest = n % 100;
    let cent = (c > 1 ? units[c] + " " : "") + "cent" + (c > 1 && rest === 0 ? "s" : "");
    return cent + (rest ? " " + under100(rest) : "");
  }

  function underMillion(n) {
    if (n < 1000) return under1000(n);
    let k = Math.floor(n / 1000), rest = n % 1000;
    let mille = (k > 1 ? under1000(k) + " " : "") + "mille";
    return mille + (rest ? " " + under1000(rest) : "");
  }

  if (n < 1000000) return underMillion(n);

  let m = Math.floor(n / 1000000), rest = n % 1000000;
  let million = (m > 1 ? numberToWords(m) + " millions" : "un million");
  return million + (rest ? " " + underMillion(rest) : "");
}
