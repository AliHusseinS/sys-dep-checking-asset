/**
 * Google Apps Script - منظومة تدقيق رصانة البحوث العلمية
 * جامعة الكوفة - كلية التخطيط العمراني
 * 
 * هذا السكربت مرتبط بجدول البيانات:
 * https://docs.google.com/spreadsheets/d/1O0DW0SLDjbf2TRlvxez6u5pkezi9fbctgH9QPLwC1qw/edit?usp=sharing
 * 
 * وظائف السكربت:
 * 1. تسجيل التدريسيين برقم الهاتف والاسم لعدم الحاجة لإعادة كتابة الاسم لاحقاً.
 * 2. استقبال وحفظ طلبات فحص الرصانة بحسب الأقسام الثلاثة (الحضري، البيئي، الإقليمي).
 * 3. حفظ تفاصيل البحوث الإحدى عشرة مدخلاً بشكل مفصل في سجل البحوث.
 * 4. تحديث حالة الطلبات (يتم مراجعة الطلب -> تم قبول الطلب) مع بيانات الأمر الإداري.
 * 5. تزويد واجهة الويب بالبيانات عند استعلام المخولين أو التدريسيين.
 */

// معرف جدول البيانات الافتراضي
const SPREADSHEET_ID = "1O0DW0SLDjbf2TRlvxez6u5pkezi9fbctgH9QPLwC1qw";

// الحصول على جدول البيانات سواء كان السكربت مربوطاً مباشرة أو مستقلاً
function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * تهيئة الشيتات بالترويسات المناسبة في حال عدم وجودها
 */
function initSheets() {
  const ss = getSpreadsheet();
  
  // 1. شيت سجل التدريسيين
  let facultySheet = ss.getSheetByName("سجل_التدريسيين");
  if (!facultySheet) {
    facultySheet = ss.insertSheet("سجل_التدريسيين");
    facultySheet.appendRow([
      "رقم الهاتف",
      "اسم التدريسي",
      "تاريخ التسجيل",
      "آخر تسجيل دخول",
      "عدد الطلبات المقدمة"
    ]);
    facultySheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    facultySheet.setRightToLeft(true);
  }

  // 2. شيت طلبات الرصانة
  let requestsSheet = ss.getSheetByName("طلبات_الرصانة");
  if (!requestsSheet) {
    requestsSheet = ss.insertSheet("طلبات_الرصانة");
    requestsSheet.appendRow([
      "معرف الطلب (Request ID)",
      "تاريخ التقديم",
      "رقم الهاتف",
      "اسم التدريسي",
      "القسم العلمي",
      "عدد البحوث",
      "حالة الطلب",
      "رقم الأمر الإداري",
      "تاريخ الأمر الإداري",
      "اللقب العلمي المطلوب",
      "تاريخ اعتماد المحضر",
      "بيانات البحوث (JSON)"
    ]);
    requestsSheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");
    requestsSheet.setRightToLeft(true);
  }

  // 3. شيت تفاصيل البحوث
  let detailsSheet = ss.getSheetByName("تفاصيل_البحوث");
  if (!detailsSheet) {
    detailsSheet = ss.insertSheet("تفاصيل_البحوث");
    detailsSheet.appendRow([
      "معرف الطلب",
      "القسم",
      "اسم التدريسي",
      "ت",
      "عنوان البحث",
      "اسم المجلة",
      "الجهة الناشرة",
      "الدولة",
      "المجلد / العدد",
      "ISSN",
      "نوع البحث",
      "CiteScore",
      "رابط البحث",
      "نوع المجلة",
      "تاريخ النشر",
      "حالة البحث"
    ]);
    detailsSheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#334155").setFontColor("#ffffff");
    detailsSheet.setRightToLeft(true);
  }
}

/**
 * معالجة طلبات GET
 */
function doGet(e) {
  try {
    initSheets();
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || "ping";

    if (action === "ping") {
      return respondJSON({
        status: "online",
        message: "منظومة فحص الرصانة - Google Apps Script Backend متصل وجاهز للعمل.",
        timestamp: new Date().toISOString()
      });
    }

    // فحص رقم الهاتف للتدريسي
    if (action === "check_phone") {
      const phone = (params.phone || "").trim();
      const result = checkFacultyPhone(phone);
      return respondJSON(result);
    }

    // جلب طلبات قسم محدد (خاص بمخولي الأقسام)
    if (action === "get_department_requests") {
      const department = (params.department || "").trim();
      const requests = getRequestsByDepartment(department);
      return respondJSON({ success: true, requests: requests });
    }

    // جلب طلبات تدريسي برقم الهاتف
    if (action === "get_faculty_requests") {
      const phone = (params.phone || "").trim();
      const requests = getRequestsByPhone(phone);
      return respondJSON({ success: true, requests: requests });
    }

    // جلب كافة الطلبات (سجل عام)
    if (action === "get_all_requests") {
      const requests = getAllRequests();
      return respondJSON({ success: true, requests: requests });
    }

    return respondJSON({ success: false, message: "إجراء غير معروف في GET" });

  } catch (error) {
    return respondJSON({ success: false, message: "خطأ في معالجة طلب GET: " + error.toString() });
  }
}

