/**
 * Prototype email renderer.
 * No real emails are ever sent — every message is stored in the in-app
 * mailbox and rendered as a preview at /mail.
 */
export function emailShell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;border:1px solid #E5DECC;border-radius:12px;overflow:hidden">
  <div style="background:#1C4634;color:#FBF8F1;padding:18px 24px"><strong style="font-size:18px">Moreton &amp; Grey</strong><div style="font-size:12px;opacity:.8">Moreton Wills Online — Queensland</div></div>
  <div style="padding:22px 24px;font-family:Helvetica,Arial,sans-serif;color:#15211B;font-size:14px;line-height:1.6">
  <h2 style="font-family:Georgia,serif;margin:0 0 12px;font-size:20px;color:#1C4634">${title}</h2>
  ${bodyHtml}
  <p style="margin-top:22px;color:#5C8374;font-size:12px">This is a PROTOTYPE preview. No real email was sent and no addressee is real.</p></div></div>`;
}
