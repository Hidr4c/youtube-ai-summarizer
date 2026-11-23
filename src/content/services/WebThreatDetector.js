const EXEC_DOWNLOAD_RE = /\.(?:exe|msi|bat|cmd|ps1|vbs|scr|apk|dmg|pkg|iso)(?:$|\?|#)/i;
const PROMPT_INJECTION_RE = /(?:ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|system\s+prompt|you\s+are\s+now|force\s+score\s*100|oublie\s+les\s+instructions)/i;
const CLICKFIX_CMD_RE = /(?:powershell|mshta|cmd\.exe|wscript|cscript|curl\s+http|bash\s+-c|win\s*\+\s*r)/i;
const OPEN_REDIRECT_PARAM_RE = /[?&](?:redirect|next|url|return|goto|dest|continue)=(https?:%2f%2f|https?:\/\/)([^&\s]+)/i;
const BRAND_HOSTS = ['paypal', 'amazon', 'apple', 'microsoft', 'google', 'impots', 'ameli', 'caf', 'laposte', 'chronopost', 'dhl', 'fedex', 'ups', 'netflix', 'facebook', 'instagram', 'binance', 'coinbase', 'ledger', 'metamask', 'credit-agricole', 'bnpparibas', 'societegenerale', 'boursorama', 'banquepostale'];

/**
 * Technical web threat & anti-phishing detector (URL spoofing, visual typosquatting,
 * credential/card/crypto forms, deceptive/data:text/html links, ClickFix, hidden iframes,
 * BitB OAuth, and hidden Indirect Prompt Injection).
 */
export class WebThreatDetector {
  static normalizeHomoglyphAscii(hostLabel = '') {
    return String(hostLabel || '').toLowerCase()
      .replace(/rn/g, 'm')
      .replace(/vv/g, 'w')
      .replace(/0/g, 'o')
      .replace(/1/g, 'l')
      .replace(/5/g, 's')
      .replace(/3/g, 'e');
  }

  static inspectUrl(parsed, doc) {
    const warnings = [];
    const hostname = (parsed.hostname || '').toLowerCase();
    const protocol = (parsed.protocol || '').toLowerCase();
    const labels = hostname.split('.').filter(Boolean);
    const registrable = labels.slice(-2).join('.');
    const subdomainPart = labels.slice(0, -2).join('.');

    if (protocol === 'http:') warnings.push('Unencrypted HTTP connection (no HTTPS)');
    if (labels.some((l) => l.startsWith('xn--'))) warnings.push('Punycode / IDN domain detected (possible homograph spoofing)');
    if (parsed.username || parsed.password) warnings.push('URL contains embedded credentials (@ trick)');
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[')) warnings.push('Raw IP address used instead of registered domain name');
    if (parsed.port && !['80', '443'].includes(parsed.port)) warnings.push(`Non-standard port (${parsed.port}) in public URL`);
    if (labels.length > 4) warnings.push(`Deep subdomain nesting (${labels.length} labels)`);

    for (const brand of BRAND_HOSTS) {
      if (subdomainPart.includes(brand) && !registrable.includes(brand)) {
        warnings.push(`Brand "${brand}" appears in subdomain while root domain is "${registrable}"`);
        break;
      }
      const rootName = labels.length >= 2 ? labels[labels.length - 2] : hostname;
      const deconfused = WebThreatDetector.normalizeHomoglyphAscii(rootName);
      const cleanBrand = brand.replace(/[^a-z0-9]/g, '');
      if (rootName !== brand && deconfused === cleanBrand) {
        warnings.push(`Visual typosquatting suspected: "${rootName}" mimics "${brand}"`);
        break;
      }
      if (rootName !== brand && rootName.includes(brand)) {
        warnings.push(`Lookalike domain "${registrable}" mimics brand "${brand}"`);
        break;
      }
    }

    const claimedBrand = WebThreatDetector.extractClaimedBrand(doc);
    if (claimedBrand) {
      const normalizedClaim = claimedBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedHost = registrable.replace(/[^a-z0-9]/g, '');
      const normalizedFullHost = hostname.replace(/[^a-z0-9]/g, '');
      for (const brand of BRAND_HOSTS) {
        const cleanBrand = brand.replace(/[^a-z0-9]/g, '');
        if (normalizedClaim.includes(cleanBrand) && !normalizedHost.includes(cleanBrand) && !normalizedFullHost.includes(cleanBrand)) {
          warnings.push(`Page claims brand "${claimedBrand}" but domain is "${hostname}"`);
          break;
        }
      }
    }

    warnings.push(...WebThreatDetector.inspectForms(doc, hostname, protocol));
    warnings.push(...WebThreatDetector.inspectDomThreats(doc, hostname, registrable));
    const riskLevel = warnings.length >= 2 ? 'high' : (warnings.length === 1 ? 'medium' : 'low');
    return { url: parsed.href, origin: parsed.origin, hostname, registrableDomain: registrable, protocol, claimedBrand, warnings, riskLevel };
  }

  static extractClaimedBrand(doc) {
    if (!doc?.querySelector) return '';
    const ogSite = (doc.querySelector('meta[property="og:site_name"]')?.getAttribute?.('content') || '').trim();
    const logoAlt = (doc.querySelector('header img[alt], img[class*="logo" i][alt], a[class*="logo" i] img[alt]')?.getAttribute?.('alt') || '').trim();
    const siteIdentity = [ogSite, logoAlt].filter(Boolean).join(' | ');
    if (siteIdentity) return siteIdentity.slice(0, 120);
    const h1 = (doc.querySelector('h1')?.textContent || '').trim();
    const title = (doc.title || '').trim();
    return [h1, title].filter(Boolean).join(' | ').slice(0, 120);
  }

  static inspectForms(doc, hostname, protocol) {
    const issues = [];
    if (!doc?.querySelectorAll) return issues;
    for (const form of Array.from(doc.querySelectorAll('form') || [])) {
      const hasPassword = Boolean(form.querySelector?.('input[type="password"]'));
      const hasCard = Boolean(form.querySelector?.('input[autocomplete^="cc-"], input[name*="card" i], input[name*="cvv" i], input[name*="iban" i], input[id*="card" i]'));
      const hasSeed = Boolean(form.querySelector?.('input[name*="seed" i], input[name*="mnemonic" i], input[name*="private" i], textarea[name*="seed" i], textarea[name*="mnemonic" i]'));
      if (hasCard) issues.push('Page requests payment / bank card details (verify domain legitimacy before entering any data)');
      if (hasSeed) issues.push('Page requests crypto wallet seed phrase / private key (extreme phishing risk)');
      if ((hasPassword || hasCard || hasSeed) && protocol === 'http:') issues.push('Sensitive password/payment form served over unencrypted HTTP');
      const action = form.getAttribute?.('action') || '';
      if (/^(?:data:|javascript:)/i.test(action)) {
        issues.push(`Form uses dangerous action scheme (${action.slice(0, 20)})`);
      } else if (action && /^https?:\/\//i.test(action)) {
        try {
          const actionHost = new URL(action).hostname.toLowerCase();
          if (actionHost && actionHost !== hostname && !actionHost.endsWith(`.${hostname}`)) {
            issues.push(`Form submits data to external domain "${actionHost}"`);
          }
        } catch (_) {}
      }
    }
    return issues;
  }

  static inspectDomThreats(doc, hostname, registrable = '') {
    const threats = [];
    if (!doc?.querySelectorAll) return threats;

    let hasExec = false;
    let hasDeceptive = false;
    let hasDataHtml = false;
    let hasOpenRedirect = false;

    for (const a of Array.from(doc.querySelectorAll('a[href]') || [])) {
      const href = String(a.getAttribute?.('href') || '').trim();
      const text = String(a.textContent || '').trim();
      if (!hasDataHtml && /^data:text\/html/i.test(href)) {
        hasDataHtml = true;
        threats.push('Link embeds an HTML document via data:text/html (serverless phishing technique)');
      }
      if (!hasExec && EXEC_DOWNLOAD_RE.test(href)) {
        hasExec = true;
        threats.push(`Link points to executable/installer download (${href.split('/').pop()?.slice(0, 40)})`);
      }
      const redir = OPEN_REDIRECT_PARAM_RE.exec(href);
      if (!hasOpenRedirect && redir) {
        const target = decodeURIComponent(redir[2]).split('/')[0].toLowerCase();
        if (target && target !== hostname && !target.endsWith(`.${hostname}`)) {
          hasOpenRedirect = true;
          threats.push(`Open-redirect parameter points to external host "${target}"`);
        }
      }
      const textUrl = /^https?:\/\/([a-z0-9.-]+)/i.exec(text);
      if (!hasDeceptive && textUrl && /^https?:\/\//i.test(href)) {
        try {
          const hrefHost = new URL(href).hostname.toLowerCase();
          if (hrefHost && !hrefHost.includes(textUrl[1].toLowerCase())) {
            hasDeceptive = true;
            threats.push(`Deceptive link: displays "${textUrl[1]}" but links to "${hrefHost}"`);
          }
        } catch (_) {}
      }
    }

    const baseRoot = registrable || hostname.split('.').slice(-2).join('.');
    for (const ifr of Array.from(doc.querySelectorAll('iframe') || [])) {
      const src = String(ifr.getAttribute?.('src') || '').trim();
      if (!src || /^(?:about:blank|javascript:|data:)/i.test(src)) continue;
      let isThirdParty = false;
      try {
        const ifrHost = new URL(src, `https://${hostname}`).hostname.toLowerCase();
        const ifrRoot = ifrHost.split('.').slice(-2).join('.');
        if (ifrRoot && ifrRoot !== baseRoot) isThirdParty = true;
      } catch (_) {}
      if (!isThirdParty) continue;
      const w = parseInt(ifr.getAttribute?.('width') || '100', 10);
      const h = parseInt(ifr.getAttribute?.('height') || '100', 10);
      const st = ifr.style || {};
      if (w <= 2 || h <= 2 || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') {
        threats.push('Hidden or zero-size iframe detected (possible clickjacking or silent tracker)');
        break;
      }
    }

    const refresh = doc.querySelector?.('meta[http-equiv="refresh" i]')?.getAttribute?.('content') || '';
    const refreshUrl = /url\s*=\s*['"]?(https?:\/\/[^'">\s]+)/i.exec(refresh);
    if (refreshUrl) {
      try {
        const targetHost = new URL(refreshUrl[1]).hostname.toLowerCase();
        if (targetHost && targetHost !== hostname) threats.push(`Meta-refresh redirects automatically to external domain "${targetHost}"`);
      } catch (_) {}
    }

    // ClickFix / clipboard hijacking + Indirect Prompt Injection in hidden elements
    const bodyText = String(doc.body?.innerText || doc.body?.textContent || '');
    const hasClipboardCopy = Boolean(doc.querySelector?.('[oncopy]') || /clipboard\.writeText/i.test(bodyText));
    const hasRunDialogBait = /(?:win\s*\+\s*r|windows\s*\+\s*r|ctrl\s*\+\s*v).{0,80}(?:powershell|mshta|cmd|curl)/is.test(bodyText);
    if ((hasClipboardCopy && CLICKFIX_CMD_RE.test(bodyText)) || hasRunDialogBait) {
      threats.push('Possible ClickFix / clipboard hijacking (copy handler combined with terminal/PowerShell command)');
    }

    for (const el of Array.from(doc.querySelectorAll('[style]') || []).slice(0, 120)) {
      const st = el.style || {};
      const isHidden = st.opacity === '0' || st.display === 'none' || st.visibility === 'hidden' || st.fontSize === '0px' || st.fontSize === '1px' || st.color === 'transparent';
      if (isHidden && PROMPT_INJECTION_RE.test(String(el.textContent || ''))) {
        threats.push('Hidden prompt-injection text detected inside invisible DOM element');
        break;
      }
    }

    return threats;
  }
}

export default WebThreatDetector;
