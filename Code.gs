// 1. Fonction pour envoyer le numéro actuel à l'application web au démarrage
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "getNumBon") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet(); 
    var numBon = sheet.getRange("F4").getValue();
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "Success",
      "numBon": numBon
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("OK");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ==========================================================
    // NOUVEAU BLOC : Génération du PDF pour le TARIF
    // ==========================================================
    if (data.action === "getTarifPdf") {
      var tarifSheet = ss.getSheetByName("tarif");
      if (!tarifSheet) {
        throw new Error("La feuille 'tarif' est introuvable.");
      }
      var sheetId = tarifSheet.getSheetId();
      
      // Construction de l'URL d'export PDF pour la sélection B2:F39 sur une seule page (scale=4)
      var tarifUrl = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?"
        + "exportFormat=pdf&format=pdf"
        + "&size=A4&portrait=true"
        + "&scale=4&fitw=true&fzr=false"
        + "&gridlines=false&printtitle=false"
        + "&sheetnames=false&pagenum=UNDEFINED"
        + "&horizontal_alignment=CENTER"
        + "&gid=" + sheetId 
        + "&range=B2:F39";

      var token = ScriptApp.getOAuthToken();
      var response = UrlFetchApp.fetch(tarifUrl, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        throw new Error("Export PDF Tarif échoué: " + response.getContentText());
      }

      var tarifPdfBase64 = Utilities.base64Encode(response.getBlob().getBytes());

      return ContentService.createTextOutput(JSON.stringify({
        "status": "Success",
        "base64": tarifPdfBase64,
        "fileName": "Tarif_AMplast.pdf"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    // ==========================================================

    // ==========================================================
    // NOUVEAU BLOC : Récupérer les données du TARIF en JSON
    // ==========================================================
    if (data.action === "getTarifData") {
      var tarifSheet = ss.getSheetByName("tarif");
      if (!tarifSheet) {
        throw new Error("La feuille 'tarif' est introuvable.");
      }
      var values = tarifSheet.getRange("B2:F39").getValues();
      return ContentService.createTextOutput(JSON.stringify({
        "status": "Success",
        "data": values
      })).setMimeType(ContentService.MimeType.JSON);
    }
    // ==========================================================

    // ==========================================================
    // CODE EXISTANT : Génération du PDF pour le BON DE LIVRAISON
    // ==========================================================
    const sheet = ss.getActiveSheet();
    
    // 2. Remplissage des données dans le modèle
    sheet.getRange("F4").setValue(data.numBon);          
    sheet.getRange("F5").setValue(data.dateBon);         
    sheet.getRange("E9").setValue(data.clientNom);       
    sheet.getRange("E10").setValue(data.clientAdresse);  
    
    // Nettoyage de la zone des articles jusqu'à la colonne F
    sheet.getRange("B17:F35").clearContent();
    if (data.items && data.items.length > 0) {
      data.items.forEach(function(item, index) {
        var row = 17 + index;
        if (row <= 35) {
          sheet.getRange(row, 2).setValue(item.desc);      
          sheet.getRange(row, 3).setValue(item.qte);       
          sheet.getRange(row, 4).setValue(item.metrage);   
          sheet.getRange(row, 5).setValue(item.prix);      
          sheet.getRange(row, 6).setValue(item.total);     
        }
      });
    }
    
    // Total général 
    sheet.getRange("F36").setValue(data.totalGeneral);

    // Forcer l'écriture des données pour le PDF
    SpreadsheetApp.flush();

    // 3. Exporter la plage en PDF
    var url = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?"
      + "exportFormat=pdf&format=pdf"
      + "&size=A4&portrait=true"
      + "&scale=4&fitw=true&fzr=false"
      + "&gridlines=false&printtitle=false"
      + "&sheetnames=false&pagenum=UNDEFINED"
      + "&horizontal_alignment=CENTER"
      + "&top_margin=0.00&bottom_margin=0.00"
      + "&left_margin=0.00&right_margin=0.00"
      + "&gid=" + sheet.getSheetId();


    var token_bon = ScriptApp.getOAuthToken();
    var response_bon = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token_bon },
      muteHttpExceptions: true
    });

    if (response_bon.getResponseCode() !== 200) {
      throw new Error("Export PDF échoué: " + response_bon.getContentText());
    }

    // Convertir en Base64
    var pdfBase64 = Utilities.base64Encode(response_bon.getBlob().getBytes());

    // 4. INCYCREMENTER le numéro de bon dans le tableau Google Sheet (ex: 200 devient 201)
    var nextNum = parseInt(data.numBon) + 1;
    sheet.getRange("F4").setValue(nextNum);
    SpreadsheetApp.flush(); // On sauvegarde l'incrémentation

    // 5. Renvoyer la réponse à l'application web avec le nouveau numéro
    return ContentService.createTextOutput(JSON.stringify({
      "status": "Success",
      "base64": pdfBase64,
      "fileName": "Bon_Livraison_" + data.numBon + ".pdf",
      "nextNumBon": nextNum
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "Error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function forceAuth() {
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch("https://www.google.com");
}