/**
 * معالجة طلبات POST
 */
function doPost(e) {
  try {
    initSheets();
    let payload;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }

    const action = payload.action || "";

    // 1. تسجيل أو تحديث بيانات التدريسي
    if (action === "register_faculty") {
      const res = saveFaculty(payload.phone, payload.name);
      return respondJSON(res);
    }

    // 2. إرسال طلب فحص رصانة جديد
    if (action === "submit_request") {
      const res = submitResearchRequest(payload);
      return respondJSON(res);
    }

    // 3. قبول الطلب واعتماد الأمر الإداري
    if (action === "approve_request") {
      const res = approveResearchRequest(payload);
      return respondJSON(res);
    }

    return respondJSON({ success: false, message: "إجراء غير معروف في POST" });

  } catch (error) {
    return respondJSON({ success: false, message: "خطأ في معالجة طلب POST: " + error.toString() });
  }
}

/**
 * التحقق من وجود رقم هاتف التدريسي في الشيت
 */
function checkFacultyPhone(phone) {
  if (!phone) return { success: false, registered: false };
  const cleanPhone = phone.toString().replace(/[\s\-\+]/g, '');

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("سجل_التدريسيين");
  if (!sheet) return { success: true, registered: false };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowPhone = data[i][0].toString().replace(/[\s\-\+]/g, '');
    if (rowPhone === cleanPhone || rowPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rowPhone)) {
      // تحديث آخر تسجيل دخول
      sheet.getRange(i + 1, 4).setValue(new Date().toLocaleString("ar-IQ"));
      return {
        success: true,
        registered: true,
        name: data[i][1],
        phone: data[i][0]
      };
    }
  }
  return { success: true, registered: false };
}

/**
 * حفظ أو تحديث تدريسي جديد
 */
function saveFaculty(phone, name) {
  if (!phone || !name) {
    return { success: false, message: "يرجى توفير رقم الهاتف والاسم" };
  }
  const cleanPhone = phone.toString().trim();
  const facultyName = name.toString().trim();

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("سجل_التدريسيين");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowPhone = data[i][0].toString().trim();
    if (rowPhone === cleanPhone) {
      sheet.getRange(i + 1, 2).setValue(facultyName);
      sheet.getRange(i + 1, 4).setValue(new Date().toLocaleString("ar-IQ"));
      return { success: true, message: "تم تحديث بيانات التدريسي بنجاح", name: facultyName, phone: cleanPhone };
    }
  }

  // إضافة سطر جديد
  sheet.appendRow([
    cleanPhone,
    facultyName,
    new Date().toLocaleString("ar-IQ"),
    new Date().toLocaleString("ar-IQ"),
    0
  ]);

  return { success: true, message: "تم تسجيل التدريسي وحفظه في Google Sheet بنجاح", name: facultyName, phone: cleanPhone };
}

/**
 * حفظ طلب فحص الرصانة مع تفاصيل البحوث
 */
function submitResearchRequest(payload) {
  const ss = getSpreadsheet();
  const reqSheet = ss.getSheetByName("طلبات_الرصانة");
  const detSheet = ss.getSheetByName("تفاصيل_البحوث");
  const facSheet = ss.getSheetByName("سجل_التدريسيين");

  const requestId = payload.requestId || ("REQ-" + Date.now());
  const nowStr = new Date().toLocaleString("ar-IQ");
  const phone = (payload.phone || "").toString().trim();
  const name = (payload.name || "").toString().trim();
  const department = (payload.department || "").toString().trim();
  const researches = Array.isArray(payload.researches) ? payload.researches : [];
  const count = researches.length;
  const status = "يتم مراجعة الطلب"; // باللون البرتقالي
  const jsonStr = JSON.stringify(researches);

  // التأكد من تسجيل التدريسي
  saveFaculty(phone, name);

  // إضافة للطلبات
  reqSheet.appendRow([
    requestId,
    nowStr,
    phone,
    name,
    department,
    count,
    status,
    "", // رقم الأمر الإداري
    "", // تاريخ الأمر الإداري
    "", // اللقب العلمي
    "", // تاريخ الاعتماد
    jsonStr
  ]);

  // إضافة للسطور التفصيلية في تفاصيل_البحوث
  researches.forEach((r, idx) => {
    detSheet.appendRow([
      requestId,
      department,
      name,
      idx + 1,
      r.title || r.research_title || "",
      r.journal || r.journal_name || "",
      r.publisher || "",
      r.country || "",
      r.volume_issue || "",
      r.issn || "",
      r.research_type || "",
      r.citescore || "",
      r.research_url || "",
      r.journal_type || "",
      r.pub_date || "",
      status
    ]);
  });

  // تحديث عدد الطلبات للتدريسي
  try {
    const facData = facSheet.getDataRange().getValues();
    for (let i = 1; i < facData.length; i++) {
      if (facData[i][0].toString().trim() === phone) {
        const curCount = parseInt(facData[i][4] || 0) + 1;
        facSheet.getRange(i + 1, 5).setValue(curCount);
        break;
      }
    }
  } catch (e) {}

  return {
    success: true,
    message: "تم حفظ الطلب وتخزينه في Google Sheet بنجاح وحالته: يتم مراجعة الطلب",
    requestId: requestId,
    status: status
  };
}

