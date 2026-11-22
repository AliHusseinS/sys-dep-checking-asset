const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const pStart = html.indexOf('function openPdfPrintWindow');
const marker = '<!-- ترويسة الصفحة مع رقم المحضر وترقيم الصفحات -->';
const mIdx = html.indexOf(marker, pStart);

if (mIdx !== -1) {
  const oldHeaderBlock = html.substring(mIdx, html.indexOf('</div>\n            </div>', mIdx) !== -1 ? html.indexOf('</div>\n            </div>', mIdx) + 21 : html.indexOf('</div>\r\n            </div>', mIdx) + 22);
  
  const targetStr = html.substring(mIdx, mIdx + 360);
  // Find the closing of this header div
  const endDiv = html.indexOf('<!-- العبارة الإلزامية', mIdx);
  if (endDiv !== -1) {
    const newHeaderBlock = `<!-- ترويسة الصفحة مع رقم المحضر وترقيم الصفحات -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:2px solid #0284c7;padding-bottom:6px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="\${window.UOK_LOGO || 'logo.png'}" style="width:42px;height:42px;object-fit:contain;border-radius:50%;border:1px solid #cbd5e1;padding:1px;background:#fff;" alt="شعار الكلية">
                <div>
                  <div style="font-size:11px;font-weight:800;color:#0f172a;">جامعة الكوفة - كلية التخطيط العمراني</div>
                  <div>
                    <span style="font-size:12px;font-weight:800;color:#0f172a;">رقم المحضر : </span>
                    <span style="font-size:12.5px;font-weight:800;color:#0369a1;font-family:monospace;">\${generatedId}</span>
                  </div>
                </div>
              </div>
              <div style="font-size:11px;font-weight:700;color:#64748b;">
                صفحة \${pageNum} من \${totalPages}
              </div>
            </div>\n\n            `;
    
    html = html.substring(0, mIdx) + newHeaderBlock + html.substring(endDiv);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('✅ Added logo to openPdfPrintWindow header');
  }
}
