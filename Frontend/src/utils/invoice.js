/**
 * #33: Client-side Invoice/Receipt PDF generator using the native browser print API.
 * No external dependencies needed — generates a styled printable HTML page.
 */
import { toINR } from './currency';

export const downloadInvoice = (order) => {
  const date = new Date(order.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">${item.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${toINR(item.price)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${toINR(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const addr = order.address;
  const addrStr = addr
    ? `${addr.firstName || ''} ${addr.lastName || ''}<br>${addr.street || ''}, ${addr.city || ''}<br>${addr.state || ''} - ${addr.zipcode || addr.zipCode || ''}`
    : 'N/A';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QuickBite Invoice #${order._id.slice(-8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-emoji { font-size: 36px; }
    .brand-name { font-size: 24px; font-weight: 800; color: #ea580c; }
    .brand-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #ea580c; }
    .invoice-id { font-size: 13px; color: #555; margin-top: 4px; }
    .invoice-date { font-size: 12px; color: #888; margin-top: 2px; }
    .divider { border: none; border-top: 2px solid #ea580c; margin: 20px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin-bottom: 8px; }
    .section-value { font-size: 14px; color: #333; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #fef3ec; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #ea580c; }
    th:last-child, th:nth-child(3), th:nth-child(2) { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .totals { margin-left: auto; width: 260px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
    .total-final { font-size: 16px; font-weight: 800; color: #1a1a1a; border-top: 2px solid #ea580c; margin-top: 8px; padding-top: 8px; }
    .badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span class="brand-emoji">🍔</span>
      <div>
        <div class="brand-name">QuickBite</div>
        <div class="brand-sub">Fast food, faster delivery</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">TAX INVOICE</div>
      <div class="invoice-id">Order #${order._id.slice(-8).toUpperCase()}</div>
      <div class="invoice-date">${date}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="grid">
    <div>
      <div class="section-title">Deliver To</div>
      <div class="section-value">${addrStr}</div>
      ${addr?.phone ? `<div class="section-value" style="margin-top:4px;">📞 ${addr.phone}</div>` : ''}
    </div>
    <div>
      <div class="section-title">Payment Status</div>
      <div class="section-value">
        <span class="badge">${order.payment ? '✓ Paid' : 'Pending'}</span>
      </div>
      <div class="section-title" style="margin-top:12px;">Order Status</div>
      <div class="section-value">${order.status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${toINR(order.amount - 5)}</span></div>
    <div class="total-row"><span>Delivery Fee</span><span>${toINR(5)}</span></div>
    <div class="total-row total-final"><span>Total Paid</span><span>${toINR(order.amount)}</span></div>
  </div>

  <div class="footer">
    Thank you for ordering with QuickBite! 🎉<br>
    This is a computer-generated invoice. No signature required.
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
};