/**
 * قبول الطلب وتدوين الأمر الإداري واللقب العلمي
 */
function approveResearchRequest(payload) {
  const ss = getSpreadsheet();
  const reqSheet = ss.getSheetByName("طلبات_الرصانة");
  const detSheet = ss.getSheetByName("تفاصيل_البحوث");

  const requestId = (payload.requestId || "").toString().trim();
  const adminOrderNo = (payload.adminOrderNo || "").toString().trim();
  const adminOrderDate = (payload.adminOrderDate || "").toString().trim();
  const targetRank = (payload.targetRank || "").toString().trim();
  const nowStr = new Date().toLocaleString("ar-IQ");
  const newStatus = "تم قبول الطلب";

  let found = false;
  const reqData = reqSheet.getDataRange().getValues();
  for (let i = 1; i < reqData.length; i++) {
    if (reqData[i][0].toString().trim() === requestId) {
      reqSheet.getRange(i + 1, 7).setValue(newStatus); // حالة الطلب
      reqSheet.getRange(i + 1, 8).setValue(adminOrderNo); // رقم الأمر
      reqSheet.getRange(i + 1, 9).setValue(adminOrderDate); // تاريخ الأمر
      reqSheet.getRange(i + 1, 10).setValue(targetRank); // اللقب العلمي
      reqSheet.getRange(i + 1, 11).setValue(nowStr); // تاريخ الاعتماد
      found = true;
      break;
    }
  }

  // تحديث تفاصيل البحوث
  if (found) {
    const detData = detSheet.getDataRange().getValues();
    for (let j = 1; j < detData.length; j++) {
      if (detData[j][0].toString().trim() === requestId) {
        detSheet.getRange(j + 1, 16).setValue(newStatus);
      }
    }
  }

  if (found) {
    return {
      success: true,
      message: "تم قبول الطلب واعتماد الأمر الإداري بنجاح",
      requestId: requestId,
      status: newStatus,
      adminOrderNo: adminOrderNo,
      adminOrderDate: adminOrderDate,
      targetRank: targetRank
    };
  } else {
    return { success: false, message: "لم يتم العثور على الطلب بالمعرف المحدد: " + requestId };
  }
}

/**
 * جلب الطلبات لقسم معين
 */
function getRequestsByDepartment(dept) {
  const ss = getSpreadsheet();
  const reqSheet = ss.getSheetByName("طلبات_الرصانة");
  if (!reqSheet) return [];

  const data = reqSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const rowDept = data[i][4].toString().trim();
    if (!dept || rowDept.includes(dept) || dept.includes(rowDept)) {
      results.push(formatRequestRow(data[i]));
    }
  }
  return results.reverse(); // الأحدث أولاً
}

/**
 * جلب الطلبات لتدريسي معين عبر الهاتف
 */
function getRequestsByPhone(phone) {
  const ss = getSpreadsheet();
  const reqSheet = ss.getSheetByName("طلبات_الرصانة");
  if (!reqSheet) return [];

  const cleanPhone = (phone || "").toString().replace(/[\s\-\+]/g, '');
  const data = reqSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const rowPhone = data[i][2].toString().replace(/[\s\-\+]/g, '');
    if (rowPhone === cleanPhone || rowPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rowPhone)) {
      results.push(formatRequestRow(data[i]));
    }
  }
  return results.reverse();
}

/**
 * جلب كافة الطلبات
 */
function getAllRequests() {
  const ss = getSpreadsheet();
  const reqSheet = ss.getSheetByName("طلبات_الرصانة");
  if (!reqSheet) return [];

  const data = reqSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    results.push(formatRequestRow(data[i]));
  }
  return results.reverse();
}

function formatRequestRow(row) {
  let researches = [];
  try {
    if (row[11]) researches = JSON.parse(row[11]);
  } catch (e) {}

  return {
    requestId: row[0],
    createdAt: row[1],
    phone: row[2],
    facultyName: row[3],
    department: row[4],
    researchCount: row[5],
    status: row[6],
    adminOrderNo: row[7],
    adminOrderDate: row[8],
    targetRank: row[9],
    approvedAt: row[10],
    researches: researches
  };
}

/**
 * دالة مساعدة لإرجاع استجابة JSON مع رؤوس CORS
 */
function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
